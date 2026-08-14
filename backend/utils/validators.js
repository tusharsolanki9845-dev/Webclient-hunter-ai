'use strict';

const { body, param, query, validationResult } = require('express-validator');
const { normalizeHttpUrl, validatePublicWebsiteUrl } = require('./urlSafety');

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'proposal', 'won', 'lost'];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({ field: error.path, message: error.msg })),
    });
  }
  return next();
}

function optionalString(field, max) {
  return body(field)
    .optional({ values: 'falsy' })
    .isString().withMessage(`${field} must be text`)
    .trim()
    .isLength({ max });
}

const leadCreateRules = [
  body('name').isString().trim().notEmpty().withMessage('Business name is required').isLength({ max: 200 }),
  body('url').isString().trim().notEmpty().withMessage('URL is required').isLength({ max: 500 })
    .custom(value => { normalizeHttpUrl(value); return true; }).withMessage('A valid HTTP or HTTPS URL is required'),
  body('niche').isString().trim().notEmpty().withMessage('Niche is required').isLength({ max: 100 }),
  optionalString('location', 200),
  body('status').optional().isIn(LEAD_STATUSES).withMessage('Invalid lead status'),
  optionalString('notes', 2000),
  body('seo_score').optional().isInt({ min: 0, max: 100 }).toInt(),
  body('speed_score').optional().isInt({ min: 0, max: 100 }).toInt(),
  body('mobile_score').optional().isInt({ min: 0, max: 100 }).toInt(),
];

const leadImportRules = [
  body('leads').isArray({ min: 1, max: 50 }).withMessage('Import 1 to 50 leads at a time'),
  body('leads.*').isObject().withMessage('Each imported lead must be an object'),
  body('leads.*.name').isString().trim().notEmpty().withMessage('Every lead needs a business name').isLength({ max: 200 }),
  body('leads.*.url').isString().trim().notEmpty().withMessage('Every lead needs a website URL').isLength({ max: 500 })
    .custom(value => { normalizeHttpUrl(value); return true; }).withMessage('Every website must use a valid HTTP or HTTPS URL'),
  body('leads.*.niche').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  body('leads.*.location').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }),
  body('leads.*.notes').optional({ values: 'falsy' }).isString().trim().isLength({ max: 2000 }),
];

const leadUpdateRules = [
  param('id').isUUID().withMessage('Lead ID must be a UUID'),
  body('name').optional().isString().trim().notEmpty().isLength({ max: 200 }),
  body('status').optional().isIn(LEAD_STATUSES).withMessage('Invalid lead status'),
  optionalString('notes', 2000),
  optionalString('niche', 100),
  optionalString('location', 200),
];

const leadIdRules = [param('id').isUUID().withMessage('Lead ID must be a UUID')];

const leadSearchRules = [
  query('niche').optional().isString().trim().isLength({ max: 100 }),
  query('location').optional().isString().trim().isLength({ max: 200 }),
  query('keyword').optional().isString().trim().isLength({ max: 200 }),
  query('minScore').optional().isInt({ min: 0, max: 100 }).toInt(),
  query('maxScore').optional().isInt({ min: 0, max: 100 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('maxScore').custom((value, { req }) => Number(value ?? 100) >= Number(req.query.minScore ?? 0))
    .withMessage('maxScore must be greater than or equal to minScore'),
];

const auditRules = [
  body('url').isString().trim().notEmpty().withMessage('URL is required').isLength({ max: 2048 })
    .custom(async value => { await validatePublicWebsiteUrl(value); return true; }),
  body('leadId').optional().isUUID().withMessage('leadId must be a UUID'),
];

const outreachRules = [
  body('businessName').isString().trim().notEmpty().withMessage('Business name is required').isLength({ max: 200 }),
  body('url').isString().trim().notEmpty().withMessage('URL is required').isLength({ max: 500 })
    .custom(value => { normalizeHttpUrl(value); return true; }).withMessage('A valid HTTP or HTTPS URL is required'),
  body('senderName').isString().trim().notEmpty().withMessage('Sender name is required').isLength({ max: 200 }),
  optionalString('senderCompany', 200),
  body('scores').isObject().withMessage('scores object is required'),
  body('scores.seo').isInt({ min: 0, max: 100 }).toInt(),
  body('scores.speed').isInt({ min: 0, max: 100 }).toInt(),
  body('scores.mobile').isInt({ min: 0, max: 100 }).toInt(),
  body('issues').optional().isArray({ max: 10 }).withMessage('issues must contain at most 10 items'),
  body('issues.*.title').optional().isString().trim().isLength({ max: 200 }),
  body('issues.*.desc').optional().isString().trim().isLength({ max: 600 }),
  body('leadId').optional().isUUID().withMessage('leadId must be a UUID'),
];

const signupRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isString().isLength({ min: 12, max: 128 }).withMessage('Password must be 12–128 characters'),
  body('name').isString().trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isString().notEmpty().withMessage('Password is required').isLength({ max: 128 }),
];

const profileRules = [
  body('name').isString().trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('company').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }),
  body('website').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 })
    .custom(value => { if (!value) return true; normalizeHttpUrl(value); return true; }).withMessage('Website must be a valid HTTP or HTTPS URL'),
];

module.exports = {
  LEAD_STATUSES,
  validate,
  leadCreateRules,
  leadImportRules,
  leadUpdateRules,
  leadIdRules,
  leadSearchRules,
  auditRules,
  outreachRules,
  signupRules,
  loginRules,
  profileRules,
};
