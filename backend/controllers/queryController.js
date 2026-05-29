const { Query, QUERY_CATEGORIES, QUERY_PRIORITIES, QUERY_STATUSES } = require('../models/Query');
const { FAQ } = require('../models/FAQ');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/roles');

// @route   GET /api/queries
// @desc    Get queries (role-filtered)
// @access  Private
// Students see only their own, staff/admin see all
exports.getQueries = asyncHandler(async (req, res) => {
  const { status, category, priority } = req.query;
  const filter = {};

  // Students only see their own queries
  if (req.user.role === ROLES.STUDENT) {
    filter.raisedBy = req.user._id;
  }

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const queries = await Query.find(filter)
    .populate('raisedBy', 'name email department')
    .populate('assignedTo', 'name')
    .populate('solutionBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: queries.length, data: queries });
});

// @route   GET /api/queries/:id
// @desc    Get single query
// @access  Private
exports.getQueryById = asyncHandler(async (req, res) => {
  const query = await Query.findById(req.params.id)
    .populate('raisedBy', 'name email department')
    .populate('assignedTo', 'name')
    .populate('solutionBy', 'name')
    .populate('approvedBy', 'name');

  if (!query) throw ApiError.notFound('Query not found');

  // Students can only view their own queries
  if (req.user.role === ROLES.STUDENT && query.raisedBy._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only view your own queries');
  }

  res.json({ success: true, data: query });
});

// @route   POST /api/queries
// @desc    Raise a new query (with optional screenshot)
// @access  Private (auth)
exports.raiseQuery = asyncHandler(async (req, res) => {
  const { question, description, priority } = req.body;

  if (!question || !question.trim()) throw ApiError.badRequest('Question is required');

  // req.file is set by multer when multipart/form-data is used
  const screenshot = req.file ? `/uploads/${req.file.filename}` : null;

  const query = await Query.create({
    question: question.trim(),
    description: description || '',
    category: 'other',
    priority: priority || 'medium',
    raisedBy: req.user._id,
    screenshot,
  });

  const populated = await Query.findById(query._id).populate('raisedBy', 'name email');

  res.status(201).json({ success: true, data: populated });
});

// @route   PUT /api/queries/:id/solution
// @desc    Submit a solution (community or staff)
// @access  Private (auth)
exports.submitSolution = asyncHandler(async (req, res) => {
  const { solution } = req.body;
  if (!solution || !solution.trim()) throw ApiError.badRequest('Solution is required');

  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');

  // Only open or rejected queries can receive solutions
  if (!['open', 'rejected'].includes(query.status)) {
    throw ApiError.badRequest(`Cannot submit solution — query is "${query.status}"`);
  }

  // Students and staff can both submit solutions
  query.communitySolution = solution.trim();
  query.solutionBy = req.user._id;
  query.solutionSubmittedAt = new Date();
  query.status = 'pending_approval';
  query.adminNote = '';

  await query.save();
  const populated = await Query.findById(query._id)
    .populate('raisedBy', 'name email')
    .populate('solutionBy', 'name');

  res.json({ success: true, data: populated });
});

// @route   PUT /api/queries/:id/assign
// @desc    Assign query to support staff
// @access  Private (staff+)
exports.assignQuery = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');

  query.assignedTo = assignedTo || null;
  if (assignedTo && query.status === 'open') query.status = 'assigned';
  await query.save();

  res.json({ success: true, data: query });
});

// @route   PUT /api/queries/:id/approve
// @desc    Approve solution (staff+) — optionally add to FAQ
// @access  Private (staff+)
exports.approveSolution = asyncHandler(async (req, res) => {
  const { addToFAQ, faqTags, finalAnswer } = req.body;

  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');
  if (query.status !== 'pending_approval') {
    throw ApiError.badRequest('No solution pending approval');
  }

  // Use community solution as the final answer unless override provided
  const answerText = finalAnswer || query.communitySolution;

  query.finalAnswer = answerText;
  query.status = 'resolved';
  query.approvedBy = req.user._id;
  query.approvedAt = new Date();

  if (addToFAQ) {
    const tags = faqTags
      ? faqTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : query.category ? [query.category] : [];

    await FAQ.create({
      question: query.question,
      answer: answerText,
      category: query.category,
      tags,
      status: 'published',
      createdBy: req.user._id,
      reviewedBy: req.user._id,
      publishedAt: new Date(),
    });
    query.addedToFAQ = true;
  }

  await query.save();
  res.json({ success: true, data: query });
});

// @route   PUT /api/queries/:id/reject
// @desc    Reject solution — resets to open
// @access  Private (staff+)
exports.rejectSolution = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;

  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');
  if (query.status !== 'pending_approval') {
    throw ApiError.badRequest('No solution pending rejection');
  }

  query.status = 'rejected';
  query.adminNote = adminNote || '';
  query.communitySolution = '';
  query.solutionBy = null;
  query.solutionSubmittedAt = null;

  await query.save();
  res.json({ success: true, data: query });
});

// @route   PUT /api/queries/:id/close
// @desc    Close a query (student who raised it or staff+)
// @access  Private (owner or staff+)
exports.closeQuery = asyncHandler(async (req, res) => {
  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');

  if (req.user.role === ROLES.STUDENT && query.raisedBy.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only close your own queries');
  }

  if (!['open', 'assigned', 'pending_approval', 'rejected'].includes(query.status)) {
    throw ApiError.badRequest('Query cannot be closed');
  }

  query.status = 'closed';
  await query.save();
  res.json({ success: true, data: query });
});

// @route   DELETE /api/queries/:id
// @desc    Delete a query permanently
// @access  Private (admin only)
exports.deleteQuery = asyncHandler(async (req, res) => {
  await Query.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Query deleted' });
});