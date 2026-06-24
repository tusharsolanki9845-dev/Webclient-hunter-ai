const express = require('express');
const { optionalAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, outreachRules } = require('../utils/validators');
const { generateOutreach } = require('../controllers/outreach.controller');

const router = express.Router();

// POST /api/outreach/generate — generate AI outreach email
router.post('/generate', optionalAuth, outreachRules, validate, asyncHandler(generateOutreach));

module.exports = router;
