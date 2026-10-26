import mongoose from 'mongoose';
import { MATCH_STATUS } from '../config/constants.js';

const requestMatchSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(MATCH_STATUS),
      default: MATCH_STATUS.NOTIFIED,
      index: true,
    },
    contactConsentGiven: {
      type: Boolean,
      default: false,
    },
    contactConsentGrantedAt: {
      type: Date,
    },
    notifiedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    responseNote: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Ensure no duplicate match records for the same donor and request
requestMatchSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
requestMatchSchema.index({ donorId: 1, status: 1, createdAt: -1 });

const RequestMatch = mongoose.model('RequestMatch', requestMatchSchema);
export default RequestMatch;
