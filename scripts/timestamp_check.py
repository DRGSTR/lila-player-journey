import json
import sys
from pathlib import Path
import re
import numpy as np
import pyarrow.parquet as pq
import pandas as pd
import os

# Ensure output directory exists
OUTPUT_DIR = Path('d:/Projects/lila-player-journey/scripts/timestamp_reports')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DATA_ROOT = Path('d:/Projects/lila-player-journey/raw_data/player_data')

# Gather all .nakama-0 files under February_* folders
files = list(DATA_ROOT.glob('February_*/**/*.nakama-0'))
match_row_counts = {}
match_ts_raw = {}
for f in files:
    try:
        table = pq.read_table(str(f))
    except Exception:
        continue
    df = table.to_pandas()
    for mid, grp in df.groupby('match_id'):
        cnt = len(grp)
        match_row_counts[mid] = match_row_counts.get(mid, 0) + cnt
        raw_ts = grp['ts'].astype('int64').tolist()
        match_ts_raw.setdefault(mid, []).extend(raw_ts)
# Select top 3 matches by row count
top3 = sorted(match_row_counts.items(), key=lambda x: x[1], reverse=True)[:3]
report = {}
for mid, cnt in top3:
    ts_vals = np.array(match_ts_raw[mid], dtype=np.int64)
    report[mid] = {
        'row_count': int(cnt),
        'min_ts': int(ts_vals.min()),
        'max_ts': int(ts_vals.max()),
        'duration_raw_ms': int(ts_vals.max() - ts_vals.min()),
        'duration_sec': round((ts_vals.max() - ts_vals.min()) / 1000, 3)
    }
    # Write full list of raw timestamps to separate JSON for reference
    ts_path = OUTPUT_DIR / f"{mid.replace('.nakama-0', '')}_ts.json"
    with ts_path.open('w', encoding='utf-8') as fp:
        json.dump(list(ts_vals.tolist()), fp)
print(json.dumps(report, indent=2))