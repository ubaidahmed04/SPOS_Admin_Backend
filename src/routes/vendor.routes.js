'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { AddEditVendor, getAllVendor, DeleteVendor } = require('../controllers/vendor.controller');

const router = express.Router();

router.post('/add-edit', authenticate, AddEditVendor);
router.get('/get-all', authenticate, getAllVendor);
router.delete('/:id', authenticate, DeleteVendor);

module.exports = router;
