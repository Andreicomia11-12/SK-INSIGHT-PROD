import sys, json, joblib
import pandas as pd
import numpy as np

models = joblib.load("ai/cycle_predictor_models.pkl")
target_labels = ["In School Youth", "Out of School Youth", "Working Youth", "YSN"]

# Read input JSON: { "year": 2025, "cycle": 2 }
if sys.stdin.isatty():
    data = {"year": 2025, "cycle": 2}
else:
    data = json.loads(sys.stdin.read())

year = int(data["year"])
cycle = int(data["cycle"])

# Prepare input features
X = pd.DataFrame([{"year": year, "cycle": cycle}])

predictions = {}
for cls in target_labels:
    pred = int(round(models[cls].predict(X)[0]))
    # Optionally, add a small random noise for realism (±2%)
    if cls != "YSN":
        pred = int(pred + np.random.uniform(-0.02, 0.02) * pred)
    else:
        pred = int(pred + np.random.uniform(-0.05, 0.05) * pred)  # YSN can have a bit more noise
    predictions[cls] = max(0, pred)  # Ensure no negative predictions

# Generate suggestions
suggestions = []
if predictions["Out of School Youth"] > predictions["In School Youth"]:
    suggestions.append("Scholarship programs recommended (high Out of School Youth).")
if predictions["Working Youth"] > 0:
    suggestions.append("Livelihood projects recommended (many Working Youth).")
if predictions["YSN"] > 0:
    suggestions.append("Inclusive programs for Youth with Specific Needs.")

print(json.dumps({
    "predictions": predictions,
    "suggestions": suggestions
}))