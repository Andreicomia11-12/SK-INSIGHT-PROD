const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/kkProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const KKProfile = require("../models/KKProfile");
const upload = require("../middleware/uploadProfileImage");
const signatureUpload = require('../middleware/signatureUploadMiddleware');

// New imports for DOCX generation
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

// Checkbox utility
function checkbox(value, match) {
  if (value === undefined || value === null) return "☐";
  // If value is boolean, compare directly
  if (typeof value === "boolean") return value === match ? "☑" : "☐";
  // If value is not a string, convert to string
  const valStr = typeof value === "string" ? value : String(value);
  return valStr.trim().toLowerCase() === String(match).trim().toLowerCase() ? "☑" : "☐";
}

// Image module setup
function getImageModuleOptions() {
  return {
    getImage: function (tagValue) {
      if (!tagValue) return Buffer.alloc(0);
      if (tagValue.path && fs.existsSync(tagValue.path)) {
        return fs.readFileSync(tagValue.path);
      }
      if (tagValue.data) {
        return Buffer.from(tagValue.data, "base64");
      }
      return Buffer.alloc(0);
    },
    getSize: function () {
      return [150, 80]; // width, height in px
    },
  };
}

// ---------------------------
// Export single profile to Word
// ---------------------------
router.get("/export/:id", protect, async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).send("Profile not found");

    // ✅ Allow: Admin exports any profile, user exports their own
    if (req.user.role !== "admin" && String(profile.user) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to export this profile" });
    }

    const templatePath = path.resolve(
      __dirname,
      "../templates/kkForm.docx"
    );
    console.log("Template Path:", templatePath);
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send("Template file not found");
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      modules: [new ImageModule(getImageModuleOptions())],
      paragraphLoop: true,
      linebreaks: true,
    });

    // Utils
    function formatBirthday(birthday) {
      if (!birthday) return "";
      const date = new Date(birthday);
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("en-US", options); // e.g., March 31, 2004
    }

    // Helper for age calculation
    function calculateAge(birthday) {
      if (!birthday) return "";
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    // 🔑 Resolve uploaded image paths
    const profileImagePath = profile.profileImage
      ? path.resolve(__dirname, "../uploads/profile", profile.profileImage)
      : null;

    const signatureImagePath = profile.signatureImage
      ? path.resolve(__dirname, "../uploads/signatures", profile.signatureImage)
      : null;

    // Load image buffers safely
    const signatureImageBuffer =
      signatureImagePath && fs.existsSync(signatureImagePath)
        ? { data: fs.readFileSync(signatureImagePath, "base64") }
        : null;

    // Helper for dd/mm/yy format
    function formatDateDMY(date) {
      if (!date) return "";
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day} /${month} /${year}`;
    }

    // Before doc.render(), add:
    const specificNeedType = profile.specificNeedType || "";

    // Render data into template
    doc.render({
      lastname: profile.lastname || "",
      firstname: profile.firstname || "",
      middlename: profile.middlename || "",
      // Middle initial (first letter of middlename, uppercased, with a dot if exists)
      middle_initial: profile.middlename && profile.middlename.length > 0
        ? profile.middlename.trim()[0].toUpperCase() + "."
        : "",
      suffix: profile.suffix || "",
      gender: profile.gender || "",

      // Gender checkboxes
      male: checkbox(profile.gender, "Male"),
      female: checkbox(profile.gender, "Female"),

      region: profile.region || "",
      province: profile.province || "",
      municipality: profile.municipality || "",
      barangay: profile.barangay || "",
      purok: profile.purok || "",

      email: profile.email || "",
      contact: profile.contactNumber || "",

// Civil Status checkboxes
      single: checkbox(profile.civilStatus, "Single"),
      livein: checkbox(profile.civilStatus, "Live-in"),
      married: checkbox(profile.civilStatus, "Married"),
      unknown: checkbox(profile.civilStatus, "Unknown"),
      separated: checkbox(profile.civilStatus, "Separated"),
      annulled: checkbox(profile.civilStatus, "Annulled"),
      divorced: checkbox(profile.civilStatus, "Divorced"),
      widowed: checkbox(profile.civilStatus, "Widowed"),

      // Youth Age Group checkboxes
      child: checkbox(profile.youthAgeGroup, "Child Youth"),
      core: checkbox(profile.youthAgeGroup, "Core Youth"),
      young: checkbox(profile.youthAgeGroup, "Young Youth"),

      // Youth Classification checkboxes
      is_c: checkbox(profile.youthClassification, "In School Youth"),
      os_c: checkbox(profile.youthClassification, "Out of School Youth"),
      work_c: checkbox(profile.youthClassification, "Working Youth"),
      spec_c: checkbox(profile.youthClassification, "Youth with Specific Needs"),

      // Educational Background checkboxes
      elemu_c: checkbox(profile.educationalBackground, "Elementary Undergraduate"),
      elemg_c: checkbox(profile.educationalBackground, "Elementary Graduate"),
      hsu_c: checkbox(profile.educationalBackground, "High School Undergraduate"),
      hsg_c: checkbox(profile.educationalBackground, "High School Graduate"),
      vocg_c: checkbox(profile.educationalBackground, "Vocational Graduate"),
      collu_c: checkbox(profile.educationalBackground, "College Undergraduate"),
      collg_c: checkbox(profile.educationalBackground, "College Graduate"),
      masl_c: checkbox(profile.educationalBackground, "Masters Level"),
      masg_c: checkbox(profile.educationalBackground, "Masters Graduate"),
      doctl_c: checkbox(profile.educationalBackground, "Doctorate Level"),
      doctg_c: checkbox(profile.educationalBackground, "Doctorate Graduate"),

      // Work Status checkboxes
      emp_c: checkbox(profile.workStatus, "Employed"),
      un_c: checkbox(profile.workStatus, "Unemployed"),
      self_c: checkbox(profile.workStatus, "Self-Employed"),
      look_c: checkbox(profile.workStatus, "Currently looking for a Job"),
      not_c: checkbox(profile.workStatus, "Not interested in looking for a Job"),

      // Attendance Count checkboxes
      a12_c: checkbox(profile.attendanceCount, "1-2 times"),
      a34_c: checkbox(profile.attendanceCount, "3-4 times"),
      a5_c: checkbox(profile.attendanceCount, "5 and above"),

      // had attended kk assembly checkboxes
      vot_yes: checkbox(profile.attendedKKAssembly, "Yes"),
      vot_no: checkbox(profile.attendedKKAssembly, "No"),

      // Reason Did Not Attend checkboxes
      rno_c: checkbox(profile.reasonDidNotAttend, "There was no KK Assembly"),
      rnot_c: checkbox(profile.reasonDidNotAttend, "Not interested"),

      // Registered SK Voter checkboxes
      sk_yes: checkbox(profile.registeredSKVoter, "Yes"),
      sk_no: checkbox(profile.registeredSKVoter, "No"),

      // Registered National Voter checkboxes
      nat_yes: checkbox(profile.registeredNationalVoter, "Yes"),
      nat_no: checkbox(profile.registeredNationalVoter, "No"),

      // Voted Last SK Election checkboxes
      yes: checkbox(profile.votedLastSKElection, "Yes"),
      no: checkbox(profile.votedLastSKElection, "No"),

      // registeredSKVoter: profile.registeredSKVoter ? "Yes" : "No",
      // registeredNationalVoter: profile.registeredNationalVoter ? "Yes" : "No",
      // votedLastSKElection: profile.votedLastSKElection ? "Yes" : "No",

      profileImage: profile.profileImage && fs.existsSync(path.resolve(__dirname, "../uploads/profile", profile.profileImage))
        ? { data: fs.readFileSync(path.resolve(__dirname, "../uploads/profile", profile.profileImage), "base64") }
        : null,
      idImagePath: profile.idImagePath && fs.existsSync(path.resolve(__dirname, "../uploads/id", profile.idImagePath))
        ? { data: fs.readFileSync(path.resolve(__dirname, "../uploads/id", profile.idImagePath), "base64") }
        : null,
      signatureImagePath: profile.signatureImagePath && fs.existsSync(path.resolve(__dirname, "../uploads/signatures", profile.signatureImagePath))
        ? { data: fs.readFileSync(path.resolve(__dirname, "../uploads/signatures", profile.signatureImagePath), "base64") }
        : null,

      birthday: formatDateDMY(profile.birthday),
      submittedAt: formatDateDMY(profile.submittedAt),
      age: calculateAge(profile.birthday),

      // New fields for DOCX
      specificNeedType: specificNeedType,
      pwd_c: specificNeedType === "Person w/Disability" ? "☑" : "☐",
      cicl_c: specificNeedType === "Children in Conflict w/Law" ? "☑" : "☐",
      ip_c: specificNeedType === "Indigenous People" ? "☑" : "☐",
    });

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${profile.lastname || "KKProfile"}_${profile.firstname || ""}.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buf);
  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).send("Error generating document");
  }
});

// ---------------------------
// Existing Routes
// ---------------------------

// Static routes (must come before dynamic :id)
router.get("/me", protect, ctrl.getMyProfile);
router.get("/me/image", protect, ctrl.getProfileImage);

// Admin-only routes
router.get("/export", protect, authorizeRoles("admin"), ctrl.exportProfilesToExcel);
router.get("/deleted", protect, authorizeRoles("admin"), ctrl.getDeletedProfiles);

// Profile submission with image
router.post(
  "/",
  protect,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
    { name: "signatureImage", maxCount: 1 },
  ]),
  ctrl.submitKKProfile
);

router.get("/cycle", protect, authorizeRoles("admin"), ctrl.filterProfilesByCycle);

// Get current user's KKProfile
router.get("/me", protect, async (req, res) => {
  const kkProfile = await KKProfile.findOne({ user: req.user.id });
  if (!kkProfile) return res.status(404).json({ error: "KKProfile not found" });
  res.json(kkProfile);
});

// Admin or Owner can manage a specific profile
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);
router.put("/:id", protect, ctrl.updateProfileById);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);
router.put("/:id/restore", protect, authorizeRoles("admin"), ctrl.restoreProfileById);
router.delete("/:id/permanent", protect, authorizeRoles("admin"), ctrl.permanentlyDeleteProfileById);

// Main filter route (admin)
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Cycles and present cycle for dropdowns
router.get("/cycles-and-present", protect, authorizeRoles("admin"), ctrl.getCyclesAndPresent);

// Admin: Get KK Profile image by KKProfile ID
router.get("/image/:id", protect, authorizeRoles("admin"), ctrl.getKKProfileImageById);

// For single signature image upload
router.post('/upload-signature', signatureUpload.single('signatureImage'), (req, res) => {
  // Save req.file.filename or req.file.path to your database as needed
  res.json({ filename: req.file.filename });
});

module.exports = router;
