const express = require('express');
const router = express.Router();
const { getUsers, changeRole, toggleActive } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleGuard');

router.use(authenticate);
router.get('/', adminOnly, getUsers);
router.put('/:id/role', adminOnly, changeRole);
router.put('/:id/toggle-active', adminOnly, toggleActive);

module.exports = router;