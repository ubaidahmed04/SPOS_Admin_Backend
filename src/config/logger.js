'use strict';

const { env } = require('./env');

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const currentLevel = env.NODE_ENV === 'production' ? levels.info : levels.debug;

function format(level, message, meta) {
  const ts = new Date().toISOString();
  const base = { ts, level, message };
  if (meta && Object.keys(meta).length) {
    return JSON.stringify({ ...base, ...meta });
  }
  return JSON.stringify(base);
}

function log(level, message, meta) {
  if (levels[level] > currentLevel) return;
  const line = format(level, message, meta);
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};
