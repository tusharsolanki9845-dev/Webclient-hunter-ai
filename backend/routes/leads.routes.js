const express = require('express');
const { param } = require('express-validator');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, leadCreateRules, leadUpdateRules, leadSearchRules } = require('../utils/validators');
const { searchLeads, getLeads, createLead, updateLead, deleteLead } = require('../controllers/leads.controller');

const router = express.Router();

// Search — optional auth so demo mode works without a token
router.get('/search', optionalAuth, leadSearchRules, validate, asyncHandler(searchLeads));

// CRUD — require auth in production; optionalAuth allows demo mode
router.get('/', optionalAuth, asyncHandler(getLeads));
router.post('/', optionalAuth, leadCreateRules, validate, asyncHandler(createLead));
router.patch('/:id', optionalAuth, leadUpdateRules, validate, asyncHandler(updateLead));
router.delete('/:id', optionalAuth, [param('id').notEmpty()], validate, asyncHandler(deleteLead));

module.exports = router;
