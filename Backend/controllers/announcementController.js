const Announcement = require("../models/Announcement");

// Create
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, expiresAt, isPinned } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      category,
      expiresAt,
      isPinned: !!isPinned,
      createdBy: req.user.id,
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: "Error creating announcement" });
  }
};

// Get all (active first, pinned on top)
exports.getAnnouncements = async (req, res) => {
  try {
    const { includeExpired } = req.query;
    const now = new Date();
    let filter = includeExpired ? {} : { isActive: true };

    // Remove expired ones if not including expired
    if (!includeExpired) {
      filter = {
        ...filter,
        $or: [{ expiresAt: { $gte: now } }, { expiresAt: null }],
      };
    }

    const announcements = await Announcement.find(filter)
      .populate("createdBy", "username email")
      .sort({ isPinned: -1, createdAt: -1 }); // Pinned first, then newest
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: "Error fetching announcements" });
  }
};

// Update (also allows pin/unpin)
exports.updateAnnouncement = async (req, res) => {
  try {
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating announcement" });
  }
};

// Delete
exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting announcement" });
  }
};
