'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { addEditModel, getModels, deleteModel } = require('../services/model.service');
const { createActivityLog } = require('../services/activity.service');

async function AddEditModel(req, res) {
  try {
    const actorId = req.user?.username || 'SYSTEM';
    const result = await addEditModel(req.body, actorId);

    if (result?.message && /already exists/i.test(result.message)) {
      return res.fail(httpStatus.CONFLICT, result.message);
    }

    // ──  GENERATE HISTORY LOG FOR MODEL ─────────────────────────────────────
    // Agar id null/undefined hai toh "Added", warna "Updated"
    const isEdit = req.body.id || req.body.vmodelid; 
    const action = isEdit ? 'updated' : 'added';
    const logText = `Model '${req.body.vmodelname}' was ${action} by ${actorId}`;

    createActivityLog(logText, actorId).catch((logErr) => {
      logger.error('Failed to log model activity to DB', { error: logErr.message });
    });
    // ──────────────────────────────────────────────────────────────────────────

    return res.success(result, result?.message || 'Model saved successfully');
  } catch (error) {
    logger.error('AddEditModel Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function getAllModel(req, res) {
  try {
    const result = await getModels();

    if (result?.code === 'DB_CONNECTION_ERROR') {
      return res.fail(httpStatus.SERVICE_UNAVAILABLE, 'Database not connected');
    }

    return res.success(result || [], result?.length ? 'Models fetched successfully' : 'No Data Found');
  } catch (error) {
    logger.error('getAllModel Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function DeleteModel(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'SYSTEM';
    const result = await deleteModel(id, actorId);

    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'Model deleted successfully');
  } catch (error) {
    logger.error('DeleteModel Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = {
  AddEditModel,
  getAllModel,
  DeleteModel,
};
