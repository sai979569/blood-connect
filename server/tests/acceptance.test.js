import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import BloodRequest from '../src/models/BloodRequest.js';
import RequestMatch from '../src/models/RequestMatch.js';
import Notification from '../src/models/Notification.js';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../src/config/constants.js';

let requesterToken;
let requesterId;
let donor1Token;
let donor1Id;
let donor2Id;
let donor3Id;

test.before(async () => {
  await connectDB();

  // Login as requester (Rahul Sharma)
  const reqLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'requester@bloodconnect.org',
    password: 'password123',
  });
  requesterToken = reqLogin.body.token;
  requesterId = reqLogin.body.user._id;

  // Login as donor 1 (Aarav Patel)
  const donor1Login = await request(app).post('/api/v1/auth/login').send({
    email: 'donor.aarav@bloodconnect.org',
    password: 'password123',
  });
  donor1Token = donor1Login.body.token;
  donor1Id = donor1Login.body.user._id;

  const donor2 = await User.findOne({ email: 'donor.priya@bloodconnect.org' });
  donor2Id = donor2._id.toString();

  const donor3 = await User.findOne({ email: 'donor.vikram@bloodconnect.org' });
  donor3Id = donor3._id.toString();
});

test.after(async () => {
  await mongoose.disconnect();
});

// ==========================================
// ISSUE 1 ACCEPTANCE TESTS
// ==========================================
test('ISSUE 1: Geocoded coordinates are validated, saved in MongoDB, and used for matching', async () => {
  // AIIMS Trauma Center coordinates [lng, lat]
  const aiimsCoords = [77.2090, 28.5672];
  const payload = {
    bloodGroup: 'A+',
    bloodComponent: 'Whole Blood',
    units: 2,
    hospitalName: 'AIIMS Main Trauma Center',
    hospitalAddress: 'Ring Road, Safdarjung Enclave, New Delhi',
    location: {
      type: 'Point',
      coordinates: aiimsCoords,
    },
    urgency: 'critical',
  };

  const createRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send(payload);

  assert.equal(createRes.status, 201);
  const createdReq = createRes.body.request;
  assert.equal(createdReq.location.coordinates[0], aiimsCoords[0]);
  assert.equal(createdReq.location.coordinates[1], aiimsCoords[1]);

  // Verify in MongoDB
  const dbReq = await BloodRequest.findById(createdReq._id);
  assert.ok(dbReq);
  assert.equal(dbReq.location.coordinates[0], aiimsCoords[0]);
  assert.equal(dbReq.location.coordinates[1], aiimsCoords[1]);

  // Reject invalid coordinates on backend
  const invalidRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      ...payload,
      location: { type: 'Point', coordinates: [999, 999] },
    });
  assert.equal(invalidRes.status, 400);
});

// ==========================================
// ISSUE 2 ACCEPTANCE TESTS
// ==========================================
test('ISSUE 2: Notifications are created, deduplicated, and displayed in donor notification center', async () => {
  // Create a new request at AIIMS
  const uniqueKey = `test-notify-${Date.now()}`;
  const createRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      bloodGroup: 'A+',
      bloodComponent: 'Whole Blood',
      units: 1,
      hospitalName: 'Safdarjung Hospital',
      hospitalAddress: 'Safdarjung, New Delhi',
      location: { coordinates: [77.2090, 28.5672] },
      urgency: 'high',
      idempotencyKey: uniqueKey,
    });

  assert.equal(createRes.status, 201);
  const requestId = createRes.body.request._id;

  // Verify that a notification record was created for matched donor (Aarav Patel or Priya Iyer)
  const notifications = await Notification.find({
    relatedRequestId: requestId,
    type: NOTIFICATION_TYPES.NEW_REQUEST,
  });

  assert.ok(notifications.length > 0, 'Notification records must be created for matched donors');

  // Verify notification status is queued/sent
  for (const n of notifications) {
    assert.ok(
      [NOTIFICATION_STATUS.QUEUED, NOTIFICATION_STATUS.SENT, NOTIFICATION_STATUS.DELIVERED].includes(n.status),
      `Notification status should be tracked accurately, got: ${n.status}`
    );
  }

  // Verify deduplication: re-evaluating should NOT create duplicate notifications
  const expandRes = await request(app)
    .post(`/api/v1/requests/${requestId}/evaluate-radius`)
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({ forceExpand: false });

  assert.equal(expandRes.status, 200);

  const notificationsAfter = await Notification.find({
    relatedRequestId: requestId,
    type: NOTIFICATION_TYPES.NEW_REQUEST,
  });
  assert.equal(notificationsAfter.length, notifications.length, 'No duplicate notifications should be created');

  // Fetch notifications for donor 1 via API
  const donorNotifRes = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${donor1Token}`);

  assert.equal(donorNotifRes.status, 200);
  assert.ok(Array.isArray(donorNotifRes.body.notifications));
  const hasAlert = donorNotifRes.body.notifications.some(
    (n) => n.relatedRequestId === requestId || n.type === 'new_request'
  );
  assert.ok(hasAlert, 'Donor must see the notification in their dashboard');
});

// ==========================================
// ISSUE 3 ACCEPTANCE TESTS
// ==========================================
test('ISSUE 3: Eligible donors inside search radius appear with authorized details and privacy protection', async () => {
  // Create a request at AIIMS for A+
  const createRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      bloodGroup: 'A+',
      bloodComponent: 'Whole Blood',
      units: 2,
      hospitalName: 'AIIMS Heart Center',
      hospitalAddress: 'AIIMS Campus, New Delhi',
      location: { coordinates: [77.2090, 28.5672] },
      urgency: 'high',
    });

  const requestId = createRes.body.request._id;

  // Fetch matches as requester
  const matchesRes = await request(app)
    .get(`/api/v1/requests/${requestId}/matches`)
    .set('Authorization', `Bearer ${requesterToken}`);

  assert.equal(matchesRes.status, 200);
  assert.ok(matchesRes.body.success);
  const matches = matchesRes.body.matches;

  // 1. Compatible donors within 1 km (Aarav Patel A+, Priya Iyer O-) should appear
  assert.ok(matches.length >= 2, `Expected at least 2 donors in 1km radius, got ${matches.length}`);

  const donorNames = matches.map((m) => m.donor?.username);
  assert.ok(
    donorNames.some((name) => name && name.includes('Aarav Patel')),
    'Aarav Patel (A+, 0.6km) must appear'
  );
  assert.ok(
    donorNames.some((name) => name && name.includes('Priya Iyer')),
    'Priya Iyer (O-, 0.5km) must appear'
  );

  // 2. Incompatible donors (Karan Mehra B+) must NOT appear
  assert.ok(
    !donorNames.some((name) => name && name.includes('Karan Mehra')),
    'Incompatible donor Karan Mehra (B+) must NOT appear'
  );

  // 3. Unavailable donors (Ananya Roy) must NOT appear
  assert.ok(
    !donorNames.some((name) => name && name.includes('Ananya Roy')),
    'Unavailable donor Ananya Roy must NOT appear'
  );

  // 4. Out of range donors (Vikram Singh 2.2km, Rohan Gupta 18km) must NOT appear in initial 1 km
  assert.ok(
    !donorNames.some((name) => name && name.includes('Vikram Singh')),
    'Donor Vikram Singh (2.2km) must NOT appear in 1km radius'
  );
  assert.ok(
    !donorNames.some((name) => name && name.includes('Rohan Gupta')),
    'Out of range donor Rohan Gupta (18km) must NOT appear'
  );

  // 5. Authorized information: donor username, bloodGroup, distanceKm, isAvailable, location
  for (const match of matches) {
    assert.ok(match.donor?.username, 'Donor username must be provided');
    assert.ok(match.donor?.bloodGroup, 'Donor bloodGroup must be provided');
    assert.ok(match.distanceKm <= 1.0, `Distance must be <= 1.0 km, got: ${match.distanceKm}`);
    assert.equal(typeof match.donor?.isAvailable, 'boolean');
    assert.ok(match.donor?.location?.coordinates, 'Location coordinates must be provided for map pins');

    // 6. Contact privacy: phone & email must be NULL if donor has not consented
    if (!match.contactConsentGiven || match.status !== 'accepted') {
      assert.equal(
        match.donor?.contact,
        null,
        'Personal mobile and email must remain strictly protected until accepted with consent'
      );
    }
  }

  // 7. Expand radius through calibrated step (1 km -> 2 km -> 4 km)
  const expand1 = await request(app)
    .post(`/api/v1/requests/${requestId}/evaluate-radius`)
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({ forceExpand: true });
  assert.equal(expand1.status, 200);

  // Expand to next calibrated step (4 km) to discover Vikram Singh (2.2 km away)
  const expand2 = await request(app)
    .post(`/api/v1/requests/${requestId}/evaluate-radius`)
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({ forceExpand: true });
  assert.equal(expand2.status, 200);
  assert.equal(expand2.body.request.currentRadiusKm, 4);

  const matchesAfterExpansion = await request(app)
    .get(`/api/v1/requests/${requestId}/matches`)
    .set('Authorization', `Bearer ${requesterToken}`);

  const expandedNames = matchesAfterExpansion.body.matches.map((m) => m.donor?.username);
  assert.ok(
    expandedNames.some((name) => name && name.includes('Vikram Singh')),
    'Vikram Singh (2.2km) must appear after radius expansion'
  );

  // 8. Matched donor access: Donor 1 should be authorized to view their match without 403
  const donorMatchRes = await request(app)
    .get(`/api/v1/requests/${requestId}/matches`)
    .set('Authorization', `Bearer ${donor1Token}`);

  assert.equal(donorMatchRes.status, 200, 'Matched donor must be authorized to inspect their request match');
  assert.equal(donorMatchRes.body.count, 1, 'Matched donor sees only their own match');
});
