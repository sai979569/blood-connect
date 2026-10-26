import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';

test.before(async () => {
  await connectDB();
});

test.after(async () => {
  await mongoose.disconnect();
});

test('GET /api/v1/health returns 200 and database connected', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'connected');
});

test('POST /api/v1/auth/login succeeds with valid seeded credentials', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'requester@bloodconnect.org',
    password: 'password123',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'requester@bloodconnect.org');
});

test('POST /api/v1/auth/login rejects invalid credentials', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'requester@bloodconnect.org',
    password: 'wrongpassword',
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('POST /api/v1/requests creates request and enforces idempotency', async () => {
  // Login first to get token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'requester@bloodconnect.org',
    password: 'password123',
  });
  const token = loginRes.body.token;

  const idempotencyKey = `test-key-${Date.now()}`;
  const payload = {
    bloodGroup: 'A+',
    bloodComponent: 'Whole Blood',
    units: 1,
    hospitalName: 'Safdarjung Emergency Wing',
    hospitalAddress: 'Ring Road, New Delhi',
    location: {
      coordinates: [77.2090, 28.5672],
    },
    urgency: 'high',
    idempotencyKey,
  };

  // First request creation
  const createRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  const requestId = createRes.body.request._id;

  // Immediate retry with the same idempotency key (simulating offline replay)
  const replayRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.body.isDuplicate, true);
  assert.equal(replayRes.body.request._id, requestId);
});

test('POST /api/v1/requests/:id/evaluate-radius triggers adaptive expansion', async () => {
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'requester@bloodconnect.org',
    password: 'password123',
  });
  const token = loginRes.body.token;

  // Create test request
  const createRes = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({
      bloodGroup: 'A+',
      bloodComponent: 'Whole Blood',
      units: 2,
      hospitalName: 'Testing Hospital',
      hospitalAddress: 'Test Address',
      location: { coordinates: [77.2090, 28.5672] },
      urgency: 'high',
    });

  const requestId = createRes.body.request._id;
  assert.equal(createRes.body.request.currentRadiusKm, 1);

  // Trigger manual radius evaluation with forceExpand = true
  const expandRes = await request(app)
    .post(`/api/v1/requests/${requestId}/evaluate-radius`)
    .set('Authorization', `Bearer ${token}`)
    .send({ forceExpand: true });

  assert.equal(expandRes.status, 200);
  assert.equal(expandRes.body.success, true);
  assert.ok(expandRes.body.request.currentRadiusKm >= 2);
});
