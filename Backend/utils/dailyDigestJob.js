const cron = require("node-cron");
const EducationalAssistance = require("../models/EducationalAssistance");
const Notification = require("../models/Notification");

function runDailyDigest(io) {
  cron.schedule("0 7 * * *", async () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Count new submissions today
    const newCount = await EducationalAssistance.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Find pending > 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const pendingCount = await EducationalAssistance.countDocuments({
      status: "pending",
      createdAt: { $lte: fiveDaysAgo },
    });

    const digestMsg = `${newCount} new submissions today. ${pendingCount} submissions pending for 5+ days.`;

    // Store digest notification
    const notif = new Notification({
      type: "educational-assistance",
      event: "dailyDigest",
      message: digestMsg,
      createdAt: new Date(),
      read: false,
    });
    await notif.save();

    // Emit digest to admins
    io.emit("educational-assistance:dailyDigest", {
      message: digestMsg,
      newToday: newCount,
      pendingOver5Days: pendingCount,
      date: new Date(),
    });
  });
}

module.exports = runDailyDigest;
