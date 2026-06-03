const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// @route GET /api/notifications
// @desc  Get current user's notifications
// @access Private
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

  res.json({ success: true, unreadCount, count: notifications.length, data: notifications });
});

// @route PUT /api/notifications/:id/read
// @desc  Mark one notification as read
// @access Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: notification });
});

// @route PUT /api/notifications/read-all
// @desc  Mark all notifications as read
// @access Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.json({ success: true, updated: result.modifiedCount || 0 });
});
