const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/lgbtqProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer();
const uploadLGBTQIdImage = require("../middleware/uploadLGBTQIdImage");

// === USER ROUTES ===
router.post(
  "/",
  protect,
  (req, res, next) => {
    uploadLGBTQIdImage.single("idImage")(req, res, function (err) {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  ctrl.submitLGBTQProfile
);

router.get("/me/profile", protect, ctrl.getMyProfile);

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
