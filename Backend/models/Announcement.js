const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: [
      "General",
      "KK Profiling",
      "LGBTQ Profiling",
      "Educational Assistance",
      "Other",
    ],
    default: "General",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPinned: {
    type: Boolean,
    default: false, // New field for pinning
  },
});

module.exports = mongoose.model("Announcement", announcementSchema);
