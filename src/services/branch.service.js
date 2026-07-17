'use strict';

const oracledb = require('oracledb');
const { withConnection } = require('../database/oraclePool');
const logger = require('../config/logger');

function toNumberOrNull(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}

async function addEditBranch(payload, actor) {
  const { vbranchid, vbranchname, vregionid, vaddress, vstatus } = payload;

  logger.info(`Processing branch modification: ID=${vbranchid || 'NEW'}, Name=${vbranchname}`);

  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          add_edit_branch(
            :vbranchid,
            :vbranchname,
            :vregionid,
            :vaddress,
            :vstatus,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vbranchid: toNumberOrNull(vbranchid),
        vbranchname: vbranchname || null,
        vregionid: toNumberOrNull(vregionid),
        vaddress: vaddress || null,
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

async function getBranches() {
  logger.info('Fetching branch list');
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_branch(:retval);
       END;`,
      {
        retval: {
          dir: oracledb.BIND_OUT,
          type: oracledb.CURSOR,
        },
      },
    );

    const resultSet = result.outBinds.retval;
    const rows = await resultSet.getRows();
    await resultSet.close();
    logger.debug(rows);

    return rows.map((row) => ({
      branchid: row.BRANCHID,
      branchname: row.BRANCHNAME,
      regionid: row.REGIONID,
      regionname: row.REGIONNAME,
      address: row.ADDRESS,
      status: row.STATUS,
      createdby: row.CREATEDBY,
      editby: row.EDITBY,
    }));
  });
}

async function deleteBranch(branchid, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          delete_branch(
            :vbranchid,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vbranchid: { val: Number(branchid), type: oracledb.NUMBER },
        vcreatedby: { val: actor, type: oracledb.STRING },
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

module.exports = {
  addEditBranch,
  getBranches,
  deleteBranch,
};
