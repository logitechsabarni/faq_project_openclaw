const Announcement = require('../models/Announcement');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createNotificationsBulk } = require('../utils/notifications');

// @route   GET /api/announcements
// @desc    Get active announcements
// @access  Private
exports.getAnnouncements = asyncHandler(async (req, res) => {
  const now = new Date();
  const announcements = await Announcement.find({
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .populate('createdBy', 'name')
    .sort({ priority: -1, createdAt: -1 });

  res.json({ success: true, data: announcements });
});

// @route   POST /api/announcements
// @desc    Create announcement
// @access  Private (staff+)
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, priority, expiresAt } = req.body;
  if (!title || !content) throw ApiError.badRequest('Title and content are required');

  const announcement = await Announcement.create({
    title,
    content,
    priority: priority || 'info',
    expiresAt: expiresAt || null,
    createdBy: req.user._id,
  });

  const users = await User.find({ isActive: true }).select('_id').lean();
  if (users.length) {
    await createNotificationsBulk(
      users.map((u) => ({
        user: u._id,
        type: 'announcement',
        title: `New announcement: ${title}`,
        message: content,
        link: '/resolve',
        metadata: { announcementId: announcement._id },
      }))
    );
  }

  res.status(201).json({ success: true, data: announcement });
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private (admin)
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Announcement deleted' });
});