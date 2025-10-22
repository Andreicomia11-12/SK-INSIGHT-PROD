import pandas as pd
import joblib
import numpy as np  # <-- Add this line
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split, KFold
import warnings
warnings.filterwarnings("ignore")

# Load expanded profiling data
df = pd.read_csv("ai/Putingbato_west_data_expanded.csv")

# Group by year, cycle, and classification
grouped = df.groupby(["year", "cycle", "YOUTH_CLASSIFICATION"]).size().reset_index(name="count")

# Pivot to wide format
pivot = grouped.pivot_table(index=["year", "cycle"], columns="YOUTH_CLASSIFICATION", values="count", fill_value=0)
pivot = pivot.reset_index()

# Features: year, cycle
X = pivot[["year", "cycle"]]
target_labels = ["In School Youth", "Out of School Youth", "Working Youth", "YSN"]
y = pivot.reindex(columns=target_labels, fill_value=0)

# Split cycles into train/test (e.g., 75% train, 25% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# Train a regressor for each classification and print accuracy metrics on test set
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

# Cross-validation accuracy metrics per classification
kf = KFold(n_splits=5, shuffle=True, random_state=42)
print("Cross-validation accuracy metrics per classification:")

for col in target_labels:
    maes = []
    r2s = []
    accs = []
    y_col = y[col].values
    for train_idx, test_idx in kf.split(X):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y_col[train_idx], y_col[test_idx]
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        mean_actual = y_test.mean()
        accuracy_pct = 100 - (mae / mean_actual * 100) if mean_actual != 0 else 0
        maes.append(mae)
        r2s.append(r2)
        accs.append(accuracy_pct)
    print(f"{col}: MAE={np.mean(maes):.2f}, R2={np.mean(r2s):.2f}, Accuracy={np.mean(accs):.2f}%")

# Save models trained on all data for future predictions
for col in target_labels:
    models[col].fit(X, y[col])
joblib.dump(models, "ai/cycle_predictor_models.pkl")
