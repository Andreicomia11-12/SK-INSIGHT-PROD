const KKProfile = require("../models/KKProfile");
const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

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
      age,
      birthday,
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

    const newProfile = new KKProfile({
      user: userId,
      formCycle: formCycle._id,
      lastname: req.body.lastname,
      firstname: req.body.firstname,
      middlename: req.body.middlename,
      suffix: req.body.suffix,
      gender: req.body.gender,
      age: req.body.age,
      birthday: req.body.birthday,
      region: req.body.region,
      province: req.body.province,
      municipality: req.body.municipality,
      barangay: req.body.barangay,
      purok: req.body.purok,
      email: req.body.email,
      contactNumber: req.body.contactNumber,
      civilStatus: req.body.civilStatus,
      youthAgeGroup: req.body.youthAgeGroup,
      youthClassification: req.body.youthClassification,
      educationalBackground: req.body.educationalBackground,
      workStatus: req.body.workStatus,
      registeredSKVoter: req.body.registeredSKVoter,
      registeredNationalVoter: req.body.registeredNationalVoter,
      votedLastSKElection: req.body.votedLastSKElection,
      attendedKKAssembly: req.body.attendedKKAssembly,
      attendanceCount: req.body.attendedKKAssembly
        ? req.body.attendanceCount
        : undefined,
      reasonDidNotAttend: !req.body.attendedKKAssembly
        ? req.body.reasonDidNotAttend
        : undefined,
      profileImage: req.file ? req.file.path : undefined,
    });

    await newProfile.save();
    res.status(201).json({ message: "Profile submitted successfully" });
  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ error: "Server error while submitting form" });
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
    const profile = await KKProfile.findById(req.params.id);
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

    await profile.deleteOne();
    res.json({ message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/kkprofiling/export?cycleId=<formCycleId>
exports.exportProfilesToExcel = async (req, res) => {
  try {
    const { cycleId } = req.query;
    const filter = cycleId ? { formCycle: cycleId } : {};
    const profiles = await KKProfile.find(filter).populate(
      "user",
      "username email"
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("KK Profiling");

    sheet.columns = [
      { header: "User ID", key: "userId", width: 24 },
      { header: "Lastname", key: "lastname", width: 15 },
      { header: "Firstname", key: "firstname", width: 15 },
      { header: "Middlename", key: "middlename", width: 15 },
      { header: "Suffix", key: "suffix", width: 10 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Age", key: "age", width: 6 },
      { header: "Birthday", key: "birthday", width: 12 },
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
      {
        header: "Educational Background",
        key: "educationalBackground",
        width: 20,
      },
      { header: "Work Status", key: "workStatus", width: 15 },
      { header: "Registered SK Voter", key: "registeredSKVoter", width: 15 },
      {
        header: "Registered National Voter",
        key: "registeredNationalVoter",
        width: 20,
      },
      {
        header: "Voted Last SK Election",
        key: "votedLastSKElection",
        width: 20,
      },
      { header: "Attended KK Assembly", key: "attendedKKAssembly", width: 20 },
      { header: "Attendance Count", key: "attendanceCount", width: 18 },
      { header: "Reason Did Not Attend", key: "reasonDidNotAttend", width: 25 },
      { header: "Submitted At", key: "createdAt", width: 22 },
    ];

    profiles.forEach((profile) => {
      sheet.addRow({
        userId: profile.user?._id?.toString() || "",
        ...profile.toObject(),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=kk_profiles.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export to Excel" });
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
        .populate("user", "username email");
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
      .populate("user", "username email");

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
