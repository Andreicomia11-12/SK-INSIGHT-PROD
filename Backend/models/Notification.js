const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: String,
  event: String,
  message: String,
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EducationalAssistance", // <-- CORRECT: references EducationalAssistance
  },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "FormCycle" },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  category: { type: String, default: "application" },
  priority: { type: String, enum: ["normal", "high"], default: "normal" },
});

module.exports = mongoose.model("Notification", notificationSchema);
