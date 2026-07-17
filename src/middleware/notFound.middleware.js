'use strict';

const httpStatus = require('../constants/httpStatus');

function notFoundHandler(req, res) {
  return res.fail(httpStatus.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`);
}

module.exports = notFoundHandler;
