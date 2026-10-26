import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import RequestMatch from '../models/RequestMatch.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { REQUEST_STATUS, MATCH_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood_connect';

// Base coordinates: AIIMS Hospital (New Delhi) [longitude, latitude]
const AIIMS_COORDS = [77.2090, 28.5672];

async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[Seed] Connected.');

  console.log('[Seed] Clearing existing demonstration collections...');
  await User.deleteMany({});
  await BloodRequest.deleteMany({});
  await RequestMatch.deleteMany({});
  await Notification.deleteMany({});
  await AuditLog.deleteMany({});

  const defaultPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  console.log('[Seed] Creating synthetic users & donors with calibrated coordinates...');

  // 1. Admin
  const admin = await User.create({
    username: 'System Admin',
    email: 'admin@bloodconnect.org',
    mobile: '+919876500000',
    passwordHash,
    bloodGroup: 'O+',
    isDonorAvailable: false,
    role: 'admin',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    location: {
      type: 'Point',
      coordinates: AIIMS_COORDS,
    },
    address: 'AIIMS Medical Complex, New Delhi',
  });

  // 2. Primary Requester (Rahul Sharma)
  const requester = await User.create({
    username: 'Rahul Sharma',
    email: 'requester@bloodconnect.org',
    mobile: '+919876543210',
    passwordHash,
    bloodGroup: 'A+',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    location: {
      type: 'Point',
      coordinates: AIIMS_COORDS,
    },
    address: 'Safdarjung Enclave, New Delhi',
  });

  // 3. Donor 1: In range (< 1 km), A+, Available
  const donor1 = await User.create({
    username: 'Aarav Patel (0.6 km)',
    email: 'donor.aarav@bloodconnect.org',
    mobile: '+919876543211',
    passwordHash,
    bloodGroup: 'A+',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    contactSharingPreference: 'on_accept',
    location: {
      type: 'Point',
      coordinates: [77.2140, 28.5695], // ~0.6 km away
    },
    address: 'Green Park Extension, New Delhi',
  });

  // 4. Donor 2: In range (< 1 km), O- (Universal Donor), Available
  const donor2 = await User.create({
    username: 'Priya Iyer (0.5 km)',
    email: 'donor.priya@bloodconnect.org',
    mobile: '+919876543212',
    passwordHash,
    bloodGroup: 'O-',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    contactSharingPreference: 'on_accept',
    location: {
      type: 'Point',
      coordinates: [77.2050, 28.5650], // ~0.5 km away
    },
    address: 'Hauz Khas Enclave, New Delhi',
  });

  // 5. Donor 3: Outside 1 km, Inside 2.5 km (matched on 1st expansion), A+, Available
  const donor3 = await User.create({
    username: 'Vikram Singh (2.2 km)',
    email: 'donor.vikram@bloodconnect.org',
    mobile: '+919876543213',
    passwordHash,
    bloodGroup: 'A+',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    contactSharingPreference: 'on_accept',
    location: {
      type: 'Point',
      coordinates: [77.2280, 28.5780], // ~2.2 km away
    },
    address: 'South Extension Part II, New Delhi',
  });

  // 6. Donor 4: Outside 3 km, Inside 5 km (matched on 2nd expansion), A-, Available
  const donor4 = await User.create({
    username: 'Neha Verma (4.2 km)',
    email: 'donor.neha@bloodconnect.org',
    mobile: '+919876543214',
    passwordHash,
    bloodGroup: 'A-',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    contactSharingPreference: 'on_accept',
    location: {
      type: 'Point',
      coordinates: [77.2450, 28.5920], // ~4.2 km away
    },
    address: 'Lajpat Nagar IV, New Delhi',
  });

  // 7. Donor 5: In range (< 1 km), B+ (Incompatible for A+ request)
  const donor5 = await User.create({
    username: 'Karan Mehra (0.8 km - B+)',
    email: 'donor.karan@bloodconnect.org',
    mobile: '+919876543215',
    passwordHash,
    bloodGroup: 'B+',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    location: {
      type: 'Point',
      coordinates: [77.2120, 28.5610], // ~0.8 km away
    },
    address: 'Yusuf Sarai, New Delhi',
  });

  // 8. Donor 6: In range (< 1 km), A+, UNAVAILABLE (Busy)
  const donor6 = await User.create({
    username: 'Ananya Roy (0.7 km - Unavailable)',
    email: 'donor.ananya@bloodconnect.org',
    mobile: '+919876543216',
    passwordHash,
    bloodGroup: 'A+',
    isDonorAvailable: false, // Inactive / unavailable
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    location: {
      type: 'Point',
      coordinates: [77.2100, 28.5620], // ~0.6 km away
    },
    address: 'Safdarjung Hospital Staff Quarters, New Delhi',
  });

  // 9. Donor 7: Far Out of Range (> 15 km), A+, Available
  const donor7 = await User.create({
    username: 'Rohan Gupta (18 km - Out of Range)',
    email: 'donor.rohan@bloodconnect.org',
    mobile: '+919876543217',
    passwordHash,
    bloodGroup: 'A+',
    isDonorAvailable: true,
    role: 'user',
    verificationStatus: 'verified',
    accountStatus: 'active',
    privacyConsent: true,
    location: {
      type: 'Point',
      coordinates: [77.0500, 28.4500], // ~18 km away in Gurgaon
    },
    address: 'Cyber City, Gurugram',
  });

  console.log('[Seed] Creating sample active and past blood requests...');

  // Sample Request 1: Active Emergency Request (Requester: Rahul Sharma)
  const activeRequest = await BloodRequest.create({
    requester: requester._id,
    bloodGroup: 'A+',
    bloodComponent: 'Whole Blood',
    units: 2,
    hospitalName: 'AIIMS Main Trauma Center',
    hospitalAddress: 'Ring Road, Safdarjung Enclave, New Delhi - 110029',
    location: {
      type: 'Point',
      coordinates: AIIMS_COORDS,
    },
    urgency: 'critical',
    additionalInstructions: 'Emergency surgery scheduled in 2 hours. Attendant contact at Desk 4.',
    contactPreferences: { allowPhoneCall: true, allowWhatsApp: true, inAppOnly: false },
    status: REQUEST_STATUS.ACTIVE,
    currentRadiusKm: 1,
    maxRadiusKm: 10,
    donorTarget: 3,
    evaluationIntervalMinutes: 5,
    lastEvaluatedAt: new Date(),
    nextEvaluationAt: new Date(Date.now() + 5 * 60 * 1000),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    expansionHistory: [
      {
        radiusKm: 1,
        expandedAt: new Date(),
        donorsFound: 2,
        responsesCount: 0,
        reason: 'Initial 1 km search scan upon request creation',
      },
    ],
    matchedDonorsCount: 2,
  });

  // Create match records for the initial 1 km donors
  const match1 = await RequestMatch.create({
    requestId: activeRequest._id,
    donorId: donor1._id,
    distanceKm: 0.6,
    status: MATCH_STATUS.ACCEPTED,
    contactConsentGiven: true,
    contactConsentGrantedAt: new Date(),
    notifiedAt: new Date(Date.now() - 15 * 60 * 1000),
    respondedAt: new Date(Date.now() - 10 * 60 * 1000),
    responseNote: 'I am on my way to AIIMS right now!',
  });

  const match2 = await RequestMatch.create({
    requestId: activeRequest._id,
    donorId: donor2._id,
    distanceKm: 0.5,
    status: MATCH_STATUS.NOTIFIED,
    contactConsentGiven: false,
    notifiedAt: new Date(Date.now() - 15 * 60 * 1000),
  });

  activeRequest.positiveResponsesCount = 1;
  await activeRequest.save();

  // Create in-app notifications
  await Notification.create({
    userId: requester._id,
    title: 'Donor Accepted Your Request',
    message: 'Aarav Patel (0.6 km away) accepted your request and shared contact details.',
    type: NOTIFICATION_TYPES.DONOR_RESPONSE,
    relatedRequestId: activeRequest._id,
    status: 'sent',
    isRead: false,
  });

  await Notification.create({
    userId: donor1._id,
    title: 'Urgent Blood Need: A+ (CRITICAL)',
    message: 'Blood request for A+ at AIIMS Main Trauma Center (0.6 km from you).',
    type: NOTIFICATION_TYPES.NEW_REQUEST,
    relatedRequestId: activeRequest._id,
    status: 'sent',
    isRead: true,
  });

  console.log('\n======================================================');
  console.log(' SEED DATA GENERATED SUCCESSFULLY');
  console.log('======================================================');
  console.log('Standard Login Credentials for all accounts:');
  console.log('Password: password123\n');
  console.log('1. Admin Account:');
  console.log('   Email: admin@bloodconnect.org');
  console.log('2. Requester Account (Rahul Sharma):');
  console.log('   Email: requester@bloodconnect.org');
  console.log('3. Donor 1 (A+, 0.6 km away, Accepted & Shared Contact):');
  console.log('   Email: donor.aarav@bloodconnect.org');
  console.log('4. Donor 2 (O-, 0.5 km away, Notified):');
  console.log('   Email: donor.priya@bloodconnect.org');
  console.log('5. Donor 3 (A+, 2.2 km away, Waiting for radius expansion):');
  console.log('   Email: donor.vikram@bloodconnect.org');
  console.log('6. Donor 4 (A-, 4.2 km away, Matched at 5km):');
  console.log('   Email: donor.neha@bloodconnect.org');
  console.log('7. Donor 7 (A+, 18 km away, Out of max 10km radius):');
  console.log('   Email: donor.rohan@bloodconnect.org');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error seeding data:', err);
  process.exit(1);
});
