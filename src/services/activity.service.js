const oracledb = require('oracledb');
const { withConnection, withTransaction } = require('../database/oraclePool');

// Get Recent Activities
async function fetchRecentActivities(limit = 10) {
  return withConnection(async (conn) => {
    const result = await conn.execute(
      `BEGIN get_recent_activities(:limit, :cursor); END;`,
      {
        limit: limit,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = [];
    let row;
    while ((row = await resultSet.getRow())) {
      rows.push({
        id: row.LOGID,
        text: row.ACTIVITYTEXT,
        user: row.CREATEDBY,
        time: row.CREATEDAT, // Date Object
      });
    }
    await resultSet.close();
    return rows;
  });
}

// Log an Activity
async function createActivityLog(text, username) {
  return withTransaction(async (conn) => {
    const result = await conn.execute(
      `BEGIN log_activity(:text, :username, :message); END;`,
      {
        text,
        username,
        message: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      }
    );
    return result.outBinds.message;
  });
}

module.exports = { fetchRecentActivities, createActivityLog };