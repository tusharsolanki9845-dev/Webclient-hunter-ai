/**
 * Global error handling middleware.
 * Must have 4 parameters for Express to treat it as an error handler.
 */
function errorHandler(err, req, res, next) {
  // Log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.message);
    if (err.stack) console.error(err.stack);
  }

  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  // Validation errors from express-validator (passed via next(err))
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Validation failed', details: err.details });
  }

  // Default: 500 Internal Server Error
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred.'
    : err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
}

/**
 * Wrap async route handlers to catch rejected promises.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
