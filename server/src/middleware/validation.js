import { BLOOD_GROUPS, BLOOD_COMPONENTS, URGENCY_LEVELS } from '../config/constants.js';

export const validateRegistration = (req, res, next) => {
  const { username, email, mobile, password, confirmPassword, bloodGroup, location, privacyConsent } = req.body;

  const errors = [];

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Valid email address is required');
  }

  if (!mobile || typeof mobile !== 'string' || mobile.trim().length < 7) {
    errors.push('Valid mobile phone number is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    errors.push(`Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`);
  }

  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);
    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push('Valid location coordinates [longitude (-180..180), latitude (-90..90)] are required');
    } else {
      req.body.location.coordinates = [lng, lat];
    }
  } else {
    errors.push('Valid location coordinates [longitude (-180..180), latitude (-90..90)] are required');
  }

  if (privacyConsent !== true) {
    errors.push('Consent to location use and privacy terms is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors[0] });
  }

  // Normalize inputs
  req.body.email = email.trim().toLowerCase();
  req.body.mobile = mobile.trim();
  req.body.username = username.trim();

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }
  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateBloodRequest = (req, res, next) => {
  const { bloodGroup, bloodComponent, units, hospitalName, hospitalAddress, location, urgency } = req.body;
  const errors = [];

  if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
    errors.push(`Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`);
  }

  if (bloodComponent && !BLOOD_COMPONENTS.includes(bloodComponent)) {
    errors.push(`Blood component must be one of: ${BLOOD_COMPONENTS.join(', ')}`);
  }

  const numUnits = Number(units);
  if (isNaN(numUnits) || numUnits < 1 || numUnits > 50) {
    errors.push('Number of units must be between 1 and 50');
  }

  if (!hospitalName || typeof hospitalName !== 'string' || hospitalName.trim().length === 0) {
    errors.push('Hospital name is required');
  }

  if (!hospitalAddress || typeof hospitalAddress !== 'string' || hospitalAddress.trim().length === 0) {
    errors.push('Hospital address is required');
  }

  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);
    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push('Valid location coordinates [longitude (-180..180), latitude (-90..90)] are required');
    } else {
      req.body.location.coordinates = [lng, lat];
    }
  } else {
    errors.push('Valid location coordinates [longitude (-180..180), latitude (-90..90)] are required');
  }

  if (urgency && !URGENCY_LEVELS.includes(urgency)) {
    errors.push(`Urgency level must be one of: ${URGENCY_LEVELS.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors[0] });
  }

  next();
};
