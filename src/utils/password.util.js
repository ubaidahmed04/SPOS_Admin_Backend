'use strict';

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password with bcrypt. Never store plaintext passwords —
 * this hash is the only thing that should ever reach the database.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, comparePassword };
