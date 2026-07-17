'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { AddEditModel, getAllModel, DeleteModel } = require('../controllers/model.controller');

const router = express.Router();

router.post('/add-edit', authenticate, AddEditModel);
router.get('/get-all', authenticate, getAllModel);
router.delete('/:id', authenticate, DeleteModel);

module.exports = router;
