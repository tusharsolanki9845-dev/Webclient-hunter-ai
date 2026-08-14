'use strict';

function errorHandler(err, _req, res, _next) {
  const rawStatus = Number(err.statusCode || err.status || 500);
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;

  if (status >= 500) console.error('[Server error]', err);
  else if (process.env.NODE_ENV !== 'production') console.warn('[Request error]', err.message);

  const message = status >= 500
    ? 'An unexpected server error occurred.'
    : (err.expose === false ? 'The request could not be completed.' : (err.message || 'The request could not be completed.'));

  return res.status(status).json({ error: message });
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
