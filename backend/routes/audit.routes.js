'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, auditRules } = require('../utils/validators');
const { runAudit } = require('../controllers/audit.controller');

const router = express.Router();
router.post('/', requireAuth, auditRules, validate, asyncHandler(runAudit));

module.exports = router;
