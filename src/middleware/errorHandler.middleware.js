'use strict';

const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(message);

  return res.fail(statusCode, message);
}

module.exports = errorHandler;
