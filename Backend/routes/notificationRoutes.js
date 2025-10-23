const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", protect, authorizeRoles("admin"), ctrl.getAllNotifications);
router.get(
  "/unread",
  protect,
  authorizeRoles("admin"),
  ctrl.getUnreadNotifications
);
router.get(
  "/read",
  protect,
  authorizeRoles("admin"),
  ctrl.getReadNotifications
);
router.patch("/:id/read", protect, authorizeRoles("admin"), ctrl.markAsRead);
router.patch("/read-all", protect, authorizeRoles("admin"), ctrl.markAllAsRead);
router.get('/overdue', ctrl.getOverdueNotifications);

module.exports = router;
