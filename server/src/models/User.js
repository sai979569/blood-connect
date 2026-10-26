import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BLOOD_GROUPS, USER_ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: {
        values: BLOOD_GROUPS,
        message: 'Invalid blood group',
      },
    },
    isDonorAvailable: {
      type: Boolean,
      default: true,
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
        required: [true, 'Location coordinates [longitude, latitude] are required'],
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
    address: {
      type: String,
      trim: true,
      default: '',
    },
    locationUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified'],
      default: 'verified',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
    },
    privacyConsent: {
      type: Boolean,
      required: [true, 'Consent to location use and privacy terms is required'],
      default: false,
    },
    contactSharingPreference: {
      type: String,
      enum: ['on_accept', 'always', 'prompt'],
      default: 'on_accept',
    },
    lastDonationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial 2dsphere index for location queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ accountStatus: 1, isDonorAvailable: 1, bloodGroup: 1 });

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Strip sensitive fields when serializing
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
