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

test('CORS allows requests and preflight from deployed Vercel domain', async () => {
  const res = await request(app)
    .get('/api/v1/health')
    .set('Origin', 'https://blood-connect-two-weld.vercel.app');

  assert.equal(res.status, 200);
  assert.equal(res.headers['access-control-allow-origin'], 'https://blood-connect-two-weld.vercel.app');
  assert.equal(res.headers['access-control-allow-credentials'], 'true');

  const preflightRes = await request(app)
    .options('/api/v1/auth/register')
    .set('Origin', 'https://blood-connect-two-weld.vercel.app')
    .set('Access-Control-Request-Method', 'POST');

  assert.equal(preflightRes.status, 204);
  assert.equal(preflightRes.headers['access-control-allow-origin'], 'https://blood-connect-two-weld.vercel.app');
});

test('POST /api/v1/auth/register validates required fields and handles duplicate email', async () => {
  // 1. Validation failure: passwords do not match
  const invalidRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      username: 'Test User',
      email: 'testuser_invalid@example.com',
      mobile: '+919876543210',
      password: 'password123',
      confirmPassword: 'differentpassword',
      bloodGroup: 'B+',
      location: { coordinates: [77.209, 28.5672] },
      privacyConsent: true,
    });
  assert.equal(invalidRes.status, 400);
  assert.equal(invalidRes.body.success, false);
  assert.ok(invalidRes.body.message.includes('Passwords do not match'));

  // 2. Successful registration
  const uniqueSuffix = Date.now();
  const validEmail = `newuser_${uniqueSuffix}@example.com`;
  const validMobile = `+9199${String(uniqueSuffix).slice(-8)}`;

  const regRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      username: 'Valid New User',
      email: validEmail,
      mobile: validMobile,
      password: 'password123',
      confirmPassword: 'password123',
      bloodGroup: 'O+',
      location: { coordinates: [77.209, 28.5672] },
      privacyConsent: true,
    });

  assert.equal(regRes.status, 201);
  assert.equal(regRes.body.success, true);
  assert.ok(regRes.body.token);
  assert.equal(regRes.body.user.email, validEmail);

  // 3. Duplicate registration conflict (409)
  const dupRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      username: 'Another User',
      email: validEmail,
      mobile: `+9191${String(uniqueSuffix + 1).slice(-8)}`,
      password: 'password123',
      confirmPassword: 'password123',
      bloodGroup: 'O+',
      location: { coordinates: [77.209, 28.5672] },
      privacyConsent: true,
    });

  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.success, false);
  assert.ok(dupRes.body.message.includes('already registered'));
});

