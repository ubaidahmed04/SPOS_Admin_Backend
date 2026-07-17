'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { AddEditRegion, getAllRegion, DeleteRegion } = require('../controllers/region.controller');

const router = express.Router();

router.post('/add-edit', authenticate, AddEditRegion);
router.get('/get-all', authenticate, getAllRegion);
router.delete('/:id', authenticate, DeleteRegion);

module.exports = router;
