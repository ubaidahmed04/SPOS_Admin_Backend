'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { AddEditBranch, getAllBranch, DeleteBranch } = require('../controllers/branch.controller');

const router = express.Router();

router.post('/add-edit', authenticate, AddEditBranch);
router.get('/get-all', authenticate, getAllBranch);
router.delete('/:id', authenticate, DeleteBranch);

module.exports = router;
