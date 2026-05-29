const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const { authenticate } = require('../middleware/auth');
const { staffOrAdmin, adminOnly } = require('../middleware/roleGuard');

router.use(authenticate);
router.get('/', getAnnouncements);
router.post('/', staffOrAdmin, createAnnouncement);
router.delete('/:id', adminOnly, deleteAnnouncement);

module.exports = router;