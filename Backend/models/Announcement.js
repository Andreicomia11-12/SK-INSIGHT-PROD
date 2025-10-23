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
  eventDate: {
    type: Date,
    required: true,
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
    required: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  viewedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

// Auto-inactive logic before save
announcementSchema.pre("save", function (next) {
  const now = new Date();
  if (
    (this.eventDate && now > this.eventDate) &&
    (this.expiresAt && now > this.expiresAt)
  ) {
    this.isActive = false;
  }
  next();
});

module.exports = mongoose.model("Announcement", announcementSchema);
