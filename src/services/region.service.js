'use strict';

const oracledb = require('oracledb');
const { withConnection } = require('../database/oraclePool');
const logger = require('../config/logger');

function toNumberOrNull(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}

async function addEditRegion(payload, actor) {
  const { vregionid, vregionname, vstatus } = payload;

  logger.info(`Processing region modification: ID=${vregionid || 'NEW'}, Name=${vregionname}`);

  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          add_edit_region(
            :vregionid,
            :vregionname,
            :vstatus,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vregionid: toNumberOrNull(vregionid),
        vregionname: vregionname || null,
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

async function getRegions() {
  logger.info('Fetching region list');
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_region(:retval);
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
      regionid: row.REGIONID,
      regionname: row.REGIONNAME,
      status: row.STATUS,
      createdby: row.CREATEDBY,
      editby: row.EDITBY,
    }));
  });
}

async function deleteRegion(regionid, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          delete_region(
            :vregionid,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vregionid: { val: Number(regionid), type: oracledb.NUMBER },
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
  addEditRegion,
  getRegions,
  deleteRegion,
};
