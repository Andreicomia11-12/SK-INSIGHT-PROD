const Announcement = require("../models/Announcement");

// Create
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, eventDate, expiresAt, isPinned } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      category,
      eventDate,
      expiresAt,
      isPinned: !!isPinned,
      createdBy: req.user.id,
      isActive: true // Ensure new announcements are active by default
    });
    
    // Emit WebSocket event for real-time updates
    if (req.io) {
      req.io.emit('announcement:created', announcement);
    }
    
    res.status(201).json({ success: true, announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating announcement", error: err.message });
  }
};

// Get all (active only, pinned first)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    // Auto-inactive logic for expired announcements
    await Announcement.updateMany(
      {
        isActive: true,
        $and: [
          { eventDate: { $lt: now } },
          { expiresAt: { $lt: now } }
        ]
      },
      { $set: { isActive: false } }
    );

    const announcements = await Announcement.find({ isActive: true })
      .sort({ isPinned: -1, createdAt: -1 })
      .populate("createdBy", "username email");
    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching announcements", error: err.message });
  }
};

// Get single announcement by ID
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("createdBy", "username email");
    if (!announcement || !announcement.isActive) {
      return res.status(404).json({ success: false, message: "Announcement not found or inactive" });
    }
    res.json({ success: true, announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching announcement", error: err.message });
  }
};

// Update
exports.updateAnnouncement = async (req, res) => {
  try {
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Announcement not found" });
    
    // Emit WebSocket event for real-time updates
    if (req.io) {
      req.io.emit('announcement:updated', updated);
    }
    
    res.json({ success: true, announcement: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating announcement", error: err.message });
  }
};

// Delete
exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }
    
    // Emit WebSocket event for real-time updates
    if (req.io) {
      req.io.emit('announcement:deleted', { id: req.params.id });
    }
    
    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting announcement", error: err.message });
  }
};

// Pin/Unpin
exports.pinAnnouncement = async (req, res) => {
  try {
    const { isPinned } = req.body;
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      { isPinned: !!isPinned },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Announcement not found" });
    
    // Emit WebSocket event for real-time updates
    if (req.io) {
      const eventName = isPinned ? 'announcement:pinned' : 'announcement:unpinned';
      req.io.emit(eventName, { id: req.params.id, isPinned: !!isPinned });
    }
    
    res.json({ success: true, announcement: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error pinning/unpinning announcement", error: err.message });
  }
};

// Mark as viewed
exports.viewAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement || !announcement.isActive) {
      return res.status(404).json({ success: false, message: "Announcement not found or inactive" });
    }
    if (!announcement.viewedBy.map(id => id.toString()).includes(userId)) {
      announcement.viewedBy.push(userId);
      await announcement.save();
    }
    res.json({ success: true, message: "Announcement marked as viewed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error marking as viewed", error: err.message });
  }
};
