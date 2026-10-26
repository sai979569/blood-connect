import mongoose from 'mongoose';
import {
  BLOOD_GROUPS,
  BLOOD_COMPONENTS,
  URGENCY_LEVELS,
  REQUEST_STATUS,
  RADIUS_DEFAULTS,
} from '../config/constants.js';

const expansionStepSchema = new mongoose.Schema(
  {
    radiusKm: { type: Number, required: true },
    expandedAt: { type: Date, default: Date.now },
    donorsFound: { type: Number, default: 0 },
    responsesCount: { type: Number, default: 0 },
    reason: { type: String, default: 'Scheduled interval expansion' },
  },
  { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: BLOOD_GROUPS,
    },
    bloodComponent: {
      type: String,
      required: [true, 'Blood component is required'],
      enum: BLOOD_COMPONENTS,
      default: 'Whole Blood',
    },
    units: {
      type: Number,
      required: [true, 'Number of units is required'],
      min: [1, 'At least 1 unit is required'],
      max: [50, 'Maximum 50 units allowed per request'],
      default: 1,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    hospitalAddress: {
      type: String,
      required: [true, 'Hospital address is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // GeoJSON format: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: [true, 'Request location coordinates [longitude, latitude] are required'],
        validate: {
          validator: (coords) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90,
          message: 'Invalid coordinates: must be [longitude (-180 to 180), latitude (-90 to 90)]',
        },
      },
    },
    urgency: {
      type: String,
      enum: URGENCY_LEVELS,
      default: 'high',
    },
    additionalInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    contactPreferences: {
      allowPhoneCall: { type: Boolean, default: true },
      allowWhatsApp: { type: Boolean, default: true },
      inAppOnly: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.ACTIVE,
      index: true,
    },
    currentRadiusKm: {
      type: Number,
      default: RADIUS_DEFAULTS.INITIAL_KM,
      min: 0.5,
    },
    maxRadiusKm: {
      type: Number,
      default: RADIUS_DEFAULTS.MAX_KM,
      max: 50,
    },
    evaluationIntervalMinutes: {
      type: Number,
      default: RADIUS_DEFAULTS.DEFAULT_EVAL_MINUTES,
    },
    donorTarget: {
      type: Number,
      default: RADIUS_DEFAULTS.DEFAULT_TARGET_DONORS,
      min: 1,
    },
    expansionHistory: [expansionStepSchema],
    matchedDonorsCount: {
      type: Number,
      default: 0,
    },
    positiveResponsesCount: {
      type: Number,
      default: 0,
    },
    declinedResponsesCount: {
      type: Number,
      default: 0,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    isExpanding: {
      type: Boolean,
      default: false,
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
    nextEvaluationAt: {
      type: Date,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    fulfilledAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ status: 1, nextEvaluationAt: 1 });
bloodRequestSchema.index({ status: 1, bloodGroup: 1, createdAt: -1 });

// Helper to determine if max radius reached without sufficient response
bloodRequestSchema.methods.isMaxRadiusReached = function () {
  return this.currentRadiusKm >= this.maxRadiusKm;
};

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
export default BloodRequest;
