'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { addEditVendor, getVendors, deleteVendor } = require('../services/vendor.service');
const { createActivityLog } = require('../services/activity.service');

async function AddEditVendor(req, res) {
  try {
    const actorId = req.user?.username || 'SYSTEM';
    const result = await addEditVendor(req.body, actorId);

    if (result?.message && /already exists/i.test(result.message)) {
      return res.fail(httpStatus.CONFLICT, result.message);
    }

    // Agar id null/undefined hai toh "Added", warna "Updated"
    const isEdit = req.body.id || req.body.vvendorid;
    const action = isEdit ? 'details updated' : 'added';
    
    // Vendor company name ko print karenge history me
    const vendorName = req.body.vcompany || req.body.name || 'Unknown Vendor';
    const logText = `Vendor '${vendorName}' was ${action} by ${actorId}`;

    createActivityLog(logText, actorId).catch((logErr) => {
      logger.error('Failed to log vendor activity to DB', { error: logErr.message });
    });
    // ──────────────────────────────────────────────────────────────────────────

    return res.success(result, result?.message || 'Vendor saved successfully');
  } catch (error) {
    logger.error('AddEditVendor Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function getAllVendor(req, res) {
  try {
    const result = await getVendors();

    if (result?.code === 'DB_CONNECTION_ERROR') {
      return res.fail(httpStatus.SERVICE_UNAVAILABLE, 'Database not connected');
    }

    return res.success(result || [], result?.length ? 'Vendors fetched successfully' : 'No Data Found');
  } catch (error) {
    logger.error('getAllVendor Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function DeleteVendor(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'SYSTEM';
    const result = await deleteVendor(id, actorId);

    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'Vendor deleted successfully');
  } catch (error) {
    logger.error('DeleteVendor Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = {
  AddEditVendor,
  getAllVendor,
  DeleteVendor,
};
