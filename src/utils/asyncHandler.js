'use strict';

/**
 * Wraps async Express handlers so errors propagate to centralized error middleware.
 * @param {function} fn
 */
function asyncHandler(fn) {
  return function asyncWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
