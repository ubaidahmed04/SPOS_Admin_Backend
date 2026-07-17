'use strict';

const oracledb = require('oracledb');
const { withConnection } = require('../database/oraclePool');
const logger = require('../config/logger');

function toNumberOrNull(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}

function mapUserRow(row) {
  return {
    userid: row.USERID,
    username: row.USERNAME,
    password: row.PASSWORD, // only present on the internal lookups, never sent to the client
    status: row.STATUS,
    loginstatus: row.LOGINSTATUS,
    userrole: row.USERROLE,
    createdby: row.CREATEDBY,
    editby: row.EDITBY,
  };
}

/**
 * Admin create/update. vpassword must already be a bcrypt hash (or null on
 * edit to leave the current password untouched) — hashing happens in the
 * controller, never here.
 */
async function addEditUser(payload, actor) {
  const { vuserid, vusername, vpasswordHash, vuserrole, vstatus } = payload;

  logger.info(`Processing user modification: ID=${vuserid || 'NEW'}, Username=${vusername}`);

  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          add_edit_user(
            :vuserid,
            :vusername,
            :vpassword,
            :vuserrole,
            :vstatus,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vuserid: toNumberOrNull(vuserid),
        vusername: vusername || null,
        vpassword: vpasswordHash || null,
        vuserrole: vuserrole || null,
        vstatus: vstatus !== undefined ? toNumberOrNull(vstatus) : null,
        vcreatedby: actor,
        vmessage: {
          dir: oracledb.BIND_OUT,
          type: oracledb.STRING,
          maxSize: 500,
        },
      },
      { autoCommit: true },
    );

    logger.debug(result);
    const message = result?.outBinds?.vmessage;
    return { message };
  });
}

async function getUsers() {
  logger.info('Fetching user list');
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_users(:retval);
       END;`,
      {
        retval: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      },
    );

    const resultSet = result.outBinds.retval;
    const rows = await resultSet.getRows();
    await resultSet.close();

    return rows.map((row) => ({
      userid: row.USERID,
      username: row.USERNAME,
      status: row.STATUS,
      loginstatus: row.LOGINSTATUS,
      userrole: row.USERROLE,
      createdby: row.CREATEDBY,
      editby: row.EDITBY,
    }));
  });
}

/** Internal use only (login flow) — includes the password hash. */
async function getUserByUsername(username) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_user_by_username(:vusername, :retval);
       END;`,
      {
        vusername: username,
        retval: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      },
    );
    const resultSet = result.outBinds.retval;
    const rows = await resultSet.getRows();
    console.log(rows)
    await resultSet.close();

    return rows.length ? mapUserRow(rows[0]) : null;
  });
}

/** Internal use only (change-password flow) — includes the password hash. */
async function getUserById(userid) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_user_by_id(:vuserid, :retval);
       END;`,
      {
        vuserid: Number(userid),
        retval: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      },
    );

    const resultSet = result.outBinds.retval;
    const rows = await resultSet.getRows();
    await resultSet.close();

    return rows.length ? mapUserRow(rows[0]) : null;
  });
}

async function changePassword(userid, newPasswordHash, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          change_password(:vuserid, :vpassword, :vcreatedby, :vmessage);
       END;`,
      {
        vuserid: Number(userid),
        vpassword: newPasswordHash,
        vcreatedby: actor,
        vmessage: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
      },
      { autoCommit: true },
    );

    return { message: result?.outBinds?.vmessage };
  });
}

async function setLoginStatus(userid, loginstatus) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          set_login_status(:vuserid, :vloginstatus, :vmessage);
       END;`,
      {
        vuserid: Number(userid),
        vloginstatus: Number(loginstatus),
        vmessage: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
      },
      { autoCommit: true },
    );

    return { message: result?.outBinds?.vmessage };
  });
}

async function deleteUser(userid, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          delete_user(:vuserid, :vcreatedby, :vmessage);
       END;`,
      {
        vuserid: Number(userid),
        vcreatedby: actor,
        vmessage: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 },
      },
      { autoCommit: true },
    );

    return { message: result?.outBinds?.vmessage };
  });
}

module.exports = {
  addEditUser,
  getUsers,
  getUserByUsername,
  getUserById,
  changePassword,
  setLoginStatus,
  deleteUser,
};
