'use strict';

const httpStatus = require('../constants/httpStatus');
const logger = require('../config/logger');
const { addEditUser, getUsers, deleteUser } = require('../services/user.service');
const { hashPassword } = require('../utils/password.util');

const ALLOWED_ROLES = ['ADMIN', 'USER'];

async function AddEditUser(req, res) {
  try {
    const actorId = req.user?.username || 'SYSTEM';
    const { vuserid, vusername, vpassword, vuserrole, vstatus } = req.body;

    if (vuserrole && !ALLOWED_ROLES.includes(String(vuserrole).toUpperCase())) {
      return res.fail(httpStatus.BAD_REQUEST, `userrole must be one of: ${ALLOWED_ROLES.join(', ')}`);
    }

    if (!vuserid && (!vpassword || vpassword.trim().length < 8)) {
      return res.fail(httpStatus.BAD_REQUEST, 'Password is required (min 8 characters) when creating a new user');
    }
    if (vpassword && vpassword.trim().length < 8) {
      return res.fail(httpStatus.BAD_REQUEST, 'Password must be at least 8 characters');
    }

    // Hash here — the DB layer never sees a plaintext password.
    const vpasswordHash = vpassword ? await hashPassword(vpassword.trim()) : null;

    const result = await addEditUser(
      {
        vuserid,
        vusername,
        vpasswordHash,
        vuserrole: vuserrole ? String(vuserrole).toUpperCase() : undefined,
        vstatus,
      },
      actorId,
    );

    if (result?.message && /already exists/i.test(result.message)) {
      return res.fail(httpStatus.CONFLICT, result.message);
    }
    if (result?.message && /password is required/i.test(result.message)) {
      return res.fail(httpStatus.BAD_REQUEST, result.message);
    }

    return res.success({ message: result?.message }, result?.message || 'User saved successfully');
  } catch (error) {
    logger.error('AddEditUser Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function getAllUsers(req, res) {
  try {
    const result = await getUsers();
    return res.success(result || [], result?.length ? 'Users fetched successfully' : 'No Data Found');
  } catch (error) {
    logger.error('getAllUsers Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

async function DeleteUser(req, res) {
  try {
    const { id } = req.params;
    const actorId = req.user?.username || 'SYSTEM';

    if (String(req.user?.userid) === String(id)) {
      return res.fail(httpStatus.BAD_REQUEST, 'You cannot delete your own account');
    }

    const result = await deleteUser(id, actorId);

    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'User deleted successfully');
  } catch (error) {
    logger.error('DeleteUser Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = { AddEditUser, getAllUsers, DeleteUser };
