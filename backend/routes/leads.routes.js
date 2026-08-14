'use strict';

const express = require('express');
const { requireAuth, demoOnly } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validate, leadCreateRules, leadImportRules, leadUpdateRules, leadIdRules, leadSearchRules } = require('../utils/validators');
const { searchLeads, getLeads, getLead, createLead, importLeads, updateLead, deleteLead } = require('../controllers/leads.controller');

const router = express.Router();

router.get('/demo/search', demoOnly, leadSearchRules, validate, asyncHandler(searchLeads));
router.get('/demo', demoOnly, asyncHandler(getLeads));
router.get('/demo/:id', demoOnly, leadIdRules, validate, asyncHandler(getLead));
router.post('/demo', demoOnly, leadCreateRules, validate, asyncHandler(createLead));
router.post('/demo/import', demoOnly, leadImportRules, validate, asyncHandler(importLeads));
router.patch('/demo/:id', demoOnly, leadUpdateRules, validate, asyncHandler(updateLead));
router.delete('/demo/:id', demoOnly, leadIdRules, validate, asyncHandler(deleteLead));

router.get('/search', requireAuth, leadSearchRules, validate, asyncHandler(searchLeads));
router.get('/', requireAuth, asyncHandler(getLeads));
router.get('/:id', requireAuth, leadIdRules, validate, asyncHandler(getLead));
router.post('/', requireAuth, leadCreateRules, validate, asyncHandler(createLead));
router.post('/import', requireAuth, leadImportRules, validate, asyncHandler(importLeads));
router.patch('/:id', requireAuth, leadUpdateRules, validate, asyncHandler(updateLead));
router.delete('/:id', requireAuth, leadIdRules, validate, asyncHandler(deleteLead));

module.exports = router;
