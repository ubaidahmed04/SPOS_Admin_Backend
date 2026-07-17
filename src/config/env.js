'use strict';

const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().default(4000),
  API_VERSION: Joi.string().default('v1'),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  ADMIN_USERNAME: Joi.string().default('admin'),
  ADMIN_PASSWORD: Joi.string().default('Admin@123'),

  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_CONNECT_STRING: Joi.string().required(),
  ORACLE_CLIENT_LIB_DIR: Joi.string().allow('').optional(),
  ORACLE_POOL_MIN: Joi.number().integer().min(0).default(2),
  ORACLE_POOL_MAX: Joi.number().integer().min(1).default(10),
  ORACLE_POOL_INCREMENT: Joi.number().integer().min(1).default(2),

  ALLOWED_ORIGINS: Joi.string().allow('').default(''),
}).unknown(true);

let cached;

function assertEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false, stripUnknown: true });
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ');
    throw new Error(`Environment validation failed: ${msg}`);
  }
  cached = value;
  return cached;
}

function getEnv() {
  if (!cached) {
    assertEnv();
  }
  return cached;
}

module.exports = {
  get env() {
    return getEnv();
  },
  assertEnv,
};
