const KKProfile = require("../models/KKProfile");
const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const User = require("../models/User"); // Assuming the User model is in the same directory
const path = require("path");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

// Helper to get the present (open) cycle
async function getPresentCycle(formName) {
  console.log("getPresentCycle called with formName:", formName);
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  console.log("FormStatus found:", status ? status._id : null);
  if (!status || !status.cycleId) {
    throw new Error("No active form cycle");
  }
  return status.cycleId;
}

// POST /api/kkprofiling
exports.submitKKProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: "Form is currently closed" });
    }

    const cycleId = formStatus.cycleId;
    if (!cycleId || !mongoose.Types.ObjectId.isValid(cycleId)) {
      return res.status(400).json({ error: "Invalid or missing cycleId" });
    }

    const formCycle = await FormCycle.findById(cycleId);
    if (!formCycle) {
      return res.status(500).json({ error: "Active form cycle not found" });
    }

    const existing = await KKProfile.findOne({
      user: userId,
      formCycle: formCycle._id,
    });
    if (existing) {
      return res.status(409).json({ error: "Already submitted this cycle" });
    }

    const {
      lastname,
      firstname,
      middlename,
      suffix,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      email,
      contactNumber,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      specificNeedType,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
      attendedKKAssembly,
      attendanceCount,
      reasonDidNotAttend,
    } = req.body;

    if (attendedKKAssembly === true && !attendanceCount) {
      return res.status(400).json({ error: "Attendance count is required" });
    }
    if (attendedKKAssembly === false && !reasonDidNotAttend) {
      return res
        .status(400)
        .json({ error: "Reason for not attending is required" });
    }

    // Check for uploaded profile image
    if (!req.files || !req.files.profileImage || !req.files.profileImage[0]) {
      return res.status(400).json({ error: "Profile image is required to submit KK Profile." });
    }

    const user = await User.findById(req.user.id);
    const birthday = user.birthday; // use this value for the profile

    const newProfile = new KKProfile({
      user: userId,
      formCycle: formCycle._id,
      lastname,
      firstname,
      middlename,
      suffix,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      email,
      contactNumber,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      specificNeedType: youthClassification === "Youth with Specific Needs" ? specificNeedType : null,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
      attendedKKAssembly,
      attendanceCount:
        req.body.attendedKKAssembly === "true" || req.body.attendedKKAssembly === true
          ? req.body.attendanceCount
          : undefined,
      reasonDidNotAttend:
        req.body.attendedKKAssembly === "false" || req.body.attendedKKAssembly === false
          ? req.body.reasonDidNotAttend
          : undefined,

      // ✅ Save uploaded images if present
      profileImage: req.files?.profileImage
        ? req.files.profileImage[0].filename
        : null,
      idImagePath: req.files?.idImage
        ? req.files.idImage[0].path
        : null,
      signatureImagePath: req.files?.signatureImage
        ? req.files.signatureImage[0].filename
        : null,

      birthday,
    });

    await newProfile.save();
    res.status(201).json({ message: "Profile submitted successfully" });

  } catch (error) {
    console.error("Error submitting KK Profile:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// // GET /api/kkprofiling/all?cycleId=<formCycleId>
// exports.getAllKKProfiles = async (req, res) => {
//   try {
//     const { cycleId } = req.query;
//     const filter = cycleId ? { formCycle: cycleId } : {};

//     const profiles = await KKProfile.find(filter)
//       .populate("user", "username email")
//       .populate("formCycle", "cycleNumber year")
//       .sort({ submittedAt: -1 });

//     res.status(200).json(profiles);
//   } catch (error) {
//     console.error("Error fetching KK Profiles:", error);
//     res.status(500).json({ error: "Failed to fetch KK Profiles" });
//   }
// };

// GET /api/kkprofiling/:id
exports.getProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id)
      .populate("user", "username email birthday age");
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/kkprofiling/:id
exports.updateProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (profile.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    Object.assign(profile, req.body);
    await profile.save();

    res.json({ message: "Profile updated", profile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/kkprofiling/:id
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Soft delete: set isDeleted and deletedAt
    profile.isDeleted = true;
    profile.deletedAt = new Date();
    await profile.save();

    res.json({ message: "Profile moved to recycle bin" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/kkprofiling/export?cycleId=<formCycleId>
exports.exportProfilesToExcel = async (req, res) => {
  try {
    const { year, cycle } = req.query;

    // Find the cycle
    const cycleDoc = await FormCycle.findOne({
      formName: "KK Profiling",
      year: Number(year),
      cycleNumber: Number(cycle),
    });

    if (!cycleDoc) {
      return res.status(404).json({ error: "Specified cycle not found" });
    }

    const profiles = await KKProfile.find({
      formCycle: cycleDoc._id,
    }).populate("user", "username email birthday age");

    if (!profiles.length) {
      return res.status(404).json({ error: "No profiling found for this cycle" });
    }

    // Define columns
    const columns = [
      { header: "Username", key: "username", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Lastname", key: "lastname", width: 18 },
      { header: "Firstname", key: "firstname", width: 18 },
      { header: "Middlename", key: "middlename", width: 18 },
      { header: "Suffix", key: "suffix", width: 10 },
      { header: "Birthday", key: "birthday", width: 15 },
      { header: "Age", key: "age", width: 8 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Region", key: "region", width: 15 },
      { header: "Province", key: "province", width: 15 },
      { header: "Municipality", key: "municipality", width: 15 },
      { header: "Barangay", key: "barangay", width: 15 },
      { header: "Purok", key: "purok", width: 10 },
      { header: "Email", key: "email", width: 25 },
      { header: "Contact Number", key: "contactNumber", width: 15 },
      { header: "Civil Status", key: "civilStatus", width: 15 },
      { header: "Youth Age Group", key: "youthAgeGroup", width: 15 },
      { header: "Youth Classification", key: "youthClassification", width: 18 },
      { header: "Educational Background", key: "educationalBackground", width: 20 },
      { header: "Work Status", key: "workStatus", width: 15 },
      { header: "Registered SK Voter", key: "registeredSKVoter", width: 15 },
      { header: "Registered National Voter", key: "registeredNationalVoter", width: 20 },
      { header: "Voted Last SK Election", key: "votedLastSKElection", width: 20 },
      { header: "Attended KK Assembly", key: "attendedKKAssembly", width: 20 },
      { header: "Attendance Count", key: "attendanceCount", width: 18 },
      { header: "Reason Did Not Attend", key: "reasonDidNotAttend", width: 25 },
      { header: "Profile Image", key: "profileImage", width: 30 },
      { header: "Submitted At", key: "createdAt", width: 22 },
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("KK Profiling");
    worksheet.columns = columns;

    // Add header row
    worksheet.addRow(columns.map(col => col.header));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    profiles.forEach(profile => {
      worksheet.addRow([
        profile.user?.username || "",
        profile.user?.email || "",
        profile.lastname || "",
        profile.firstname || "",
        profile.middlename || "",
        profile.suffix || "",
        profile.user?.birthday ? new Date(profile.user.birthday).toLocaleDateString() : "",
        profile.user?.age || "",
        profile.gender || "",
        profile.region || "",
        profile.province || "",
        profile.municipality || "",
        profile.barangay || "",
        profile.purok || "",
        profile.email || "",
        profile.contactNumber || "",
        profile.civilStatus || "",
        profile.youthAgeGroup || "",
        profile.youthClassification || "",
        profile.educationalBackground || "",
        profile.workStatus || "",
        profile.registeredSKVoter || "",
        profile.registeredNationalVoter || "",
        profile.votedLastSKElection || "",
        profile.attendedKKAssembly || "",
        profile.attendanceCount || "",
        profile.reasonDidNotAttend || "",
        profile.profileImage || "",
        profile.createdAt ? profile.createdAt.toISOString() : "",
      ]);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=kk_profiles_${year}_cycle${cycle}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export profiles" });
  }
};

// GET /api/kkprofiling/me
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });

    if (
      !formStatus ||
      !formStatus.cycleId ||
      !mongoose.Types.ObjectId.isValid(formStatus.cycleId)
    ) {
      return res.status(404).json({ error: "No active cycle found." });
    }

    const profile = await KKProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
    }).populate("formCycle");

    if (!profile) {
      return res.status(404).json({
        error: "You have not submitted a KK profile yet for the current cycle.",
      });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Get my profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/kkprofiling/me/image
exports.getProfileImage = async (req, res) => {
  try {
    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });

    if (
      !formStatus ||
      !formStatus.cycleId ||
      !mongoose.Types.ObjectId.isValid(formStatus.cycleId)
    ) {
      return res.status(404).json({ error: "No active cycle found." });
    }

    const profile = await KKProfile.findOne({
      user: req.user.id,
      formCycle: formStatus.cycleId,
    });

    if (!profile || !profile.profileImage) {
      return res.status(404).json({ error: "No image found" });
    }

    res.status(200).json({
      imageUrl: `${req.protocol}://${req.get("host")}/${profile.profileImage}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching image" });
  }
};

// Filter KK Profiles by cycle number and year
exports.filterProfilesByCycle = async (req, res) => {
  try {
    const { cycleNumber, year } = req.query;

    if (!cycleNumber || !year) {
      return res
        .status(400)
        .json({ error: "cycleNumber and year are required" });
    }

    const cycle = await FormCycle.findOne({
      formName: "KK Profiling",
      cycleNumber: Number(cycleNumber),
      year: Number(year),
    });

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    const profiles = await KKProfile.find({ formCycle: cycle._id }).populate(
      "user",
      "username email"
    );

    res.status(200).json(profiles);
  } catch (error) {
    console.error("KK filter error:", error);
    res.status(500).json({ error: "Failed to filter KK profiles" });
  }
};

// Main filter endpoint
exports.getAllProfiles = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      classification,
      purok,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
    } = req.query;
    let cycleDoc = null;
    let filter = {};

    if (all === "true") {
      if (classification) filter.youthClassification = classification;
      if (purok) filter.purok = purok;
      if (civilStatus) filter.civilStatus = civilStatus;
      if (youthAgeGroup) filter.youthAgeGroup = youthAgeGroup;
      if (youthClassification) filter.youthClassification = youthClassification;
      if (educationalBackground)
        filter.educationalBackground = educationalBackground;
      if (workStatus) filter.workStatus = workStatus;
      if (registeredSKVoter !== undefined)
        filter.registeredSKVoter = registeredSKVoter === "true";
      if (registeredNationalVoter !== undefined)
        filter.registeredNationalVoter = registeredNationalVoter === "true";
      if (votedLastSKElection !== undefined)
        filter.votedLastSKElection = votedLastSKElection === "true";
      const profiles = await KKProfile.find(filter)
        .populate("formCycle")
        .populate("user", "username email birthday age");
      return res.json(profiles);
    }

    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "KK Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      try {
        cycleDoc = await getPresentCycle("KK Profiling");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (classification) filter.youthClassification = classification;
    if (purok) filter.purok = purok;
    if (civilStatus) filter.civilStatus = civilStatus;
    if (youthAgeGroup) filter.youthAgeGroup = youthAgeGroup;
    if (youthClassification) filter.youthClassification = youthClassification;
    if (educationalBackground)
      filter.educationalBackground = educationalBackground;
    if (workStatus) filter.workStatus = workStatus;
    if (registeredSKVoter !== undefined)
      filter.registeredSKVoter = registeredSKVoter === "true";
    if (registeredNationalVoter !== undefined)
      filter.registeredNationalVoter = registeredNationalVoter === "true";
    if (votedLastSKElection !== undefined)
      filter.votedLastSKElection = votedLastSKElection === "true";

    const profiles = await KKProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email birthday age");

    res.json(profiles);
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Endpoint to get all cycles and present cycle
exports.getCyclesAndPresent = async (req, res) => {
  try {
    const allCycles = await FormCycle.find({ formName: "KK Profiling" }).sort({
      year: -1,
      cycleNumber: -1,
    });
    let presentCycle = null;
    try {
      presentCycle = await getPresentCycle("KK Profiling");
    } catch {
      presentCycle = null;
    }
    res.json({ allCycles, presentCycle });
  } catch (err) {
    res.status(500).json({ error: "Failed to load cycles" });
  }
};

exports.getKKProfileImageById = async (req, res) => {
  // expects :id to be the KKProfile _id, not the user _id
  const kkProfile = await KKProfile.findById(req.params.id);
  if (!kkProfile || !kkProfile.profileImage) {
    return res.status(404).json({ error: "KK Profile or profile image not found" });
  }
  const imagePath = path.join(__dirname, "../uploads/profile_images", kkProfile.profileImage);
  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: "Image file not found" });
    res.sendFile(imagePath);
  });
};

// GET /api/kkprofiling/export/:id
exports.exportKKProfileDocx = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id).populate("user");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Load the template
    const templatePath = path.join(__dirname, "../kk_profiling_template.docx");
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: "Template file not found" });
    }
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip);

    // Prepare data for template
    const data = {
      lastname: profile.lastname || "",
      firstname: profile.firstname || "",
      middlename: profile.middlename || "",
      suffix: profile.suffix || "",
      gender: profile.gender || "",
      region: profile.region || "",
      province: profile.province || "",
      municipality: profile.municipality || "",
      barangay: profile.barangay || "",
      purok: profile.purok || "",
      email: profile.email || "",
      contactNumber: profile.contactNumber || "",
      civilStatus: profile.civilStatus || "",
      youthAgeGroup: profile.youthAgeGroup || "",
      youthClassification: profile.youthClassification || "",
      educationalBackground: profile.educationalBackground || "",
      workStatus: profile.workStatus || "",
      registeredSKVoter: profile.registeredSKVoter ? "Yes" : "No",
      registeredNationalVoter: profile.registeredNationalVoter ? "Yes" : "No",
      votedLastSKElection: profile.votedLastSKElection ? "Yes" : "No",
      attendedKKAssembly: profile.attendedKKAssembly ? "Yes" : "No",
      attendanceCount: profile.attendanceCount || "",
      reasonDidNotAttend: profile.reasonDidNotAttend || "",
      birthday: profile.user?.birthday
        ? new Date(profile.user.birthday).toLocaleDateString()
        : "",
      age: profile.user?.age || "",
      // Add this line for the dropdown value:
      specificNeedType: profile.specificNeedType || "",
    };

    doc.render(data);

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${profile.lastname || "KKProfile"}.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buf);
  } catch (err) {
    console.error("Error exporting DOCX:", err);
    res.status(500).json({ error: "Failed to export DOCX" });
  }
};

exports.restoreProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile || !profile.isDeleted) return res.status(404).json({ error: "Profile not found or not deleted" });

    profile.isDeleted = false;
    profile.deletedAt = null;
    await profile.save();

    res.json({ message: "Profile restored" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getDeletedProfiles = async (req, res) => {
  try {
    const profiles = await KKProfile.find({ isDeleted: true });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.permanentlyDeleteProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile || !profile.isDeleted) return res.status(404).json({ error: "Profile not found or not deleted" });

    await profile.deleteOne();
    res.json({ message: "Profile permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};



// Use isPWD, isCICL, isIP as needed here

