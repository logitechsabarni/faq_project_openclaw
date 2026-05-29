const { Query } = require('../models/Query');
const { FAQ } = require('../models/FAQ');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const asyncHandler = require('../utils/asyncHandler');

// @route   GET /api/dashboard/stats
// @desc    Aggregated dashboard statistics
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const isStudent = req.user.role === 'student';

  const baseQuery = isStudent ? { raisedBy: req.user._id } : {};

  const [
    totalQueries,
    openQueries,
    resolvedToday,
    resolvedThisWeek,
    totalFAQs,
    totalUsers,
    pendingApproval,
  ] = await Promise.all([
    Query.countDocuments(baseQuery),
    Query.countDocuments({ ...baseQuery, status: { $in: ['open', 'assigned', 'pending_approval'] } }),
    Query.countDocuments({ ...baseQuery, status: 'resolved', approvedAt: { $gte: startOfDay } }),
    Query.countDocuments({ ...baseQuery, status: 'resolved', approvedAt: { $gte: startOfWeek } }),
    FAQ.countDocuments({ status: 'published' }),
    User.countDocuments({}),
    Query.countDocuments({ status: 'pending_approval' }),
  ]);

  // Status breakdown
  const statusBreakdown = await Query.aggregate([
    { $match: baseQuery },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Category breakdown for queries
  const categoryBreakdown = await Query.aggregate([
    { $match: { ...baseQuery } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Priority breakdown
  const priorityBreakdown = await Query.aggregate([
    { $match: { ...baseQuery, status: { $in: ['open', 'assigned', 'pending_approval'] } } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      queries: {
        total: totalQueries,
        open: openQueries,
        resolvedToday,
        resolvedThisWeek,
        pendingApproval,
      },
      faqs: { total: totalFAQs },
      users: { total: totalUsers },
      statusBreakdown,
      categoryBreakdown,
      priorityBreakdown,
    },
  });
});

// @route   GET /api/dashboard/recent-queries
// @desc    Recent queries for activity feed
// @access  Private
exports.getRecentQueries = asyncHandler(async (req, res) => {
  const isStudent = req.user.role === 'student';
  const filter = isStudent ? { raisedBy: req.user._id } : {};

  const queries = await Query.find(filter)
    .populate('raisedBy', 'name')
    .populate('solutionBy', 'name')
    .sort({ updatedAt: -1 })
    .limit(10);

  res.json({ success: true, data: queries });
});

// @route   GET /api/dashboard/faq-stats
// @desc    FAQ category and popularity stats
// @access  Private
exports.getFAQStats = asyncHandler(async (req, res) => {
  const categories = await FAQ.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$viewCount' }, helpful: { $sum: '$helpful' } } },
    { $sort: { count: -1 } },
  ]);

  const topFAQs = await FAQ.find({ status: 'published' })
    .sort({ viewCount: -1, helpful: -1 })
    .limit(5)
    .select('question category viewCount helpful');

  res.json({ success: true, data: { categories, topFAQs } });
});