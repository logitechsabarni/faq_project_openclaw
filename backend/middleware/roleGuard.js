const { ROLES, hasRole } = require('../utils/roles');
const ApiError = require('../utils/ApiError');

// Require at least the specified role
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden(`Access denied. Required role: ${roles.join(' or ')}`);
  }
  next();
};

// Shorthand middleware creators
const adminOnly = requireRole(ROLES.ADMIN);
const staffOrAdmin = requireRole(ROLES.SUPPORT_STAFF, ROLES.ADMIN);
const authenticated = requireRole(ROLES.STUDENT, ROLES.SUPPORT_STAFF, ROLES.ADMIN);

module.exports = { requireRole, adminOnly, staffOrAdmin, authenticated };