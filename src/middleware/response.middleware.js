'use strict';

const httpStatus = require('../constants/httpStatus');

/**
 * Attaches consistent JSON response helpers to `res`.
 */
function responseFormatter(_req, res, next) {
  res.success = function success(payload = {}, message = 'OK', status = httpStatus.OK) {
    if (typeof message === 'number') {
      status = message;
      message = payload?.message || 'OK';
    } else if (message === 'OK' && payload?.message) {
      message = payload.message;
    }

    return res.status(status).json({
      success: true,
      code: status,
      message,
      data: payload?.data !== undefined ? payload.data : payload,
      meta: payload?.meta,
    });
  };

  res.fail = function fail(status, message, details) {
    return res.status(status).json({
      success: false,
      code: status,
      message,
      details: details || undefined,
    });
  };

  next();
}

module.exports = responseFormatter;
