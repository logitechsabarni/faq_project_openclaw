const express = require('express');
const router = express.Router();
const {
  getQueries, getQueryById, raiseQuery, submitSolution,
  assignQuery, approveSolution, rejectSolution, closeQuery, deleteQuery,
  getSimilarQueries, classifyQuery,
  getEscalatedQueries, escalateQuery, triggerSLACheck,
} = require('../controllers/queryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { staffOrAdmin } = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { body } = require('express-validator');
const { raiseQueryValidation, handleValidationErrors } = require('../middleware/queryValidation');

router.get('/similar', optionalAuth, getSimilarQueries);
router.post('/classify', optionalAuth, classifyQuery);
router.get('/sla/escalated', authenticate, staffOrAdmin, getEscalatedQueries);
router.post('/sla/check', authenticate, staffOrAdmin, triggerSLACheck);

router.get('/', optionalAuth, getQueries);
router.get('/:id', optionalAuth, getQueryById);

// multipart/form-data — accepts optional screenshot image
router.post('/', optionalAuth, upload.single('screenshot'), raiseQueryValidation, handleValidationErrors, raiseQuery);

router.put('/:id/solution', optionalAuth, upload.single('solutionScreenshot'), [
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
router.post('/:id/escalate', authenticate, staffOrAdmin, escalateQuery);
router.delete('/:id', authenticate, staffOrAdmin, deleteQuery);

module.exports = router;