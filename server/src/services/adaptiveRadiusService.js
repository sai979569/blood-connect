import BloodRequest from '../models/BloodRequest.js';
import RequestMatch from '../models/RequestMatch.js';
import { findEligibleDonors } from './matchingService.js';
import { createAndSendNotification } from './notificationService.js';
import { NOTIFICATION_TYPES, REQUEST_STATUS, MATCH_STATUS } from '../config/constants.js';
import { getIO } from '../socket/socketHandler.js';

/**
 * Evaluates and adaptively expands the search radius for an individual blood request.
 *
 * @param {string|ObjectId} requestId - ID of the blood request
 * @param {object} options - { isManual: boolean, forceExpand: boolean }
 */
export const evaluateRequestRadius = async (requestId, options = {}) => {
  const { isManual = false, forceExpand = false, isInitial = false } = options;

  // Retrieve request with atomic check on status and concurrency lock
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    return { success: false, message: 'Request not found' };
  }

  if (request.status !== REQUEST_STATUS.ACTIVE) {
    return {
      success: false,
      message: `Request is not active (current status: ${request.status})`,
    };
  }

  if (request.isExpanding) {
    console.log(`[AdaptiveRadius] Request ${requestId} is already undergoing expansion. Skipping.`);
    return { success: false, message: 'Expansion already in progress' };
  }

  // Check if request has expired
  if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
    request.status = REQUEST_STATUS.EXPIRED;
    await request.save();
    await createAndSendNotification({
      userId: request.requester,
      title: 'Blood Request Expired',
      message: `Your request for ${request.bloodGroup} at ${request.hospitalName} has expired.`,
      type: NOTIFICATION_TYPES.REQUEST_EXPIRED,
      relatedRequestId: request._id,
    });
    return { success: false, message: 'Request expired' };
  }

  // Acquire lock
  request.isExpanding = true;
  await request.save();

  try {
    const totalMatches = await RequestMatch.countDocuments({ requestId: request._id });
    const acceptedMatches = await RequestMatch.countDocuments({
      requestId: request._id,
      status: { $in: [MATCH_STATUS.ACCEPTED, MATCH_STATUS.INTERESTED] },
    });

    const targetMet = acceptedMatches >= request.donorTarget;

    // Check if expansion is needed
    if (targetMet && !forceExpand && !isInitial) {
      console.log(`[AdaptiveRadius] Request ${requestId} has sufficient responses (${acceptedMatches}/${request.donorTarget}). No expansion needed.`);
      request.isExpanding = false;
      request.lastEvaluatedAt = new Date();
      // Schedule next check
      const evalMinutes = Number(process.env.RADIUS_EVAL_INTERVAL_SECONDS)
        ? Number(process.env.RADIUS_EVAL_INTERVAL_SECONDS) / 60
        : request.evaluationIntervalMinutes || 5;
      request.nextEvaluationAt = new Date(Date.now() + evalMinutes * 60 * 1000);
      await request.save();

      return {
        success: true,
        expanded: false,
        message: 'Sufficient donor responses achieved; expansion deferred.',
        currentRadiusKm: request.currentRadiusKm,
        totalMatches,
        acceptedMatches,
      };
    }

    // Determine new radius
    let nextRadiusKm = request.currentRadiusKm;
    let didExpand = false;

    // If initial evaluation, do NOT expand radius; search at initial radius
    if (!isInitial) {
      if (forceExpand || totalMatches < request.donorTarget || !isManual) {
        if (request.currentRadiusKm < request.maxRadiusKm) {
          // Increment formula: 1km for small radius, 2km thereafter
          const increment = request.currentRadiusKm < 2 ? 1 : 2;
          nextRadiusKm = Math.min(request.currentRadiusKm + increment, request.maxRadiusKm);
          didExpand = nextRadiusKm > request.currentRadiusKm;
        }
      }
    }

    // Search for eligible donors within nextRadiusKm (excluding already matched ones)
    const newEligibleDonors = await findEligibleDonors(request, nextRadiusKm, {
      excludeExisting: true,
    });

    let newMatchesCreated = 0;

    for (const item of newEligibleDonors) {
      try {
        const match = await RequestMatch.create({
          requestId: request._id,
          donorId: item.donor._id,
          distanceKm: item.distanceKm,
          status: MATCH_STATUS.NOTIFIED,
          notifiedAt: new Date(),
        });

        newMatchesCreated++;

        // Notify newly matched donor
        await createAndSendNotification({
          userId: item.donor._id,
          title: `Urgent Blood Need: ${request.bloodGroup} (${request.urgency.toUpperCase()})`,
          message: `Blood request for ${request.bloodGroup} at ${request.hospitalName} (${item.distanceKm} km from you). Can you donate?`,
          type: NOTIFICATION_TYPES.NEW_REQUEST,
          relatedRequestId: request._id,
          metadata: {
            requestId: request._id,
            matchId: match._id,
            distanceKm: item.distanceKm,
            bloodGroup: request.bloodGroup,
            hospitalName: request.hospitalName,
            urgency: request.urgency,
          },
        });
      } catch (err) {
        // If compound key conflict occurs, ignore duplicate safely
        if (err.code !== 11000) {
          console.error(`[AdaptiveRadius] Error creating match: ${err.message}`);
        }
      }
    }

    // Update request state
    const previousRadius = request.currentRadiusKm;
    request.currentRadiusKm = nextRadiusKm;
    request.matchedDonorsCount = totalMatches + newMatchesCreated;
    request.lastEvaluatedAt = new Date();

    const evalIntervalSeconds = Number(process.env.RADIUS_EVAL_INTERVAL_SECONDS) || 300;
    request.nextEvaluationAt = new Date(Date.now() + evalIntervalSeconds * 1000);

    // Record expansion history step
    if (didExpand || newMatchesCreated > 0 || request.expansionHistory.length === 0) {
      request.expansionHistory.push({
        radiusKm: nextRadiusKm,
        expandedAt: new Date(),
        donorsFound: newMatchesCreated,
        responsesCount: acceptedMatches,
        reason: didExpand
          ? `Expanded radius from ${previousRadius} km to ${nextRadiusKm} km to discover more donors`
          : 'Initial search scan',
      });
    }

    // Check if max radius reached without sufficient response
    const maxRadiusReached = request.currentRadiusKm >= request.maxRadiusKm;
    if (maxRadiusReached && request.matchedDonorsCount < request.donorTarget) {
      console.warn(`[AdaptiveRadius] Request ${request._id} reached MAX radius (${request.maxRadiusKm} km) with insufficient donors.`);
      await createAndSendNotification({
        userId: request.requester,
        title: 'Search Radius Reached Maximum Limit',
        message: `We expanded your search to ${request.maxRadiusKm} km, but responses remain limited. Please consider contacting nearby hospital blood banks or emergency helplines directly.`,
        type: NOTIFICATION_TYPES.RADIUS_EXPANDED,
        relatedRequestId: request._id,
        metadata: { maxRadiusReached: true, currentRadiusKm: request.maxRadiusKm },
      });
    } else if (didExpand) {
      // Notify requester of expansion
      await createAndSendNotification({
        userId: request.requester,
        title: `Search Radius Expanded to ${nextRadiusKm} km`,
        message: `Adaptive search expanded to ${nextRadiusKm} km. Found ${newMatchesCreated} new potential donor(s).`,
        type: NOTIFICATION_TYPES.RADIUS_EXPANDED,
        relatedRequestId: request._id,
        metadata: { previousRadius, newRadius: nextRadiusKm, newMatchesCreated },
      });
    }

    request.isExpanding = false;
    await request.save();

    // Broadcast live update to request room via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`request:${request._id.toString()}`).emit('request:radius_updated', {
        requestId: request._id,
        currentRadiusKm: request.currentRadiusKm,
        matchedDonorsCount: request.matchedDonorsCount,
        maxRadiusReached,
        expansionHistory: request.expansionHistory,
      });
    }

    return {
      success: true,
      expanded: didExpand,
      previousRadius,
      currentRadiusKm: nextRadiusKm,
      newMatchesCreated,
      totalMatches: request.matchedDonorsCount,
      maxRadiusReached,
    };
  } catch (error) {
    console.error(`[AdaptiveRadius] Evaluation error for request ${requestId}:`, error);
    request.isExpanding = false;
    await request.save();
    throw error;
  }
};

/**
 * Evaluates all active requests eligible for adaptive radius expansion.
 */
export const evaluateAllActiveRequests = async () => {
  try {
    const now = new Date();
    const candidateRequests = await BloodRequest.find({
      status: REQUEST_STATUS.ACTIVE,
      isExpanding: false,
      currentRadiusKm: { $lt: 10 },
      $or: [
        { nextEvaluationAt: { $lte: now } },
        { nextEvaluationAt: { $exists: false } },
        { nextEvaluationAt: null },
      ],
    }).limit(20);

    for (const req of candidateRequests) {
      await evaluateRequestRadius(req._id);
    }
  } catch (err) {
    console.error('[AdaptiveRadius] Batch evaluation failed:', err.message);
  }
};

export default { evaluateRequestRadius, evaluateAllActiveRequests };
