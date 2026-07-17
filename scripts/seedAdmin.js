'use strict';
/**
 * One-time bootstrap: creates the first ADMIN user in userslogin.
 * Run this AFTER executing db/02_userslogin_schema.sql, since there's no
 * way to seed a bcrypt hash from pure SQL (Oracle 11g has no bcrypt).
 *
 * Usage:
 *   node scripts/seedAdmin.js <username> <password>
 *   node scripts/seedAdmin.js                # uses ADMIN_USERNAME / ADMIN_PASSWORD from .env
 */
require('dotenv').config();

const { assertEnv, env } = require('../src/config/env');
assertEnv();

const { initPool, closePool } = require('../src/database/oraclePool');
const { addEditUser, getUserByUsername } = require('../src/services/user.service');
const { hashPassword } = require('../src/utils/password.util');
const logger = require('../src/config/logger');

async function main() {
  const [, , argUsername, argPassword] = process.argv;
  const username = argUsername || process.env.ADMIN_USERNAME;
  const password = argPassword || process.env.ADMIN_PASSWORD;

  if (!username || !password || password.length < 6) {
    logger.error('Usage: node scripts/seedAdmin.js <username> <password> (password min 6 chars)');
    process.exit(1);
  }

  await initPool();

  try {
    const existing = await getUserByUsername(username);
    if (existing) {
      logger.info(`User "${username}" already exists (userid=${existing.userid}). Nothing to do.`);
      return;
    }

    const vpasswordHash = await hashPassword(password);
    const result = await addEditUser(
      {
        vuserid: null,
        vusername: username,
        vpasswordHash,
        vuserrole: 'ADMIN',
        vstatus: 0,
      },
      'SEED_SCRIPT',
    );

    logger.info(`Seed result: ${result.message}`);
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  logger.error('Seed script failed', { message: err.message });
  process.exit(1);
});
