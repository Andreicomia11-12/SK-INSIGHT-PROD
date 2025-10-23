const Prediction = require("../models/Prediction");
const { spawn } = require("child_process");

exports.getOrCreatePrediction = async (req, res) => {
  const { year, cycle } = req.body;
  const formName = "KK Profiling"; // or get from req if needed

  // 1. Try to find existing prediction
  let prediction = await Prediction.findOne({ formName, year, cycleNumber: cycle });
  if (prediction) {
    return res.json({
      predictions: prediction.predictions,
      suggestions: prediction.suggestions
    });
  }

  // 2. If not found, generate new prediction
  // (your existing AI logic here)
  const py = spawn("python", ["ai/cycle_predict.py"]);
  let output = "";
  py.stdin.write(JSON.stringify({ year, cycle }));
  py.stdin.end();
  py.stdout.on("data", (data) => { output += data.toString(); });
  py.on("close", async () => {
    try {
      const result = JSON.parse(output);
      // Save to DB
      prediction = new Prediction({
        formName,
        year,
        cycleNumber: cycle,
        predictions: result.predictions,
        suggestions: result.suggestions
      });
      await prediction.save();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Prediction failed" });
    }
  });
};