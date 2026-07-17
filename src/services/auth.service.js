'use strict';

const { getUserByUsername, setLoginStatus } = require('./user.service');
const { comparePassword } = require('../utils/password.util');

/**
 * Real DB-backed login against userslogin (bcrypt-hashed password).
 */
async function loginWeb(username, password) {
  const user = await getUserByUsername(username);
  console.log(user)
  if (!user) {
    const err = new Error('Invalid username or password');
    err.status = 401;
    throw err;
  }

  if (user.status !== 0) {
    const err = new Error('This account is inactive. Contact an administrator.');
    err.status = 403;
    throw err;
  }

  const passwordOk = await comparePassword(password, user.password);
  if (!passwordOk) {
    const err = new Error('Invalid username or password');
    err.status = 401;
    throw err;
  }

  await setLoginStatus(user.userid, 1);

  return {
    userid: user.userid,
    username: user.username,
    role: user.userrole,
  };
}

async function logoutWeb(userid) {
  if (!userid) return;
  await setLoginStatus(userid, 0);
}

module.exports = { loginWeb, logoutWeb };
