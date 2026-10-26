import RequestMatch from '../models/RequestMatch.js';
import BloodRequest from '../models/BloodRequest.js';
import { MATCH_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { getIO } from '../socket/socketHandler.js';

export const getMyMatches = async (req, res, next) => {
  try {
    const matches = await RequestMatch.find({ donorId: req.user._id })
      .populate({
        path: 'requestId',
        select:
          'bloodGroup bloodComponent units hospitalName hospitalAddress urgency status createdAt currentRadiusKm',
        populate: { path: 'requester', select: 'username' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

export const respondToMatch = async (req, res, next) => {
  try {
    const { status, responseNote, contactConsentGiven } = req.body;
    const matchId = req.params.id;

    if (!Object.values(MATCH_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.values(MATCH_STATUS).join(', ')}`,
      });
    }

    const match = await RequestMatch.findOne({
      _id: matchId,
      donorId: req.user._id,
    }).populate('requestId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match record not found or does not belong to you',
      });
    }

    const previousStatus = match.status;
    match.status = status;
    match.respondedAt = new Date();
    if (responseNote !== undefined) match.responseNote = responseNote.trim();
    if (contactConsentGiven !== undefined) {
      match.contactConsentGiven = Boolean(contactConsentGiven);
      if (contactConsentGiven) match.contactConsentGrantedAt = new Date();
    }

    await match.save();

    // Update aggregate counters on request
    const bloodRequest = await BloodRequest.findById(match.requestId._id);
    if (bloodRequest) {
      const positiveCount = await RequestMatch.countDocuments({
        requestId: bloodRequest._id,
        status: { $in: [MATCH_STATUS.ACCEPTED, MATCH_STATUS.INTERESTED] },
      });
      const declinedCount = await RequestMatch.countDocuments({
        requestId: bloodRequest._id,
        status: MATCH_STATUS.DECLINED,
      });

      bloodRequest.positiveResponsesCount = positiveCount;
      bloodRequest.declinedResponsesCount = declinedCount;
      await bloodRequest.save();

      // Notify the requester
      await createAndSendNotification({
        userId: bloodRequest.requester,
        title: `Donor Response: ${status.toUpperCase()}`,
        message: `A registered donor (${match.distanceKm} km away) has responded with status: ${status.toUpperCase()} for your ${bloodRequest.bloodGroup} request.`,
        type: NOTIFICATION_TYPES.DONOR_RESPONSE,
        relatedRequestId: bloodRequest._id,
        metadata: {
          requestId: bloodRequest._id,
          matchId: match._id,
          status,
          distanceKm: match.distanceKm,
        },
      });

      // Broadcast update to request room
      const io = getIO();
      if (io) {
        io.to(`request:${bloodRequest._id.toString()}`).emit('request:donor_response', {
          requestId: bloodRequest._id,
          matchId: match._id,
          status,
          distanceKm: match.distanceKm,
          positiveResponsesCount: bloodRequest.positiveResponsesCount,
          declinedResponsesCount: bloodRequest.declinedResponsesCount,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Your response (${status}) has been recorded. Thank you for your support!`,
      match,
    });
  } catch (error) {
    next(error);
  }
};

export const giveContactConsent = async (req, res, next) => {
  try {
    const { consent } = req.body;
    const matchId = req.params.id;

    const match = await RequestMatch.findOne({
      _id: matchId,
      donorId: req.user._id,
    }).populate('requestId');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    match.contactConsentGiven = Boolean(consent);
    if (consent) {
      match.contactConsentGrantedAt = new Date();
    }
    await match.save();

    // Notify requester that donor shared contact
    if (consent && match.requestId) {
      await createAndSendNotification({
        userId: match.requestId.requester,
        title: 'Donor Contact Details Shared',
        message: `A donor has consented to share their contact details for your ${match.requestId.bloodGroup} blood request.`,
        type: NOTIFICATION_TYPES.CONTACT_SHARED,
        relatedRequestId: match.requestId._id,
        metadata: {
          requestId: match.requestId._id,
          matchId: match._id,
        },
      });

      const io = getIO();
      if (io) {
        io.to(`request:${match.requestId._id.toString()}`).emit('request:contact_shared', {
          requestId: match.requestId._id,
          matchId: match._id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: consent
        ? 'Contact details shared with the requester.'
        : 'Contact details kept private.',
      contactConsentGiven: match.contactConsentGiven,
    });
  } catch (error) {
    next(error);
  }
};

export default { getMyMatches, respondToMatch, giveContactConsent };
