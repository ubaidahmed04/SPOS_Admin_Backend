'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { addEditRegion, getRegions, deleteRegion } = require('../services/region.service');

async function AddEditRegion(req, res) {
  try {
    const actorId = req.user?.username || 'SYSTEM';
    const result = await addEditRegion(req.body, actorId);

    if (result?.message && /already exists/i.test(result.message)) {
      return res.fail(httpStatus.CONFLICT, result.message);
    }

    return res.success(result, result?.message || 'Region saved successfully');
  } catch (error) {
    logger.error('AddEditRegion Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function getAllRegion(req, res) {
  try {
    const result = await getRegions();

    if (result?.code === 'DB_CONNECTION_ERROR') {
      return res.fail(httpStatus.SERVICE_UNAVAILABLE, 'Database not connected');
    }

    return res.success(result || [], result?.length ? 'Regions fetched successfully' : 'No Data Found');
  } catch (error) {
    logger.error('getAllRegion Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function DeleteRegion(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'SYSTEM';
    const result = await deleteRegion(id, actorId);

    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'Region deleted successfully');
  } catch (error) {
    logger.error('DeleteRegion Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = {
  AddEditRegion,
  getAllRegion,
  DeleteRegion,
};
