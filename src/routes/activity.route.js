'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getRecentActivities } = require('../controllers/activity.controller');

const router = express.Router();

// GET /api/v1/activities/recent
router.get('/recent', authenticate, getRecentActivities);

module.exports = router;