import sys, json, joblib
import pandas as pd

models = joblib.load("ai/cycle_predictor_models.pkl")
target_labels = ["In School Youth", "Out of School Youth", "Working Youth", "YSN"]

# Read input JSON: { "year": 2025, "cycle": 2 }
if sys.stdin.isatty():
    # No stdin, use default test input
    data = {"year": 2025, "cycle": 2}
else:
    data = json.loads(sys.stdin.read())
year = int(data["year"])
cycle = int(data["cycle"])

X = pd.DataFrame([{"year": year, "cycle": cycle}])

predictions = {}
for cls in target_labels:
    pred = int(round(models[cls].predict(X)[0]))
    predictions[cls] = pred

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