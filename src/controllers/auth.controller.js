'use strict';

const logger = require('../config/logger');
const httpStatus = require('../constants/httpStatus');
const { loginWeb, logoutWeb } = require('../services/auth.service');
const { getUserById, changePassword } = require('../services/user.service');
const { comparePassword, hashPassword } = require('../utils/password.util');
const { signAccessToken } = require('../utils/jwt.util');

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

async function loginController(req, res) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.fail(httpStatus.BAD_REQUEST, 'Username and password are required');
    }

    const user = await loginWeb(username.trim(), password);

    const token = signAccessToken({
      userid: user.userid,
      username: user.username,
      role: user.role,
    });
    res.cookie('accessToken', token, COOKIE_OPTIONS);

    return res.success({ user }, 'Login successful');
  } catch (err) {
    logger.error('login_failed', { error: err.message });
    const status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
    return res.fail(status, err.message || 'Internal Server Error');
  }
}

async function logout(req, res) {
  try {
    await logoutWeb(req.user?.userid);
  } catch (err) {
    logger.error('logout_status_update_failed', { error: err.message });
    // Still clear the cookie client-side even if the DB update fails
  }

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  return res.success({}, 'Logged out successfully');
}

/**
 * Self-service change password. Requires the caller's CURRENT password
 * (verified here with bcrypt.compare) before the new one is hashed and saved.
 */
async function changePasswordController(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userid = req.user?.userid;
    if (!userid) {
      return res.fail(httpStatus.UNAUTHORIZED, 'Not authenticated');
    }
    if (!currentPassword?.trim() || !newPassword?.trim()) {
      return res.fail(httpStatus.BAD_REQUEST, 'Current and new password are required');
    }
    if (newPassword.trim().length < 8) {
      return res.fail(httpStatus.BAD_REQUEST, 'New password must be at least 8 characters');
    }
    if (currentPassword.trim() === newPassword.trim()) {
      return res.fail(httpStatus.BAD_REQUEST, 'New password must be different from the current password');
    }

    const user = await getUserById(userid);
    if (!user) {
      return res.fail(httpStatus.NOT_FOUND, 'User not found');
    }

    const currentOk = await comparePassword(currentPassword.trim(), user.password);
    if (!currentOk) {
      return res.fail(httpStatus.UNAUTHORIZED, 'Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword.trim());
    const result = await changePassword(userid, newHash, user.username);
    if (result?.message && /not found/i.test(result.message)) {
      return res.fail(httpStatus.NOT_FOUND, result.message);
    }

    return res.success({}, result?.message || 'Password changed successfully');
  } catch (error) {
    logger.error('changePassword Error =>', error);
    return res.fail(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}

module.exports = { loginController, logout, changePasswordController };
