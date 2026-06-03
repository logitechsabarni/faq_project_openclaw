const express = require('express');
const router = express.Router();
const {
  getFAQs, getAllFAQs, getFAQById, createFAQ, updateFAQ, deleteFAQ,
  voteFAQ, removeVote, getMyVote, getCategories, assignFAQsToCategory,
  rateFAQ, getTopRated, getTopFAQs,
} = require('../controllers/faqController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { staffOrAdmin } = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const upload = require('../middleware/upload');

// IMPORTANT: /top must be before /:id to avoid Express treating "top" as an ID
router.get('/top', getTopFAQs);                         // public — no auth
router.get('/categories/list', getCategories);          // public
router.get('/top-rated', getTopRated);                  // public
router.post('/assign-category', authenticate, staffOrAdmin, assignFAQsToCategory);
router.get('/', getFAQs);                               // public
router.get('/all', authenticate, staffOrAdmin, getAllFAQs);
router.get('/:id', getFAQById);                         // NOTE: placed after /top
router.get('/:id/my-vote', authenticate, getMyVote);

router.post('/', authenticate, staffOrAdmin, upload.single('screenshot'), [
  body('question').trim().isLength({ min: 5 }).withMessage('Question must be at least 5 characters'),
  body('answer').trim().isLength({ min: 10 }).withMessage('Answer must be at least 10 characters'),
], validate, createFAQ);

router.put('/:id', authenticate, staffOrAdmin, upload.single('screenshot'), [
  body('question').optional().trim().isLength({ min: 5 }),
  body('answer').optional().trim().isLength({ min: 10 }),
], validate, updateFAQ);

router.delete('/:id', authenticate, staffOrAdmin, deleteFAQ);

router.post('/:id/vote', optionalAuth, [
  body('vote').isIn(['helpful', 'not_helpful']).withMessage('Vote must be "helpful" or "not_helpful"'),
], validate, voteFAQ);

router.delete('/:id/vote', optionalAuth, removeVote);

router.post('/:id/rate', authenticate, [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
], validate, rateFAQ);

module.exports = router;
