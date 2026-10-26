export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BLOOD_COMPONENTS = ['Whole Blood', 'Red Blood Cells', 'Platelets', 'Plasma'];

export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

export const REQUEST_STATUS = {
  ACTIVE: 'active',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

export const MATCH_STATUS = {
  NOTIFIED: 'notified',
  INTERESTED: 'interested',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
};

export const NOTIFICATION_TYPES = {
  NEW_REQUEST: 'new_request',
  DONOR_RESPONSE: 'donor_response',
  RADIUS_EXPANDED: 'radius_expanded',
  REQUEST_FULFILLED: 'request_fulfilled',
  REQUEST_CANCELLED: 'request_cancelled',
  REQUEST_EXPIRED: 'request_expired',
  CONTACT_SHARED: 'contact_shared',
};

export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  READ: 'read',
  FAILED: 'failed',
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Red blood cells / Whole blood compatibility:
// Given recipient blood group, which donor blood groups are compatible?
export const RBC_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

// Plasma compatibility (reverse of RBC):
export const PLASMA_COMPATIBILITY = {
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+', 'AB-'],
  'AB-': ['AB+', 'AB-'],
};

export const RADIUS_DEFAULTS = {
  INITIAL_KM: 1,
  MAX_KM: 10,
  STEP_KM: 1,
  DEFAULT_EVAL_MINUTES: 5,
  DEFAULT_TARGET_DONORS: 3,
};
