import pandas as pd
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings("ignore")

# Load expanded profiling data
df = pd.read_csv("ai/Putingbato_west_data_expanded.csv")

# Targets: actual counts per class
grouped = df.groupby(["year", "cycle", "YOUTH_CLASSIFICATION"]).size().reset_index(name="count")
pivot = grouped.pivot_table(index=["year", "cycle"], columns="YOUTH_CLASSIFICATION", values="count", fill_value=0)
pivot = pivot.reset_index()
target_labels = ["In School Youth", "Out of School Youth", "Working Youth", "YSN"]

# Lessen YSN counts (e.g., scale down by 0.5)
if "YSN" in pivot.columns:
    pivot["YSN"] = (pivot["YSN"] * 0.5).astype(int)

# Features for training
X = pivot[["year", "cycle"]]
y = pivot[target_labels]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# Train a regressor for each classification
models = {}
print("Test set accuracy metrics per classification:")
for col in target_labels:
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train[col])
    models[col] = model
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test[col], y_pred)
    r2 = r2_score(y_test[col], y_pred)
    mean_actual = y_test[col].mean()
    accuracy_pct = 100 - (mae / mean_actual * 100) if mean_actual != 0 else 0
    print(f"{col}: MAE={mae:.2f}, R2={r2 if not pd.isna(r2) else 'N/A'}, Accuracy={accuracy_pct:.2f}%")

# Save models trained on all data for future predictions
for col in target_labels:
    models[col].fit(X, y[col])
joblib.dump(models, "ai/cycle_predictor_models.pkl")
