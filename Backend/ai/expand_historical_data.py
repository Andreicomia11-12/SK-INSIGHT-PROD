import pandas as pd
import numpy as np

# Load your cleaned data
df = pd.read_csv("ai/putingbato_west_data_cleaned.csv")

# Add cycle and year for current data
df["cycle"] = 1
df["year"] = 2024

years = [2021, 2022, 2023, 2024]
cycles = [1, 2]

synthetic_rows = []

for year in years:
    for cycle in cycles:
        # Simulate plausible trends:
        # - Working Youth increases slightly each year
        # - Out of School Youth spikes in 2022 cycle 2 (simulate an event)
        # - In School Youth decreases slightly over time
        # - YSN stays low but random

        working_frac = 0.18 + 0.04 * (year - 2021)
        out_frac = 0.12 + (0.10 if year == 2022 and cycle == 2 else 0.02 * (cycle - 1))
        in_frac = max(0.5 - 0.03 * (year - 2021), 0.3)
        ysn_frac = 0.08 + np.random.uniform(-0.02, 0.02)

        # Normalize fractions if needed
        total_frac = working_frac + out_frac + in_frac + ysn_frac
        working_frac /= total_frac
        out_frac /= total_frac
        in_frac /= total_frac
        ysn_frac /= total_frac

        # Sample rows for each class (avoid duplicates by sampling without replacement if possible)
        def sample_class(class_name, frac):
            class_rows = df[df["YOUTH_CLASSIFICATION"] == class_name]
            n = max(1, int(len(df) * frac))
            replace = n > len(class_rows)
            return class_rows.sample(n=n, replace=replace, random_state=year*10+cycle)

        working = sample_class("Working Youth", working_frac)
        out_school = sample_class("Out of School Youth", out_frac)
        in_school = sample_class("In School Youth", in_frac)
        ysn = sample_class("YSN", ysn_frac)

        sampled = pd.concat([working, out_school, in_school, ysn], ignore_index=True)
        sampled = sampled.copy()

        # Add realistic noise to ages, shuffle work status and education
        sampled["AGE"] = sampled["AGE"].apply(lambda x: max(12, min(30, int(x) + np.random.randint(-3, 4))))
        sampled["WORK_STATUS"] = sampled["WORK_STATUS"].sample(frac=1, random_state=cycle*year).values
        sampled["EDUCATIONAL_BACKGROUND"] = sampled["EDUCATIONAL_BACKGROUND"].sample(frac=1, random_state=cycle*year+1).values
        sampled["cycle"] = cycle
        sampled["year"] = year

        synthetic_rows.append(sampled)

# Combine all data (including current cycle 1, year 2024)
expanded_df = pd.concat(synthetic_rows + [df], ignore_index=True)

# Shuffle the expanded data for realism
expanded_df = expanded_df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save expanded data
expanded_df.to_csv("ai/Putingbato_west_data_expanded.csv", index=False)
print("✅ More realistic historical data saved as ai/Putingbato_west_data_expanded.csv")