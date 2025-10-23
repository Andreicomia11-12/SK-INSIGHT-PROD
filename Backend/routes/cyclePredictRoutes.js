const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cyclePredictController");

router.post("/", ctrl.getOrCreatePrediction);

module.exports = router;