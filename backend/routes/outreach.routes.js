'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, outreachRules } = require('../utils/validators');
const { generateOutreach } = require('../controllers/outreach.controller');

const router = express.Router();
router.post('/generate', requireAuth, outreachRules, validate, asyncHandler(generateOutreach));

module.exports = router;
