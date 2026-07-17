'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { fetchRecentActivities } = require('../services/activity.service');

/**
 * Fetch recent audit/activity logs.
 * Supports an optional query param 'limit' (default is 10).
 */
async function getRecentActivities(req, res) {
  try {
    // Agar frontend query me limit bheje (e.g., /get-recent?limit=15) toh use parse karein
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await fetchRecentActivities(limit);

    if (result?.code === 'DB_CONNECTION_ERROR') {
      return res.fail(httpStatus.SERVICE_UNAVAILABLE, 'Database not connected');
    }

    return res.success(
      result || [], 
      result?.length ? 'Recent activities fetched successfully' : 'No recent activities found'
    );
  } catch (error) {
    logger.error('getRecentActivities Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = {
  getRecentActivities,
};