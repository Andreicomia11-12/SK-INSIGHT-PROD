const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/announcementController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Admin only
router.post("/", protect, authorizeRoles("admin"), ctrl.createAnnouncement);
router.put("/:id", protect, authorizeRoles("admin"), ctrl.updateAnnouncement);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  ctrl.deleteAnnouncement
);

// Public/Protected view
router.get("/", protect, ctrl.getAnnouncements);

module.exports = router;
