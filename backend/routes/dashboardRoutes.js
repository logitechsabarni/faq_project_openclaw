const express = require('express');
const router = express.Router();
const { getStats, getRecentQueries, getFAQStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/stats', getStats);
router.get('/recent-queries', getRecentQueries);
router.get('/faq-stats', getFAQStats);

module.exports = router;