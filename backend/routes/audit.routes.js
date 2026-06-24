const express = require('express');
const { optionalAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, auditRules } = require('../utils/validators');
const { runAudit } = require('../controllers/audit.controller');

const router = express.Router();

// POST /api/audit — run a website audit
router.post('/', optionalAuth, auditRules, validate, asyncHandler(runAudit));

module.exports = router;
