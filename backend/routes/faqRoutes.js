const express = require('express');
const router = express.Router();
const { getFAQs, getAllFAQs, getFAQById, createFAQ, updateFAQ, deleteFAQ, voteFAQ, getCategories } = require('../controllers/faqController');
const { authenticate } = require('../middleware/auth');
const { staffOrAdmin } = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/categories/list', getCategories);
router.get('/', getFAQs);
router.get('/all', authenticate, staffOrAdmin, getAllFAQs);
router.get('/:id', getFAQById);

router.post('/', authenticate, staffOrAdmin, [
  body('question').trim().isLength({ min: 5 }).withMessage('Question must be at least 5 characters'),
  body('answer').trim().isLength({ min: 10 }).withMessage('Answer must be at least 10 characters'),
], validate, createFAQ);

router.put('/:id', authenticate, staffOrAdmin, [
  body('question').optional().trim().isLength({ min: 5 }),
  body('answer').optional().trim().isLength({ min: 10 }),
], validate, updateFAQ);

router.delete('/:id', authenticate, staffOrAdmin, deleteFAQ);
router.post('/:id/helpful', authenticate, [
  body('vote').isIn(['helpful', 'notHelpful']).withMessage('Vote must be "helpful" or "notHelpful"'),
], validate, voteFAQ);

module.exports = router;