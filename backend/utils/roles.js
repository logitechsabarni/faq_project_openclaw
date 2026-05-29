const ROLES = {
  STUDENT: 'student',
  SUPPORT_STAFF: 'support_staff',
  ADMIN: 'admin',
};

const ROLE_HIERARCHY = {
  [ROLES.STUDENT]: 1,
  [ROLES.SUPPORT_STAFF]: 2,
  [ROLES.ADMIN]: 3,
};

// Check if user has at least the specified role level
const hasRole = (userRole, requiredRole) =>
  ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];

module.exports = { ROLES, ROLE_HIERARCHY, hasRole };