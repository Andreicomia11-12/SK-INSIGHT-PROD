const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/educationalAssistanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = require("../middleware/signatureUploadMiddleware"); // or your custom middleware

// ===== User Routes =====
router.post(
  "/",
  protect,
  upload.fields([
    { name: "signature", maxCount: 1 },
    { name: "sedulaImage", maxCount: 1 },
    { name: "coeImage", maxCount: 1 },
  ]),
  ctrl.submitApplication
);
router.get("/me", protect, ctrl.getMyApplication);

// ===== Admin Routes =====
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllApplications);
router.get(
  "/cycle",
  protect,
  authorizeRoles("admin"),
  ctrl.filterApplicationsByCycle
);
router.get(
  "/filter",
  protect,
  authorizeRoles("admin"),
  ctrl.filterApplications
);
router.get(
  "/status",
  protect,
  authorizeRoles("admin"),
  ctrl.getApplicationsByStatus
);
router.get(
  "/cycles-and-present",
  protect,
  authorizeRoles("admin"),
  ctrl.getCyclesAndPresent
);
router.get(
  "/export/excel",
  protect,
  authorizeRoles("admin"),
  ctrl.exportApplicationsToExcel
);

// ID-specific admin routes — keep these LAST to avoid conflicts
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  ctrl.updateApplicationStatus
);
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getApplicationById);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteApplication);

module.exports = router;
