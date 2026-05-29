const { FAQ, FAQ_CATEGORIES } = require('../models/FAQ');
const Query = require('../models/Query');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// @route   GET /api/faqs
// @desc    Get published FAQs (public, with search & filter)
// @access  Public
exports.getFAQs = asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;
  const filter = { status: 'published' };
  if (category) filter.category = category;

  let query = FAQ.find(filter);

  if (search) {
    query = FAQ.find({
      ...filter,
      $or: [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ],
    });
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    helpful: { helpful: -1 },
    views: { viewCount: -1 },
  };
  query = query.sort(sortMap[sort] || { createdAt: -1 });

  const faqs = await query;
  res.json({ success: true, count: faqs.length, data: faqs });
});

// @route   GET /api/faqs/all
// @desc    Get all FAQs (support staff / admin)
// @access  Private (staff+)
exports.getAllFAQs = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const faqs = await FAQ.find(filter)
    .populate('createdBy', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: faqs.length, data: faqs });
});

// @route   GET /api/faqs/:id
// @desc    Get single FAQ (increments view count if published)
// @access  Public
exports.getFAQById = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id)
    .populate('createdBy', 'name')
    .populate('reviewedBy', 'name');

  if (!faq) throw ApiError.notFound('FAQ not found');

  // Increment view count for published FAQs
  if (faq.status === 'published') {
    faq.viewCount += 1;
    await faq.save();
  }

  res.json({ success: true, data: faq });
});

// @route   POST /api/faqs
// @desc    Create a new FAQ
// @access  Private (staff+)
exports.createFAQ = asyncHandler(async (req, res) => {
  const { question, answer, category, tags, status } = req.body;

  const faq = await FAQ.create({
    question,
    answer,
    category: category || 'other',
    tags: tags || [],
    status: status || 'published',
    createdBy: req.user._id,
    publishedAt: status === 'published' ? new Date() : null,
  });

  res.status(201).json({ success: true, data: faq });
});

// @route   PUT /api/faqs/:id
// @desc    Update an FAQ
// @access  Private (staff+)
exports.updateFAQ = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  const { question, answer, category, tags, status } = req.body;

  if (question) faq.question = question;
  if (answer) faq.answer = answer;
  if (category) faq.category = category;
  if (tags) faq.tags = tags;
  if (status) {
    faq.status = status;
    if (status === 'published' && !faq.publishedAt) {
      faq.publishedAt = new Date();
    }
  }
  faq.reviewedBy = req.user._id;

  await faq.save();
  res.json({ success: true, data: faq });
});

// @route   DELETE /api/faqs/:id
// @desc    Archive an FAQ (soft delete)
// @access  Private (staff+)
exports.deleteFAQ = asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');

  faq.status = 'archived';
  await faq.save();
  res.json({ success: true, message: 'FAQ archived' });
});

// @route   POST /api/faqs/:id/helpful
// @desc    Vote FAQ as helpful / not helpful
// @access  Private (auth)
exports.voteFAQ = asyncHandler(async (req, res) => {
  const { vote } = req.body; // 'helpful' or 'notHelpful'
  if (!['helpful', 'notHelpful'].includes(vote)) {
    throw ApiError.badRequest('Vote must be "helpful" or "notHelpful"');
  }

  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  if (faq.status !== 'published') throw ApiError.badRequest('Can only vote on published FAQs');

  if (vote === 'helpful') faq.helpful += 1;
  else faq.notHelpful += 1;

  await faq.save();
  res.json({ success: true, data: { helpful: faq.helpful, notHelpful: faq.notHelpful } });
});

// @route   GET /api/faqs/categories/list
// @desc    Get all FAQ categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await FAQ.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: categories });
});