const { body, param, query, validationResult } = require('express-validator');

/**
 * Run validation rules and return 422 if any fail.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ===== LEAD VALIDATORS =====
const leadCreateRules = [
  body('name').trim().notEmpty().withMessage('Business name is required').isLength({ max: 200 }),
  body('url').trim().notEmpty().withMessage('URL is required').isLength({ max: 500 }),
  body('niche').trim().notEmpty().withMessage('Niche is required').isLength({ max: 100 }),
  body('location').trim().optional().isLength({ max: 200 }),
  body('status').optional().isIn(['new', 'contacted', 'interested', 'proposal', 'won', 'lost'])
    .withMessage('Invalid status value'),
  body('notes').optional().isLength({ max: 2000 }),
];

const leadUpdateRules = [
  param('id').isUUID().withMessage('Invalid lead ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('status').optional().isIn(['new', 'contacted', 'interested', 'proposal', 'won', 'lost']),
  body('notes').optional().isLength({ max: 2000 }),
];

const leadSearchRules = [
  query('niche').optional().trim().isLength({ max: 100 }),
  query('location').optional().trim().isLength({ max: 200 }),
  query('keyword').optional().trim().isLength({ max: 200 }),
  query('minScore').optional().isInt({ min: 0, max: 100 }),
  query('maxScore').optional().isInt({ min: 0, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
];

// ===== AUDIT VALIDATORS =====
const auditRules = [
  body('url').trim().notEmpty().withMessage('URL is required')
    .custom(val => {
      try {
        const u = new URL(val.startsWith('http') ? val : `https://${val}`);
        // Block localhost and private IPs
        if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) {
          throw new Error('Private/local URLs are not allowed');
        }
        return true;
      } catch {
        throw new Error('A valid website URL is required');
      }
    }),
];

// ===== OUTREACH VALIDATORS =====
const outreachRules = [
  body('businessName').trim().notEmpty().withMessage('Business name is required').isLength({ max: 200 }),
  body('url').trim().notEmpty().withMessage('URL is required').isLength({ max: 500 }),
  body('senderName').trim().notEmpty().withMessage('Sender name is required').isLength({ max: 200 }),
  body('senderCompany').optional().trim().isLength({ max: 200 }),
  body('scores').isObject().withMessage('scores object is required'),
  body('issues').isArray().withMessage('issues array is required'),
];

module.exports = {
  validate,
  leadCreateRules,
  leadUpdateRules,
  leadSearchRules,
  auditRules,
  outreachRules,
};
