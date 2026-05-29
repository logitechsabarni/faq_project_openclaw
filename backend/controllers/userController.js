const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/roles');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (admin)
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, isActive } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
});

// @route   PUT /api/users/:id/role
// @desc    Change user role
// @access  Private (admin)
exports.changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    throw ApiError.badRequest('Invalid role');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  user.role = role;
  await user.save();
  res.json({ success: true, data: user });
});

// @route   PUT /api/users/:id/toggle-active
// @desc    Enable or disable user account
// @access  Private (admin)
exports.toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: user, message: user.isActive ? 'Account activated' : 'Account deactivated' });
});