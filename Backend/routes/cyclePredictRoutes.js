const express = require('express');
const router = express.Router();
const { predictCycle } = require('../controllers/cyclePredictController');

router.post('/', predictCycle);

module.exports = router;