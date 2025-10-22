const { spawnSync } = require('child_process');

function runCyclePredict(year, cycle) {
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const args = ['ai/cycle_predict.py'];
    const inputStr = JSON.stringify({ year, cycle });

    const res = spawnSync(pythonCmd, args, {
        input: inputStr,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
    });

    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || `python exited with code ${res.status}`);

    return JSON.parse(res.stdout);
}

exports.predictCycle = (req, res) => {
    try {
        const { year, cycle } = req.body;
        if (!year || !cycle) return res.status(400).json({ error: "year and cycle required" });
        const result = runCyclePredict(year, cycle);
        res.json(result);
    } catch (err) {
        console.error("Cycle prediction error:", err);
        res.status(500).json({ error: err.message });
    }
};