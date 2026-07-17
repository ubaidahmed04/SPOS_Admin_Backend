'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const {
  loginController,
  logout,
  changePasswordController,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', loginController);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePasswordController);

module.exports = router;
