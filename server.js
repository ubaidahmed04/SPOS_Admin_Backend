'use strict';
require('dotenv').config();

const { assertEnv, env } = require('./src/config/env');
assertEnv();

const http = require('http');
const app = require('./src/app');
const { initPool, closePool } = require('./src/database/oraclePool');
const logger = require('./src/config/logger');

async function shutdown(signal) {
  logger.info(`Received ${signal}, closing server and pool`);
  try {
    await closePool();
  } catch (err) {
    logger.error('Error closing Oracle pool', err);
  }
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

async function main() {
  await initPool();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Appliance Stock API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
  server.on('error', (err) => {
    logger.error('HTTP server error', err);
    process.exit(1);
  });
}

main().catch((err) => {
  logger.error('Fatal bootstrap error', err);
  process.exit(1);
});
