const express = require("express");
const router = express.Router();

const kkProfileCtrl = require('../controllers/kkProfileController');

const ctrl = require("../controllers/kkProfileController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadProfileImage");

// Static routes (must come before dynamic :id)
router.get("/me", protect, ctrl.getMyProfile);
router.get("/me/image", protect, ctrl.getProfileImage);

// Admin-only routes

router.get("/all", protect, authorizeRoles("admin"), getAllKKProfiles);
router.get("/export", protect, authorizeRoles("admin"), exportProfilesToExcel);
router.get('/filter', protect, kkProfileCtrl.filterProfilesByCycle);

// router.get("/all", protect, authorizeRoles("admin"), getAllKKProfiles);
router.get(
  "/export",
  protect,
  authorizeRoles("admin"),
  ctrl.exportProfilesToExcel
);


// Profile submission with image
router.post(
  "/",
  protect,
  upload.single("profileImage"), // handles multipart/form-data
  ctrl.submitKKProfile
);

router.get(
  "/cycle",
  protect,
  authorizeRoles("admin"),
  ctrl.filterProfilesByCycle
);

// Admin or Owner can manage a specific profile
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);
router.put("/:id", protect, ctrl.updateProfileById); // owner or admin
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);

// Main filter route (admin)
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Cycles and present cycle for dropdowns
router.get(
  "/cycles-and-present",
  protect,
  authorizeRoles("admin"),
  ctrl.getCyclesAndPresent
);
module.exports = router;
