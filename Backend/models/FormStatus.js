const mongoose = require("mongoose");

const formStatusSchema = new mongoose.Schema({
  formName: {
    type: String,
    enum: ["KK Profiling", "LGBTQIA+ Profiling", "Educational Assistance"],
    required: true,
  },
  isOpen: { type: Boolean, default: true },
  cycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormCycle",
  },
});

module.exports = mongoose.model("FormStatus", formStatusSchema);
