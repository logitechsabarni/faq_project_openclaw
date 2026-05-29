const express = require('express');
const router = express.Router();
const {
  getQueries, getQueryById, raiseQuery, submitSolution,
  assignQuery, approveSolution, rejectSolution, closeQuery, deleteQuery,
} = require('../controllers/queryController');
const { authenticate } = require('../middleware/auth');
const { staffOrAdmin } = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { body } = require('express-validator');

router.get('/', authenticate, getQueries);
router.get('/:id', authenticate, getQueryById);

// multipart/form-data — accepts optional screenshot image
router.post('/', authenticate, upload.single('screenshot'), raiseQuery);

router.put('/:id/solution', authenticate, [
  body('solution').trim().isLength({ min: 10 }).withMessage('Solution must be at least 10 characters'),
], validate, submitSolution);

router.put('/:id/assign', authenticate, staffOrAdmin, assignQuery);

router.put('/:id/approve', authenticate, staffOrAdmin, [
  body('finalAnswer').optional().trim().isLength({ min: 10 }),
], validate, approveSolution);

router.put('/:id/reject', authenticate, staffOrAdmin, [
  body('adminNote').optional().trim(),
], validate, rejectSolution);

router.put('/:id/close', authenticate, closeQuery);
router.delete('/:id', authenticate, staffOrAdmin, deleteQuery);

module.exports = router;