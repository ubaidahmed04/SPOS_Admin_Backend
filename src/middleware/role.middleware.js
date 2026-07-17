'use strict';

const httpStatus = require('../constants/httpStatus');

/**
 * Restricts a route to specific req.user.role values.
 * Must run after `authenticate`.
 */
function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.fail(httpStatus.UNAUTHORIZED, 'Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      return res.fail(httpStatus.FORBIDDEN, 'You do not have permission to perform this action');
    }
    next();
  };
}

module.exports = { requireRole };
