const { Query, QUERY_CATEGORIES, QUERY_PRIORITIES, QUERY_STATUSES, SLA_RULES } = require('../models/Query');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/roles');
const { calculateDueDate, runEscalationCheck } = require('../services/slaService');

function pushHistory(query, { status, action, note = '', by = null }) {
  if (!query.queryHistory) query.queryHistory = [];
  query.queryHistory.push({
    status,
    action,
    note,
    by,
    at: new Date(),
  });
}

// @route   GET /api/queries/similar
// @desc    Find similar FAQs and open queries for duplicate detection
// @access  Private
exports.getSimilarQueries = asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  if (!q || q.trim().length < 5) {
    return res.json({ success: true, data: { similarFAQs: [], similarQueries: [] } });
  }

  const filter = { status: 'published' };
  if (category && ['academics','admission','fees','placement','facilities','other'].includes(category)) {
    filter.category = category;
  }

  // Text search on FAQs
  const faqs = await FAQ.find({ ...filter }).select('question answer category helpful averageRating tags');
  const scoredFaqs = faqs.map(faq => {
    const sim = trigramSimilarity(q, faq.question);
    return { ...faq.toObject(), similarity: sim };
  }).filter(f => f.similarity > 0.15)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  // Text search on open queries
  const openQueries = await Query.find({
    status: { $in: ['open', 'assigned', 'rejected'] },
    ...(category ? { category } : {}),
  })
    .select('question category status raisedBy createdAt')
    .populate('raisedBy', 'name')
    .limit(50);

  const scoredQueries = openQueries.map(qObj => {
    const sim = trigramSimilarity(q, qObj.question);
    return { ...qObj.toObject(), similarity: sim };
  }).filter(f => f.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  res.json({ success: true, data: { similarFAQs: scoredFaqs, similarQueries: scoredQueries } });
});

// @route   POST /api/queries/classify
// @desc    Auto-detect query category from question text
// @access  Private
exports.classifyQuery = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.json({ success: true, data: { category: 'other', confidence: 0 } });
  }
  const result = classifyQuery(text);
  res.json({ success: true, data: result });
});

// @route   GET /api/queries
// @desc    Get queries (role-filtered)
// @access  Private
exports.getQueries = asyncHandler(async (req, res) => {
  const { status, category, priority, scope } = req.query;
  const filter = {};

  // scope=mine → only the caller's queries; scope=community → public board (resolve page)
  if (scope === 'mine' && req.user) {
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
    .populate('queryHistory.by', 'name role')
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
    .populate('approvedBy', 'name')
    .populate('queryHistory.by', 'name role');

  if (!query) throw ApiError.notFound('Query not found');

  if ((req.user?.role === ROLES.USER || req.user?.role === 'student') && query.raisedBy._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only view your own queries');
  }

  res.json({ success: true, data: query });
});

// @route   POST /api/queries
// @desc    Raise a new query (with optional screenshot)
// @access  Private (auth)
exports.raiseQuery = asyncHandler(async (req, res) => {
  const { question, description, priority, category } = req.body;

  if (!question || !question.trim()) throw ApiError.badRequest('Question is required');

  const finalCategory = category || 'other';
  const finalPriority = priority || 'medium';

  const screenshot = req.file ? `/uploads/${req.file.filename}` : null;
  const dueDate = calculateDueDate(finalPriority);

  const query = await Query.create({
    question: question.trim(),
    description: description || '',
    category: finalCategory,
    priority: finalPriority,
    status: 'open',
    raisedBy: req.user?._id || null,
    screenshot,
    dueDate,
    queryHistory: [{
      status: 'open',
      action: 'Query raised',
      note: 'New query submitted by user',
      by: req.user?._id || null,
      at: new Date(),
    }],
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

  if (!['open', 'rejected'].includes(query.status)) {
    throw ApiError.badRequest(`Cannot submit solution — query is "${query.status}"`);
  }

  query.communitySolution = solution.trim();
  query.solutionBy = req.user?._id || null;
  query.solutionSubmittedAt = new Date();
  query.status = 'pending_approval';
  query.adminNote = '';
  query.solutionScreenshot = req.file ? `/uploads/${req.file.filename}` : null;
  pushHistory(query, {
    status: 'pending_approval',
    action: 'Solution submitted',
    note: 'Community solution submitted for admin review',
    by: req.user?._id || null,
  });

  await query.save();

  if (query.raisedBy && String(query.raisedBy) !== String(req.user?._id || '')) {
    await createNotification({
      user: query.raisedBy,
      type: 'query',
      title: 'Query assigned',
      message: 'Your query has been assigned to support staff.',
      link: '/resolve',
      metadata: { queryId: query._id },
    });
  }

  // Award points for submitting a solution (only if logged in)
  if (req.user?._id) {
    const user = await User.findById(req.user._id);
    if (user) await awardPoints(user, 'SOLUTION_SUBMITTED');
  }
  const populated = await Query.findById(query._id)
    .populate('raisedBy', 'name email')
    .populate('solutionBy', 'name')
    .populate('queryHistory.by', 'name role');

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
  if (assignedTo && query.status === 'assigned') {
    pushHistory(query, {
      status: 'assigned',
      action: 'Query assigned',
      note: 'Assigned to support staff',
      by: req.user?._id || null,
    });
  }
  await query.save();

  if (query.raisedBy) {
    await createNotification({
      user: query.raisedBy,
      type: 'query',
      title: 'Query resolved',
      message: addToFAQ
        ? 'Your query was approved and added to FAQ.'
        : 'Your query was approved with a final answer.',
      link: '/resolve',
      metadata: { queryId: query._id },
    });
  }

  res.json({ success: true, data: query });
});

// @route   PUT /api/queries/:id/approve
// @desc    Approve solution (staff+) — optionally add to FAQ
// @access  Private (staff+)
exports.approveSolution = asyncHandler(async (req, res) => {
  const { addToFAQ, faqTags, finalAnswer, adminNote } = req.body;

  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');
  if (query.status !== 'pending_approval' && query.status !== 'open') {
    throw ApiError.badRequest(`Cannot approve a query in "${query.status}" status`);
  }

  const answerText = (finalAnswer || query.communitySolution || query.description || '').trim();
  if (!answerText) throw ApiError.badRequest('No answer content available to add to FAQ');

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
      screenshot: query.solutionScreenshot || null,
      status: 'published',
      createdBy: req.user._id,
      reviewedBy: req.user._id,
      publishedAt: new Date(),
    });
    query.addedToFAQ = true;
  }
  pushHistory(query, {
    status: 'resolved',
    action: addToFAQ ? 'Solution approved and added to FAQ' : 'Solution approved',
    note: adminNote || '',
    by: req.user?._id || null,
  });

  await query.save();

  if (query.raisedBy) {
    await createNotification({
      user: query.raisedBy,
      type: 'query',
      title: 'Solution approved',
      message: adminNote
        ? `Admin feedback: ${adminNote}`
        : 'Your submitted solution was approved.',
      link: '/resolve',
      metadata: { queryId: query._id },
    });
  }

  // Award SOLUTION_APPROVED to the person who submitted the solution
  if (query.solutionBy) {
    await awardPoints(await User.findById(query.solutionBy), 'SOLUTION_APPROVED');
  }
  res.json({ success: true, data: query });
});

// @route   PUT /api/queries/:id/reject
// @desc    Reject solution — marks query as rejected (not open)
// @access  Private (staff+)
exports.rejectSolution = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;

  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');
  if (query.status !== 'pending_approval') {
    throw ApiError.badRequest(`Can only reject solutions awaiting review (current: "${query.status}")`);
  }

  query.status = 'rejected';
  query.adminNote = adminNote || '';
  query.communitySolution = '';
  query.solutionBy = null;
  query.solutionSubmittedAt = null;
  query.solutionScreenshot = null;
  pushHistory(query, {
    status: 'rejected',
    action: 'Solution rejected',
    note: adminNote || '',
    by: req.user?._id || null,
  });

  await query.save();

  const populated = await Query.findById(query._id)
    .populate('raisedBy', 'name email')
    .populate('solutionBy', 'name')
    .populate('queryHistory.by', 'name role');

  res.json({ success: true, message: 'Solution rejected.', data: populated });
});

// @route   PUT /api/queries/:id/close
// @desc    Close a query (user who raised it or staff+)
// @access  Private (owner or staff+)
exports.closeQuery = asyncHandler(async (req, res) => {
  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');

  if ((req.user?.role === ROLES.USER || req.user?.role === 'student') && query.raisedBy?.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only close your own queries');
  }

  if (!['open', 'assigned', 'pending_approval', 'rejected'].includes(query.status)) {
    throw ApiError.badRequest('Query cannot be closed');
  }

  query.status = 'closed';
  pushHistory(query, {
    status: 'closed',
    action: 'Query closed',
    note: 'Closed by user/staff',
    by: req.user?._id || null,
  });
  await query.save();

  if (query.raisedBy && String(query.raisedBy) !== String(req.user?._id || '')) {
    await createNotification({
      user: query.raisedBy,
      type: 'query',
      title: 'Query closed',
      message: 'Your query has been closed by support staff.',
      link: '/resolve',
      metadata: { queryId: query._id },
    });
  }
  res.json({ success: true, data: query });
});

// @route   DELETE /api/queries/:id
// @desc    Delete a query permanently
// @access  Private (admin only)
exports.deleteQuery = asyncHandler(async (req, res) => {
  await Query.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Query deleted' });
});

// @route   GET /api/queries/sla/escalated
// @desc    Get escalated queries
// @access  Private (staff+)
exports.getEscalatedQueries = asyncHandler(async (req, res) => {
  const queries = await Query.find({
    escalationLevel: { $gt: 0 },
    status: { $nin: ['resolved', 'closed'] },
  })
    .populate('raisedBy', 'name email')
    .populate('assignedTo', 'name')
    .populate('escalationHistory.escalatedTo', 'name')
    .sort({ escalationLevel: -1, createdAt: 1 });

  res.json({ success: true, count: queries.length, data: queries });
});

// @route   POST /api/queries/:id/escalate
// @desc    Manually escalate a query
// @access  Private (staff+)
exports.escalateQuery = asyncHandler(async (req, res) => {
  const query = await Query.findById(req.params.id);
  if (!query) throw ApiError.notFound('Query not found');
  if (['resolved', 'closed'].includes(query.status)) {
    throw ApiError.badRequest('Cannot escalate a resolved/closed query');
  }
  if (query.escalationLevel >= 3) {
    throw ApiError.badRequest('Query already at maximum escalation level');
  }

  const { reason } = req.body;
  const newLevel = query.escalationLevel + 1;
  const admin = await User.findOne({ role: ROLES.ADMIN, isActive: true });

  query.escalationLevel = newLevel;
  query.lastEscalatedAt = new Date();
  query.escalationHistory.push({
    level: newLevel,
    escalatedTo: admin?._id,
    reason: reason || `Manually escalated by staff`,
    at: new Date(),
  });

  pushHistory(query, {
    status: query.status,
    action: 'escalated',
    note: reason || `Manually escalated to level ${newLevel}`,
    by: req.user?._id || null,
  });

  await query.save();
  res.json({ success: true, data: query });
});

// @route   POST /api/queries/sla/check
// @desc    Trigger manual SLA check
// @access  Private (admin only)
exports.triggerSLACheck = asyncHandler(async (req, res) => {
  const escalatedCount = await runEscalationCheck();
  res.json({ success: true, message: `SLA check complete. ${escalatedCount} query(ies) escalated.`, data: { escalatedCount } });
});