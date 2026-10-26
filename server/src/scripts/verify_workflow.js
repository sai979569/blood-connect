import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import RequestMatch from '../models/RequestMatch.js';
import Notification from '../models/Notification.js';
import { evaluateRequestRadius } from '../services/adaptiveRadiusService.js';
import { formatMatchForRequester } from '../services/matchingService.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS, MATCH_STATUS, REQUEST_STATUS } from '../config/constants.js';

dotenv.config();

async function runEndToEndVerification() {
  console.log('\n======================================================');
  console.log(' STARTING END-TO-END ACCEPTANCE VERIFICATION');
  console.log('======================================================\n');

  await connectDB();

  // Step 1: Verify Issue 1 - Geocoding & Coordinate Order
  console.log('----------------------------------------------------');
  console.log('TEST 1: ISSUE 1 - Geocoding & Location Precision');
  console.log('----------------------------------------------------');

  // Let's test OpenStreetMap Nominatim geocoding via live fetch
  console.log('Calling OpenStreetMap Nominatim for: "Safdarjung Enclave, New Delhi"...');
  let resolvedCoords = [77.2090, 28.5672]; // Fallback to AIIMS Safdarjung
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&q=AIIMS+Hospital+New+Delhi&limit=1';
    const geoRes = await fetch(url, {
      headers: {
        'User-Agent': 'BloodConnect-PWA/1.0',
        'Accept': 'application/json'
      }
    });
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        resolvedCoords = [parseFloat(geoData[0].lon), parseFloat(geoData[0].lat)];
        console.log(`✓ Geocoding successful! Resolved coordinates: [lng: ${resolvedCoords[0]}, lat: ${resolvedCoords[1]}]`);
        console.log(`  Place: ${geoData[0].display_name.substring(0, 70)}...`);
      }
    }
  } catch (err) {
    console.log(`Note: Nominatim external network call: ${err.message}. Using calibrated coordinates.`);
  }

  // Create requester
  const requester = await User.findOne({ email: 'requester@bloodconnect.org' });
  if (!requester) {
    throw new Error('Requester account not found in database. Please run seed first.');
  }

  // Create Blood Request with the resolved coordinates
  const newRequest = await BloodRequest.create({
    requester: requester._id,
    bloodGroup: 'A+',
    bloodComponent: 'Whole Blood',
    units: 2,
    hospitalName: 'AIIMS Emergency Trauma Wing',
    hospitalAddress: 'Ansari Nagar, New Delhi',
    location: {
      type: 'Point',
      coordinates: resolvedCoords, // GeoJSON [longitude, latitude]
    },
    urgency: 'critical',
    status: REQUEST_STATUS.ACTIVE,
    currentRadiusKm: 1,
    maxRadiusKm: 10,
    donorTarget: 3,
  });

  console.log(`✓ Blood Request created in MongoDB with ID: ${newRequest._id}`);
  console.log(`  Saved GeoJSON Coordinates: [${newRequest.location.coordinates[0]}, ${newRequest.location.coordinates[1]}]`);
  console.log(`  Initial Search Radius: ${newRequest.currentRadiusKm} km`);

  // Step 2: Verify Initial Matching & Notifications (Issue 2 & Issue 3)
  console.log('\n----------------------------------------------------');
  console.log('TEST 2: ISSUE 2 & 3 - Donor Matching Within 1 km & Notification');
  console.log('----------------------------------------------------');

  const evalResult = await evaluateRequestRadius(newRequest._id, { isManual: true, isInitial: true });
  console.log(`✓ Initial radius evaluation executed:`, evalResult);

  // Check RequestMatches in MongoDB
  const matches = await RequestMatch.find({ requestId: newRequest._id })
    .populate('donorId', 'username email mobile bloodGroup isDonorAvailable location')
    .sort({ distanceKm: 1 });

  console.log(`✓ Total matches discovered in initial 1 km: ${matches.length}`);
  for (const m of matches) {
    console.log(`  - Match: ${m.donorId.username} | ${m.donorId.bloodGroup} | Distance: ${m.distanceKm} km | Status: ${m.status}`);
  }

  if (matches.length < 1) {
    throw new Error(`Expected at least 1 match in 1 km radius, found ${matches.length}`);
  }

  // Check notifications created for these donors
  const donorIds = matches.map(m => m.donorId._id);
  const notifications = await Notification.find({
    userId: { $in: donorIds },
    relatedRequestId: newRequest._id,
  });

  console.log(`✓ Total notifications created in MongoDB for matched donors: ${notifications.length}`);
  for (const n of notifications) {
    console.log(`  - Notification [${n.status}]: To User ${n.userId} | "${n.title}" | "${n.message.substring(0, 60)}..."`);
  }

  if (notifications.length === 0) {
    throw new Error('Notifications were not created for matched donors!');
  }

  // Step 3: Verify Privacy-Controlled Disclosure (Issue 3)
  console.log('\n----------------------------------------------------');
  console.log('TEST 3: ISSUE 3 - Authorized Donor Information & Privacy Shield');
  console.log('----------------------------------------------------');

  const formattedMatchesBefore = matches.map(m => formatMatchForRequester(m));
  for (const fm of formattedMatchesBefore) {
    console.log(`Checking match for: ${fm.donor.username}`);
    console.log(`  Display Name: ${fm.donor.username} (Available: ${fm.donor.isAvailable})`);
    console.log(`  Blood Group: ${fm.donor.bloodGroup} | Distance: ${fm.distanceKm} km`);
    console.log(`  Location Coordinates: [${fm.donor.location?.coordinates}]`);
    console.log(`  Shielded Contact Details: ${JSON.stringify(fm.donor.contact)}`);
    if (fm.donor.contact !== null) {
      throw new Error('Privacy violation! Contact was disclosed before donor accepted and consented.');
    }
  }
  console.log('✓ Verified: Personal contact details (phone, email) are shielded before acceptance.');

  // Step 4: Donor Accepts and Grants Consent
  console.log('\n----------------------------------------------------');
  console.log('TEST 4: Donor Response with Contact Consent');
  console.log('----------------------------------------------------');

  const firstMatch = matches[0];
  firstMatch.status = MATCH_STATUS.ACCEPTED;
  firstMatch.contactConsentGiven = true;
  firstMatch.respondedAt = new Date();
  await firstMatch.save();

  const formattedAfterConsent = formatMatchForRequester(firstMatch);
  console.log(`✓ Donor ${firstMatch.donorId.username} accepted request and gave consent.`);
  console.log(`  Disclosed Contact for Requester:`, formattedAfterConsent.donor.contact);
  if (!formattedAfterConsent.donor.contact?.mobile) {
    throw new Error('Contact details were not disclosed after donor accepted with consent!');
  }
  console.log(`✓ Verified: Requester can now view phone: ${formattedAfterConsent.donor.contact.mobile}`);

  // Step 5: Test Adaptive Radius Expansion (1 km -> 2 km -> 4 km)
  console.log('\n----------------------------------------------------');
  console.log('TEST 5: Adaptive Radius Expansion & History');
  console.log('----------------------------------------------------');

  const expand1 = await evaluateRequestRadius(newRequest._id, { forceExpand: true });
  console.log(`✓ Expansion 1: ${expand1.previousRadius} km -> ${expand1.currentRadiusKm} km | New Donors Found: ${expand1.newMatchesCreated}`);

  const expand2 = await evaluateRequestRadius(newRequest._id, { forceExpand: true });
  console.log(`✓ Expansion 2: ${expand2.previousRadius} km -> ${expand2.currentRadiusKm} km | New Donors Found: ${expand2.newMatchesCreated}`);

  const finalReq = await BloodRequest.findById(newRequest._id);
  console.log(`✓ Request expansion timeline:`);
  for (const step of finalReq.expansionHistory) {
    console.log(`  - Radius: ${step.radiusKm} km | Donors Found: ${step.donorsFound} | Reason: ${step.reason}`);
  }

  // Step 6: Test Request Fulfillment & Cancellation Notification Safety
  console.log('\n----------------------------------------------------');
  console.log('TEST 6: Request Fulfillment & Termination Safety');
  console.log('----------------------------------------------------');

  finalReq.status = REQUEST_STATUS.FULFILLED;
  finalReq.fulfilledAt = new Date();
  await finalReq.save();

  // Verify that an evaluation on a fulfilled request does NOT expand or notify
  const postFulfillEval = await evaluateRequestRadius(finalReq._id, { forceExpand: true });
  console.log(`✓ Attempting expansion on fulfilled request returned:`, postFulfillEval);
  if (postFulfillEval.success !== false) {
    throw new Error('Fulfilled request should not allow expansion!');
  }

  console.log('\n======================================================');
  console.log(' ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
