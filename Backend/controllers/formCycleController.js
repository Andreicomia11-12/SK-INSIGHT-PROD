const FormCycle = require("../models/FormCycle");

// Get all KK Profiling cycles
exports.getKkCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({ formName: "KK Profiling" }).sort({
      year: 1,
      cycleNumber: 1,
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch KK cycles" });
  }
};

// Get all LGBTQ Profiling cycles
exports.getLgbtqCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({
      formName: "LGBTQIA+ Profiling",
    }).sort({
      year: 1,
      cycleNumber: 1,
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch LGBTQ cycles" });
  }
};

// Get all Educational Assistance cycles
exports.getEducCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({
      formName: "Educational Assistance",
    }).sort({ year: 1, cycleNumber: 1 });
    res.json(cycles);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch Educational Assistance cycles" });
  }
};

// Get status of a form for users using FormCycle
exports.getFormStatus = async (req, res) => {
  try {
    const { formName } = req.query;
    if (!formName) {
      return res.status(400).json({ error: "formName is required" });
    }
    // Find the latest (active) cycle for the given form
    const cycle = await FormCycle.findOne({ formName })
      .sort({ year: -1, cycleNumber: -1 });
    if (!cycle) {
      return res.status(404).json({ error: "No cycle found for this form" });
    }
    res.json({
      formName: cycle.formName,
      isOpen: cycle.isOpen,
      cycleId: cycle._id,
      year: cycle.year,
      cycleNumber: cycle.cycleNumber
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch form status" });
  }
};
