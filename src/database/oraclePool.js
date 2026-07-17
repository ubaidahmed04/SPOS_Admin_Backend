'use strict';

const oracledb = require('oracledb');

// Global DB settings
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false; // Transaction control manual hand-held by withTransaction or PL/SQL
oracledb.fetchAsString = [oracledb.CLOB];

// Oracle Client Initialization (Thick Mode)
try {
  oracledb.initOracleClient({
    libDir: process.env.NODE_ENV === 'production' 
      ? "/opt/oracle/instantclient_23_7" 
      : "../Oracle/instantclient_21_3"
  });
} catch (err) {
  console.warn('[DB WARNING] Oracle client already initialized or failed to load. Continuing...', err.message);
}

let pool; 

/**
 * Shared Connection Pool Initializer
 */
async function initPool() {
  if (pool) return pool;

  try {
    pool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: Number(process.env.ORACLE_POOL_MIN || process.env.DB_POOL_MIN || 2),
      poolMax: Number(process.env.ORACLE_POOL_MAX || process.env.DB_POOL_MAX || 10),
      poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1),
      poolTimeout: Number(process.env.ORACLE_POOL_TIMEOUT || 60),
    });
    console.log('[DB INFO] Oracle connection pool created successfully');
  } catch (err) {
    console.error('[DB ERROR] Failed to create Oracle pool:', err.message);
    throw err;
  }

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Oracle pool not initialized. Call initPool() first.');
  }
  return pool;
}

/**
 * Standard query wrapper (No implicit Transaction Management)
 */
async function withConnection(fn) {
  const connection = await getPool().getConnection();
  try {
    return await fn(connection);
  } finally {
    try {
      await connection.close();
    } catch (closeErr) {
      console.warn('[DB WARNING] Error closing Oracle connection:', closeErr.message);
    }
  }
}

/**
 * Transaction wrapper with explicit Commit and Rollback
 */
async function withTransaction(fn) {
  const connection = await getPool().getConnection();
  try {
    const result = await fn(connection);
    await connection.commit(); // Sab executing perfectly raha to commit
    return result;
  } catch (err) {
    try {
      await connection.rollback(); // Error ane par rollback
      console.log('[DB INFO] Transaction rollback executed successfully');
    } catch (rbErr) {
      console.error('[DB ERROR] Rollback failed:', rbErr.message);
    }
    throw err; // Re-throw error to service layer
  } finally {
    try {
      await connection.close(); // Connection back to the pool
    } catch (closeErr) {
      console.warn('[DB WARNING] Error closing Oracle connection after transaction:', closeErr.message);
    }
  }
}

async function closePool() {
  if (!pool) return;
  try {
    await pool.close(10);
    console.log('[DB INFO] Oracle pool closed');
  } catch (err) {
    console.error('[DB ERROR] Error closing Oracle pool:', err.message);
  } finally {
    pool = undefined;
  }
}

module.exports = {
  initPool,
  getPool,
  withConnection,
  withTransaction,
  closePool,
  oracledb
};