import pandas as pd
import re

# 1. Find the header row (the first row containing 'AGE')
with open("ai/Putingbato_west_data.csv", encoding="utf-8") as f:
    lines = f.readlines()
header_idx = None
for i, line in enumerate(lines):
    if "AGE" in line:
        header_idx = i
        break
if header_idx is None:
    raise Exception("Header row with 'AGE' not found!")

# 2. Load the CSV from the correct header row
df = pd.read_csv("ai/Putingbato_west_data.csv", skiprows=header_idx, dtype=str)

# 3. Clean column names
df.columns = [col.strip().replace('\n', ' ').replace('\r', '').replace('"', '').replace("'", '').replace('  ', ' ').replace(' ', '_').upper() for col in df.columns]

# 4. Drop extra unnamed columns
df = df.loc[:, ~df.columns.str.contains('^UNNAMED')]

# 5. Drop empty rows
df = df.dropna(how='all')

# 6. Remove rows where AGE is missing or not a number
df = df[pd.to_numeric(df['AGE'], errors='coerce').notnull()]
df['AGE'] = df['AGE'].astype(int)
df = df[(df['AGE'] >= 12) & (df['AGE'] <= 30)]  # Keep only valid youth ages

# 7. Map abbreviations in YOUTH_CLASSIFICATION
def map_classification(val):
    if pd.isna(val):
        return ""
    val = val.strip().upper()
    # Summarize all special needs as "YSN"
    if any(x in val for x in ["PWD", "IP", "CCL", "YSN", "PWD/IP"]):
        return "YSN"
    mapping = {
        "WY": "Working Youth",
        "ISY": "In School Youth",
        "OSY": "Out of School Youth"
    }
    # Handle combinations like "PWD/IP"
    parts = [mapping.get(part.strip(), part.strip()) for part in re.split(r'[/,()]', val) if part.strip()]
    # If any part is YSN, return "YSN"
    if any(p == "YSN" for p in parts):
        return "YSN"
    return "/".join(parts)

df['YOUTH_CLASSIFICATION'] = df['YOUTH_CLASSIFICATION'].apply(map_classification)

# 8. Standardize YOUTH_AGE_GROUP
def clean_age_group(val):
    if pd.isna(val):
        return ""
    val = val.replace('\n', ' ').replace('\r', '').strip().upper()
    if "CHILD" in val:
        return "Child Youth"
    elif "CORE" in val:
        return "Core Youth"
    elif "YOUNG" in val:
        return "Young Adult"
    else:
        return val.title()

df['YOUTH_AGE_GROUP'] = df['YOUTH_AGE_GROUP'].apply(clean_age_group)

# 9. Clean other fields
for col in ['EDUCATIONAL_BACKGROUND', 'WORK_STATUS', 'CIVIL_STATUS']:
    df[col] = df[col].astype(str).str.strip().str.title()

# 10. Remove rows with missing essential data
df = df[df['YOUTH_CLASSIFICATION'] != ""]

# 11. Save cleaned data
df.to_csv("ai/Putingbato_west_data_cleaned.csv", index=False)
print("✅ Cleaned data saved as ai/Putingbato_west_data_cleaned.csv")