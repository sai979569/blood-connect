import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_blood_connect_2026_key_918237';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

export const register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      mobile,
      password,
      bloodGroup,
      location,
      address,
      privacyConsent,
      contactSharingPreference,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Mobile number';
      return res.status(409).json({
        success: false,
        message: `${field} is already registered with another account.`,
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email: email.toLowerCase(),
      mobile,
      passwordHash,
      bloodGroup,
      location: {
        type: 'Point',
        coordinates: location.coordinates, // [lng, lat]
      },
      address: address || '',
      privacyConsent,
      contactSharingPreference: contactSharingPreference || 'on_accept',
      isDonorAvailable: true,
      accountStatus: 'active',
      verificationStatus: 'verified',
    });

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Blood Connect.',
      token,
      user: newUser.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.accountStatus}. Please contact support.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeJSON(),
  });
};

export default { register, login, logout, getMe };
