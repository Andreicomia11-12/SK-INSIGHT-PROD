const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  formName: { type: String, required: true }, // e.g., "KK Profiling"
  year: { type: Number, required: true },
  cycleNumber: { type: Number, required: true },
  predictions: { type: Object, required: true },
  suggestions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Prediction", predictionSchema);