'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { addEditBranch, getBranches, deleteBranch } = require('../services/branch.service');

async function AddEditBranch(req, res) {
  try {
    const actorId = req.user?.username || 'SYSTEM';
    const result = await addEditBranch(req.body, actorId);

    if (result?.message && /already exists/i.test(result.message)) {
      return res.fail(httpStatus.CONFLICT, result.message);
    }

    return res.success(result, result?.message || 'Branch saved successfully');
  } catch (error) {
    logger.error('AddEditBranch Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function getAllBranch(req, res) {
  try {
    const result = await getBranches();

    if (result?.code === 'DB_CONNECTION_ERROR') {
      return res.fail(httpStatus.SERVICE_UNAVAILABLE, 'Database not connected');
    }

    return res.success(result || [], result?.length ? 'Branches fetched successfully' : 'No Data Found');
  } catch (error) {
    logger.error('getAllBranch Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function DeleteBranch(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'SYSTEM';
    const result = await deleteBranch(id, actorId);

    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'Branch deleted successfully');
  } catch (error) {
    logger.error('DeleteBranch Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = {
  AddEditBranch,
  getAllBranch,
  DeleteBranch,
};
