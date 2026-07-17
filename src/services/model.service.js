'use strict';

const oracledb = require('oracledb');
const { withConnection } = require('../database/oraclePool');
const logger = require('../config/logger');

function toNumberOrNull(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}

async function addEditModel(payload, actor) {
  const {
    vmodelid,
    vvendorid,
    vregionid,
    vmodelname,
    vmodelcode,
    vmrp,
    vcash,
    vhscode,
    vstatus,
  } = payload;

  logger.info(`Processing model modification: ID=${vmodelid || 'NEW'}, Code=${vmodelcode}`);

  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          add_edit_model(
            :vmodelid,
            :vvendorid,
            :vregionid,
            :vmodelname,
            :vmodelcode,
            :vmrp,
            :vcash,
            :vhscode,
            :vstatus,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vmodelid: toNumberOrNull(vmodelid),
        vvendorid: toNumberOrNull(vvendorid),
        vregionid: toNumberOrNull(vregionid),
        vmodelname: vmodelname || null,
        vmodelcode: vmodelcode || null,
        vmrp: toNumberOrNull(vmrp),
        vcash: toNumberOrNull(vcash),
        vhscode: vhscode || null,
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

async function getModels() {
  logger.info('Fetching model list');
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_model(:retval);
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
      modelid: row.MODELID,
      vendorid: row.VENDORID,
      company: row.COMPANY,
      regionid: row.REGIONID,
      regionname: row.REGIONNAME,
      modelname: row.MODELNAME,
      modelcode: row.MODELCODE,
      mrp: row.MRP,
      cash: row.CASH,
      hscode: row.HSCODE,
      status: row.STATUS,
      createdby: row.CREATEDBY,
      editby: row.EDITBY,
    }));
  });
}

async function deleteModel(modelid, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          delete_model(
            :vmodelid,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vmodelid: { val: Number(modelid), type: oracledb.NUMBER },
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
  addEditModel,
  getModels,
  deleteModel,
};
