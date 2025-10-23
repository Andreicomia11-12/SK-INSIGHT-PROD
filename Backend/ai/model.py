import sys, json, joblib
import pandas as pd

# Load trained model + encoders
model = joblib.load("ai/trained_model.pkl")
encoders = joblib.load("ai/label_encoders.pkl")

# Read input JSON from Node
data = json.loads(sys.stdin.read())
features = data["features"]

# Encode incoming data
for key in features:
    if key in encoders:
        features[key] = encoders[key].transform([features[key]])[0]

# Convert to DataFrame
X = pd.DataFrame([features])

# Predict
pred = model.predict(X)[0]

# Decode prediction back to text
pred_label = encoders["youthClassification"].inverse_transform([pred])[0]

# Return JSON to Node.js
print(json.dumps({"prediction": pred_label}))
