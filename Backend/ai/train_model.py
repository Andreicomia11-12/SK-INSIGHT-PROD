import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# 1. Load expanded data
df = pd.read_csv("ai/Putingbato_west_data_expanded.csv")  # <-- use expanded data

# 2. Define features and target
feature_cols = [
    "AGE",
    "CIVIL_STATUS",
    "YOUTH_AGE_GROUP",
    "EDUCATIONAL_BACKGROUND",
    "WORK_STATUS"
]
target_col = "YOUTH_CLASSIFICATION"

X = df[feature_cols].copy()
y = df[target_col].copy()

# 3. Encode categorical features
encoders = {}
for col in X.columns:
    if X[col].dtype == "object":
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col])
        encoders[col] = le

# Encode target
le_target = LabelEncoder()
y = le_target.fit_transform(y)
encoders["youthClassification"] = le_target

# 4. Train/test split (optional, for validation)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 6. Evaluate accuracy
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model accuracy: {accuracy:.4f}")

# Optional: print classification report and confusion matrix
print("\nClassification Report:")
print(classification_report(
    y_test, y_pred,
    labels=range(len(le_target.classes_)),
    target_names=le_target.classes_,
    zero_division=0
))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# 7. Save model and encoders
joblib.dump(model, "ai/trained_model.pkl")
joblib.dump(encoders, "ai/label_encoders.pkl")

print("✅ Model and encoders trained and saved using expanded data.")