'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { health } = require('../controllers/health.controller');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const regionRoutes = require('./region.routes');
const vendorRoutes = require('./vendor.routes');
const branchRoutes = require('./branch.routes');
const modelRoutes = require('./model.routes');
const activityRoutes = require('./activity.route');
// const webhookRoute = require('./webhook.route');

const router = express.Router();

router.get('/health', asyncHandler(health));
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/region', regionRoutes);
router.use('/vendor', vendorRoutes);
router.use('/branch', branchRoutes);
router.use('/model', modelRoutes);
router.use('/activities', activityRoutes);
// router.use('/', webhookRoute);

module.exports = router;
