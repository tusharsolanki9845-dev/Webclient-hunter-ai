'use strict';

const express = require('express');
const { requireAuth, demoOnly } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, discoverySearchRules, discoveryEnrichRules, discoveryDemoEnrichRules } = require('../utils/validators');
const { searchBusinesses, enrichBusiness } = require('../controllers/discovery.controller');

const router = express.Router();

router.get('/demo/search', demoOnly, discoverySearchRules, validate, asyncHandler(searchBusinesses));
router.post('/demo/enrich', demoOnly, discoveryDemoEnrichRules, validate, asyncHandler(enrichBusiness));
router.get('/search', requireAuth, discoverySearchRules, validate, asyncHandler(searchBusinesses));
router.post('/enrich', requireAuth, discoveryEnrichRules, validate, asyncHandler(enrichBusiness));

module.exports = router;
