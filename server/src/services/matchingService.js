import mongoose from 'mongoose';
import User from '../models/User.js';
import RequestMatch from '../models/RequestMatch.js';
import { getCompatibleDonorGroups } from '../utils/bloodCompatibility.js';
import { calculateDistanceKm, kmToRadians } from '../utils/distance.js';

/**
 * Finds all compatible and available blood donors within the specified radius (in km).
 */
export const findEligibleDonors = async (bloodRequest, radiusKm, options = {}) => {
  const { excludeExisting = true } = options;

  const compatibleGroups = getCompatibleDonorGroups(
    bloodRequest.bloodGroup,
    bloodRequest.bloodComponent
  );

  let excludedDonorIds = [bloodRequest.requester];

  if (excludeExisting) {
    const existingMatches = await RequestMatch.find({ requestId: bloodRequest._id }).select('donorId');
    const existingDonorIds = existingMatches.map((m) => m.donorId);
    excludedDonorIds = [...excludedDonorIds, ...existingDonorIds];
  }

  // Ensure ObjectIds for MongoDB $nin query
  const excludedObjectIds = excludedDonorIds.map((id) =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
  );

  // Geospatial query using $centerSphere with radians
  const query = {
    accountStatus: 'active',
    isDonorAvailable: true,
    bloodGroup: { $in: compatibleGroups },
    _id: { $nin: excludedObjectIds },
    location: {
      $geoWithin: {
        $centerSphere: [bloodRequest.location.coordinates, kmToRadians(radiusKm)],
      },
    },
  };

  const potentialDonors = await User.find(query).select(
    'username email mobile bloodGroup location address isDonorAvailable contactSharingPreference'
  );

  // Calculate exact distances and filter accurately
  const matchedDonors = potentialDonors
    .map((donor) => {
      const distance = calculateDistanceKm(
        bloodRequest.location.coordinates,
        donor.location.coordinates
      );
      return {
        donor,
        distanceKm: distance,
      };
    })
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return matchedDonors;
};

/**
 * Formats donor summary for requester, respecting privacy consent.
 * Shows donor display name / username, blood group, availability, and approximate distance.
 * Contact details (phone, email) are ONLY disclosed if:
 * 1. The match status is 'accepted', AND
 * 2. The donor gave explicit contact consent (contactConsentGiven === true)
 */
export const formatMatchForRequester = (matchDoc) => {
  const donor = matchDoc.donorId;
  const isAccepted = matchDoc.status === 'accepted';
  const hasConsented = matchDoc.contactConsentGiven === true;
  const canDiscloseContact = isAccepted && hasConsented;

  return {
    matchId: matchDoc._id,
    requestId: matchDoc.requestId,
    distanceKm: matchDoc.distanceKm,
    status: matchDoc.status,
    contactConsentGiven: matchDoc.contactConsentGiven,
    notifiedAt: matchDoc.notifiedAt,
    respondedAt: matchDoc.respondedAt,
    donor: {
      _id: donor?._id || matchDoc.donorId,
      username: donor?.username || 'Registered Donor',
      bloodGroup: donor?.bloodGroup || 'Unknown',
      isAvailable: donor?.isDonorAvailable ?? true,
      location: donor?.location || null,
      // Privacy-controlled disclosure
      contact: canDiscloseContact
        ? {
            username: donor?.username,
            mobile: donor?.mobile,
            email: donor?.email,
          }
        : null,
    },
  };
};

export default { findEligibleDonors, formatMatchForRequester };
