'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { AddEditUser, getAllUsers, DeleteUser } = require('../controllers/user.controller');

const router = express.Router();

// User management is admin-only — creating accounts, changing roles/status,
// deleting users. Self-service password changes live under /auth/change-password.
router.post('/add-edit', authenticate, requireRole('ADMIN'), AddEditUser);
router.get('/get-all', authenticate, requireRole('ADMIN'), getAllUsers);
router.delete('/:id', authenticate, requireRole('ADMIN'), DeleteUser);

module.exports = router;
