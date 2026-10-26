import BloodRequest from '../models/BloodRequest.js';
import RequestMatch from '../models/RequestMatch.js';
import { evaluateRequestRadius } from '../services/adaptiveRadiusService.js';
import { formatMatchForRequester } from '../services/matchingService.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { REQUEST_STATUS, NOTIFICATION_TYPES, RADIUS_DEFAULTS } from '../config/constants.js';
import { getIO } from '../socket/socketHandler.js';

export const createRequest = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      bloodComponent,
      units,
      hospitalName,
      hospitalAddress,
      location,
      urgency,
      additionalInstructions,
      contactPreferences,
      idempotencyKey,
      donorTarget,
    } = req.body;

    // Idempotency check to support offline sync retry safety
    if (idempotencyKey) {
      const existing = await BloodRequest.findOne({
        requester: req.user._id,
        idempotencyKey,
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          message: 'Request already processed previously (Idempotent replay)',
          request: existing,
        });
      }
    }

    const evalIntervalSeconds = Number(process.env.RADIUS_EVAL_INTERVAL_SECONDS) || 300;

    const newRequest = await BloodRequest.create({
      requester: req.user._id,
      bloodGroup,
      bloodComponent: bloodComponent || 'Whole Blood',
      units: Number(units) || 1,
      hospitalName,
      hospitalAddress,
      location: {
        type: 'Point',
        coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])],
      },
      urgency: urgency || 'high',
      additionalInstructions: additionalInstructions || '',
      contactPreferences: contactPreferences || {
        allowPhoneCall: true,
        allowWhatsApp: true,
        inAppOnly: false,
      },
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
      status: REQUEST_STATUS.ACTIVE,
      currentRadiusKm: RADIUS_DEFAULTS.INITIAL_KM,
      maxRadiusKm: RADIUS_DEFAULTS.MAX_KM,
      donorTarget: Number(donorTarget) || RADIUS_DEFAULTS.DEFAULT_TARGET_DONORS,
      evaluationIntervalMinutes: evalIntervalSeconds / 60,
      lastEvaluatedAt: new Date(),
      nextEvaluationAt: new Date(Date.now() + evalIntervalSeconds * 1000),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48-hour default expiry
    });

    // Run initial 1 km matching pass immediately
    try {
      await evaluateRequestRadius(newRequest._id, { isManual: true, isInitial: true });
    } catch (evalErr) {
      console.warn(`[RequestController] Initial matching pass warning: ${evalErr.message}`);
    }

    const updatedRequest = await BloodRequest.findById(newRequest._id);

    return res.status(201).json({
      success: true,
      message: 'Blood request created successfully! Adaptive search radius initialized at 1 km.',
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await BloodRequest.find({ requester: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

export const getRequestById = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', 'username bloodGroup')
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const getRequestStatus = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .select('status currentRadiusKm maxRadiusKm matchedDonorsCount positiveResponsesCount declinedResponsesCount nextEvaluationAt expansionHistory')
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    return res.status(200).json({
      success: true,
      status: request,
    });
  } catch (error) {
    next(error);
  }
};

export const getRequestMatches = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    const isRequester = request.requester.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Check if the current user is a matched donor for this request
    const userMatch = await RequestMatch.findOne({
      requestId: request._id,
      donorId: req.user._id,
    });

    if (!isRequester && !isAdmin && !userMatch) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: only the requester, matched donors, or admin can inspect donor match details.',
      });
    }

    // Requester and admin see all matches; matched donors see their own match
    const filter = { requestId: request._id };
    if (!isRequester && !isAdmin && userMatch) {
      filter.donorId = req.user._id;
    }

    const matches = await RequestMatch.find(filter)
      .populate('donorId', 'username email mobile bloodGroup isDonorAvailable location')
      .sort({ distanceKm: 1 });

    const formattedMatches = matches.map((m) => formatMatchForRequester(m));

    return res.status(200).json({
      success: true,
      count: formattedMatches.length,
      matches: formattedMatches,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
    }

    if (request.status !== REQUEST_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request because it is already ${request.status}`,
      });
    }

    request.status = REQUEST_STATUS.CANCELLED;
    request.cancelledAt = new Date();
    request.cancellationReason = reason || 'Cancelled by requester';
    await request.save();

    // Broadcast cancel event to request room
    const io = getIO();
    if (io) {
      io.to(`request:${request._id.toString()}`).emit('request:cancelled', {
        requestId: request._id,
        reason: request.cancellationReason,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request cancelled successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const fulfillRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to fulfill this request' });
    }

    if (request.status !== REQUEST_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as fulfilled because it is already ${request.status}`,
      });
    }

    request.status = REQUEST_STATUS.FULFILLED;
    request.fulfilledAt = new Date();
    await request.save();

    // Broadcast fulfill event
    const io = getIO();
    if (io) {
      io.to(`request:${request._id.toString()}`).emit('request:fulfilled', {
        requestId: request._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request marked as successfully fulfilled! Thank you!',
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlled development/test endpoint to trigger radius evaluation immediately
 */
export const manualEvaluateRadius = async (req, res, next) => {
  try {
    const { forceExpand = false } = req.body;
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only allow requester or admin
    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await evaluateRequestRadius(request._id, {
      isManual: true,
      forceExpand: Boolean(forceExpand),
    });

    const updated = await BloodRequest.findById(request._id);

    return res.status(200).json({
      success: true,
      message: 'Radius evaluation executed successfully',
      result,
      request: updated,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestStatus,
  getRequestMatches,
  cancelRequest,
  fulfillRequest,
  manualEvaluateRadius,
};
