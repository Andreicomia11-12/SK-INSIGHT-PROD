const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const ExcelJS = require("exceljs");

// Submit new profile
exports.submitLGBTQProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: "Form is currently closed" });
    }

    const existing = await LGBTQProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId, // FIXED
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "You already submitted during this form cycle" });
    }

    const { sexAssignedAtBirth, lgbtqClassification } = req.body;
    const idImage = req.file ? req.file.path : undefined;

    const newProfile = new LGBTQProfile({
      user: userId,
      formCycle: formStatus.cycleId, // FIXED
      sexAssignedAtBirth,
      lgbtqClassification,
      idImage,
    });

    await newProfile.save();
    res
      .status(201)
      .json({ message: "LGBTQIA+ Profile submitted successfully" });
  } catch (error) {
    console.error("LGBTQ submit error:", error);
    res.status(500).json({ error: "Server error while submitting form" });
  }
};

// Helper to enrich profile with KK info
const attachKKInfo = async (profile) => {
  const kk = await KKProfile.findOne({ user: profile.user });
  const profileObj = profile.toObject();
  profileObj.kkInfo = kk
    ? {
        lastname: kk.lastname,
        firstname: kk.firstname,
        middlename: kk.middlename,
        birthday: kk.birthday,
        age: kk.age,
        gender: kk.gender,
        region: kk.region,
        province: kk.province,
        municipality: kk.municipality,
        barangay: kk.barangay,
        purok: kk.purok,
      }
    : null;
  return profileObj;
};

// Get all profiles (optionally filter by cycleId)
exports.getAllProfiles = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      sexAssignedAtBirth,
      lgbtqClassification,
      purok, // if you want to allow filtering by purok from KK info
    } = req.query;
    let cycleDoc = null;
    let filter = {};

    // 1. If all=true, return all cycles (optionally filter by fields)
    if (all === "true") {
      if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
      if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;
      const profiles = await LGBTQProfile.find(filter)
        .populate("formCycle")
        .populate("user", "username email");
      // Optionally filter by purok from KK info
      if (purok) {
        const attachKKInfo = async (profile) => {
          const kk = await KKProfile.findOne({ user: profile.user });
          return { ...profile.toObject(), kkInfo: kk };
        };
        const enriched = await Promise.all(profiles.map(attachKKInfo));
        return res.json(
          enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
        );
      }
      return res.json(profiles);
    }

    // 2. If year & cycle specified, use that cycle
    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "LGBTQIA+ Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      // 3. Otherwise, use present (open) cycle
      try {
        cycleDoc = await getPresentCycle("LGBTQIA+ Profiling");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
    if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;

    const profiles = await LGBTQProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email");

    // Optionally filter by purok from KK info
    if (purok) {
      const attachKKInfo = async (profile) => {
        const kk = await KKProfile.findOne({ user: profile.user });
        return { ...profile.toObject(), kkInfo: kk };
      };
      const enriched = await Promise.all(profiles.map(attachKKInfo));
      return res.json(
        enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
      );
    }

    res.json(profiles);
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id).populate(
      "user",
      "username email"
    );
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const enriched = await attachKKInfo(profile);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get my profile for current cycle
exports.getMyProfile = async (req, res) => {
  try {
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });
    const profile = await LGBTQProfile.findOne({
      user: req.user.id,
      formCycle: formStatus?.cycleId, // FIXED
    }).populate("user", "username email");

    if (!profile)
      return res.status(404).json({ error: "No profile found for this cycle" });
    const enriched = await attachKKInfo(profile);
    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update a profile
exports.updateProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (profile.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to update this profile" });
    }

    if (req.body.sexAssignedAtBirth)
      profile.sexAssignedAtBirth = req.body.sexAssignedAtBirth;
    if (req.body.lgbtqClassification)
      profile.lgbtqClassification = req.body.lgbtqClassification;
    if (req.file) profile.idImage = req.file.path;

    await profile.save();
    res.json({ message: "Profile updated", profile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a profile
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    await profile.deleteOne();
    res.json({ message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Export profiles (optionally filter by cycleId)
exports.exportProfilesToExcel = async (req, res) => {
  try {
    const { cycleId } = req.query;
    const query = cycleId ? { formCycle: cycleId } : {}; // FIXED
    const profiles = await LGBTQProfile.find(query).populate(
      "user",
      "username email"
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("LGBTQIA+ Profiling");

    sheet.columns = [
      { header: "User", key: "username" },
      { header: "Email", key: "email" },
      { header: "Cycle ID", key: "cycleId" },
      { header: "Sex Assigned at Birth", key: "sexAssignedAtBirth" },
      { header: "LGBTQ Classification", key: "lgbtqClassification" },
      { header: "Lastname", key: "lastname" },
      { header: "Firstname", key: "firstname" },
      { header: "Age", key: "age" },
      { header: "Gender", key: "gender" },
    ];

    for (const profile of profiles) {
      const kk = await KKProfile.findOne({ user: profile.user._id });
      sheet.addRow({
        username: profile.user.username,
        email: profile.user.email,
        cycleId: profile.formCycle, // FIXED
        sexAssignedAtBirth: profile.sexAssignedAtBirth,
        lgbtqClassification: profile.lgbtqClassification,
        lastname: kk?.lastname,
        firstname: kk?.firstname,
        age: kk?.age,
        gender: kk?.gender,
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lgbtq_profiles.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: "Failed to export to Excel" });
  }
};

// Filter profiles by cycle number and year
// Filter profiles by cycle number and year
exports.filterProfilesByCycle = async (req, res) => {
  try {
    const { cycleNumber, year } = req.query;

    // Validate inputs
    if (!cycleNumber || !year) {
      return res
        .status(400)
        .json({ error: "cycleNumber and year are required" });
    }

    // Find the cycle for LGBTQIA+ Profiling
    const cycle = await FormCycle.findOne({
      formName: "LGBTQIA+ Profiling",
      cycleNumber: Number(cycleNumber),
      year: Number(year),
    });

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    // Find all profiles that match the cycle
    const profiles = await LGBTQProfile.find({ formCycle: cycle._id }).populate(
      "user",
      "username email"
    );

    // Enrich with KK Info
    const enriched = await Promise.all(profiles.map(attachKKInfo));

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error filtering profiles by cycle:", error);
    res.status(500).json({ error: "Server error while filtering profiles" });
  }
};

async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) {
    throw new Error("No active form cycle");
  }
  return status.cycleId;
}