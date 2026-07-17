'use strict';

const oracledb = require('oracledb');
const { withConnection } = require('../database/oraclePool');
const logger = require('../config/logger');

function toNumberOrNull(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}

async function addEditVendor(payload, actor) {
  const { vvendorid, vcompany, vcontact, vphone, vemail, vaddress, vstatus } = payload;

  logger.info(`Processing vendor modification: ID=${vvendorid || 'NEW'}, Company=${vcompany}`);

  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          add_edit_vendor(
            :vvendorid,
            :vcompany,
            :vcontact,
            :vphone,
            :vemail,
            :vaddress,
            :vstatus,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vvendorid: toNumberOrNull(vvendorid),
        vcompany: vcompany || null,
        vcontact: vcontact || null,
        vphone: vphone || null,
        vemail: vemail || null,
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

async function getVendors() {
  logger.info('Fetching vendor list');
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          get_vendor(:retval);
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
      vendorid: row.VENDORID,
      company: row.COMPANY,
      contact: row.CONTACT,
      phone: row.PHONE,
      email: row.EMAIL,
      address: row.ADDRESS,
      status: row.STATUS,
      createdby: row.CREATEDBY,
      editby: row.EDITBY,
    }));
  });
}

async function deleteVendor(vendorid, actor) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN
          delete_vendor(
            :vvendorid,
            :vcreatedby,
            :vmessage
          );
       END;`,
      {
        vvendorid: { val: Number(vendorid), type: oracledb.NUMBER },
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
  addEditVendor,
  getVendors,
  deleteVendor,
};
