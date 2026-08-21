'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, auditRules } = require('../utils/validators');
const { runAudit, runPageSpeed } = require('../controllers/audit.controller');

const router = express.Router();
router.post('/', requireAuth, auditRules, validate, asyncHandler(runAudit));
router.post('/pagespeed', requireAuth, auditRules, validate, asyncHandler(runPageSpeed));

module.exports = router;
