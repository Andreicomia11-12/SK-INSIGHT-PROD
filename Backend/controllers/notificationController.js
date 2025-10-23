const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");

async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) throw new Error("No active form cycle");
  return status.cycleId;
}

// Get all notifications for present cycle (with status)
exports.getAllNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
    })
      .populate({
        path: "referenceId",
        select: "status",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getAllNotifications error:", err);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
};

// Get only unread notifications for present cycle (with status)
exports.getUnreadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: false,
    })
      .populate({
        path: "referenceId",
        select: "status firstname middlename surname createdAt",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });

    const now = Date.now();
    // Filter out overdue notifications (pending > 2 days)
    const response = notifs
      .filter(
        (n) =>
          n.referenceId &&
          (n.referenceId.status !== "pending" ||
            now - new Date(n.referenceId.createdAt).getTime() <= TWO_DAYS_MS)
      )
      .map((n) => ({
        _id: n._id,
        type: n.type,
        event: n.event,
        message: n.message,
        referenceId: n.referenceId?._id || n.referenceId,
        cycleId: n.cycleId,
        createdAt: n.createdAt,
        read: n.read,
        status: n.referenceId?.status || "unknown",
        fullname: n.referenceId
          ? `${n.referenceId.firstname || ""} ${
              n.referenceId.middlename || ""
            } ${n.referenceId.surname || ""}`.trim()
          : "Unknown",
      }));

    res.json(response);
  } catch (err) {
    console.error("getUnreadNotifications error:", err);
    res
      .status(500)
      .json({ error: "Server error fetching unread notifications" });
  }
};

// Mark a notification as read by ID
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification marked as read", notification: notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating notification" });
  }
};

// Mark all notifications for present cycle as read
exports.markAllAsRead = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    await Notification.updateMany(
      { type: "educational-assistance", cycleId: cycle._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "All notifications marked as read for present cycle" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Server error while updating notifications" });
  }
};

// Get only read notifications for present cycle (with status)
exports.getReadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: true,
    })
      .populate({
        path: "referenceId",
        select: "status",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getReadNotifications error:", err);
    res.status(500).json({ error: "Server error fetching read notifications" });
  }
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

exports.getOverdueNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: false,
    })
      .populate({
        path: "referenceId",
        select: "status firstname middlename surname createdAt",
        model: "EducationalAssistance",
        match: { status: "pending" },
      })
      .sort({ createdAt: -1 });

    const now = Date.now();
    // Filter for those pending > 2 days and flatten format like unread
    const response = notifs
      .filter(
        (n) =>
          n.referenceId &&
          n.referenceId.status === "pending" &&
          now - new Date(n.referenceId.createdAt).getTime() > TWO_DAYS_MS
      )
      .map((n) => ({
        _id: n._id,
        type: n.type,
        event: n.event,
        message: n.message,
        referenceId: n.referenceId?._id || n.referenceId,
        cycleId: n.cycleId,
        createdAt: n.createdAt,
        read: n.read,
        status: n.referenceId?.status || "unknown",
        fullname: n.referenceId
          ? `${n.referenceId.firstname || ""} ${
              n.referenceId.middlename || ""
            } ${n.referenceId.surname || ""}`.trim()
          : "Unknown",
      }));

    res.json(response);
  } catch (err) {
    console.error("getOverdueNotifications error:", err);
    res.status(500).json({ error: "Server error fetching overdue notifications" });
  }
};
