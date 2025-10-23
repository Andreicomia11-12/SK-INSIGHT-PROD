const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/lgbtqProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer();
const uploadLGBTQIdImage = require("../middleware/uploadLGBTQIdImage");
const path = require("path");
const fs = require("fs");

// === USER ROUTES ===
router.post(
  "/",
  protect,
  uploadLGBTQIdImage.fields([
    { name: "idImageFront", maxCount: 1 },
    { name: "idImageBack", maxCount: 1 }
  ]),
  ctrl.submitLGBTQProfile
);

router.get("/me/profile", protect, ctrl.getMyProfile);

// Route to get front ID image by filename
router.get("/id-image/front/:filename", protect, (req, res) => {
  const filePath = path.join(__dirname, "../uploads/lgbtq_id_images", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Front ID image not found" });
  }
});

// Route to get back ID image by filenamex
router.get("/id-image/back/:filename", protect, (req, res) => {
  const filePath = path.join(__dirname, "../uploads/lgbtq_id_images", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Back ID image not found" });
  }
});

// === ADMIN ROUTES ===

// Export profiles to Excel
router.get(
  "/export/excel",
  protect,
  authorizeRoles("admin"),
  ctrl.exportProfilesToExcel
);

// Get all profiles
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Get filtered profiles by cycle
router.get("/filter", protect, authorizeRoles("admin"), ctrl.filterProfilesByCycle);

// Get deleted profiles (Recycle Bin)
router.get("/deleted", protect, authorizeRoles("admin"), ctrl.getDeletedProfiles);

// Get single profile by ID
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);

// Update profile by ID
router.put("/:id", protect, authorizeRoles("admin"), ctrl.updateProfileById);

// Soft delete profile by ID
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);

// Restore profile by ID
router.put("/:id/restore", protect, authorizeRoles("admin"), ctrl.restoreProfileById);

// Permanent delete profile by ID
router.delete("/:id/permanent", protect, authorizeRoles("admin"), ctrl.permanentlyDeleteProfileById);

module.exports = router;
