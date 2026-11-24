import json
import sys
from pathlib import Path
import re
import numpy as np
import pyarrow.parquet as pq
import pandas as pd

DATA_ROOT = Path('d:/Projects/lila-player-journey/raw_data/player_data')

# Map configuration from README
MAP_CONFIG = {
    'AmbroseValley': {'scale': 900, 'origin_x': -370, 'origin_z': -473},
    'GrandRift': {'scale': 581, 'origin_x': -290, 'origin_z': -290},
    'Lockdown': {'scale': 1000, 'origin_x': -500, 'origin_z': -500},
}

# Regex for UUID detection
UUID_RE = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

# Accumulators
total_files = 0
total_rows = 0
match_ids = set()
user_ids_human = set()
user_ids_bot = set()
map_file_counts = {}
map_row_counts = {}
event_counts = {}
# For timestamp analysis per match
match_ts = {}
# For per‑player Position timestamps (first human per match)
match_player_position_ts = {}
# For coordinate mapping stats
coord_stats = {
    map_name: {
        'px_vals': [],
        'py_vals': [],
        'out_of_bounds': 0,
        'null_coords': 0,
    } for map_name in MAP_CONFIG
}
# For players per match
match_players = {}
match_players_by_type = {}
# Track which date folder each match_id appears in
match_folders = {}

# Gather all .nakama-0 files under February_* directories
files = list(DATA_ROOT.glob('February_*/**/*.nakama-0'))

for f in files:
    try:
        table = pq.read_table(str(f))
    except Exception as e:
        # Skip unreadable files
        continue
    df = table.to_pandas()
    total_files += 1
    rows = len(df)
    total_rows += rows

    # Update map file/row counts
    for map_id in df['map_id'].unique():
        map_file_counts[map_id] = map_file_counts.get(map_id, 0) + 1
        map_row_counts[map_id] = map_row_counts.get(map_id, 0) + df[df['map_id'] == map_id].shape[0]

    # Process match IDs
    for mid in df['match_id'].unique():
        match_ids.add(mid)
        # Folder tracking
        folder = f.parent.parent.name  # e.g., February_10
        match_folders.setdefault(mid, set()).add(folder)
        # Players per match
        match_players.setdefault(mid, set()).update(df['user_id'].unique())
        # Separate human/bot per match
        human_set = {uid for uid in df['user_id'] if UUID_RE.match(str(uid))}
        bot_set = {uid for uid in df['user_id'] if not UUID_RE.match(str(uid))}
        match_players_by_type.setdefault(mid, {'human': set(), 'bot': set()})['human'].update(human_set)
        match_players_by_type[mid]['bot'].update(bot_set)

    # User ID classification (global)
    for uid in df['user_id']:
        if UUID_RE.match(str(uid)):
            user_ids_human.add(uid)
        else:
            user_ids_bot.add(uid)

    # Event counts (decode bytes to string)
    for ev in df['event']:
        if isinstance(ev, bytes):
            ev_str = ev.decode('utf-8', errors='ignore')
        else:
            ev_str = str(ev)
        event_counts[ev_str] = event_counts.get(ev_str, 0) + 1

    # Timestamp collection per match (convert to raw ms integers)
    for mid, group in df.groupby('match_id'):
        # Convert timestamps to integer milliseconds (pandas stores ns)
        if np.issubdtype(group['ts'].dtype, np.datetime64):
            ts_int = group['ts'].astype('int64') // 1_000_000
        else:
            ts_int = pd.to_numeric(group['ts'], errors='coerce').fillna(0).astype('int64')
        match_ts.setdefault(mid, []).extend(ts_int.tolist())
        # For Position delta: pick first human user in this match (if any)
        human_users = [uid for uid in group['user_id'] if UUID_RE.match(str(uid))]
        if human_users:
            first_human = human_users[0]
            pos_mask = (group['user_id'] == first_human) & (group['event'] == b'Position')
            if pos_mask.any():
                match_player_position_ts.setdefault(mid, []).extend(ts_int[pos_mask].tolist())

    # Coordinate mapping per map
    for map_name, config in MAP_CONFIG.items():
        mask = df['map_id'] == map_name
        sub = df[mask]
        if sub.empty:
            continue
        # Null check
        null_mask = sub[['x', 'z']].isnull().any(axis=1)
        coord_stats[map_name]['null_coords'] += null_mask.sum()
        # Compute pixel coordinates
        x = sub.loc[~null_mask, 'x'].astype(float)
        z = sub.loc[~null_mask, 'z'].astype(float)
        u = (x - config['origin_x']) / config['scale']
        v = (z - config['origin_z']) / config['scale']
        px = u * 1024
        py = (1 - v) * 1024
        coord_stats[map_name]['px_vals'].extend(px.tolist())
        coord_stats[map_name]['py_vals'].extend(py.tolist())
        # Out‑of‑bounds count
        oob = ((px < 0) | (px > 1024) | (py < 0) | (py > 1024)).sum()
        coord_stats[map_name]['out_of_bounds'] += int(oob)

# Prepare final report
report = {
    'total_files_read': total_files,
    'total_rows': total_rows,
    'unique_match_id_count': len(match_ids),
    'unique_user_id_counts': {
        'human': len(user_ids_human),
        'bot': len(user_ids_bot),
    },
    'file_counts_per_map': map_file_counts,
    'row_counts_per_map': map_row_counts,
    'event_counts': event_counts,
    'timestamp_analysis': {},
    'coordinate_bounds': {},
    'match_id_multiple_folders': [],
    'players_per_match_stats': {},
}

# Timestamp verification – sample three matches (sorted)
sample_matches = sorted(list(match_ids))[:3]
for mid in sample_matches:
    ts_vals = np.array(match_ts.get(mid, []))
    if ts_vals.size == 0:
        continue
    min_ts = int(ts_vals.min())
    max_ts = int(ts_vals.max())
    duration = int(max_ts - min_ts)
    # Median delta for Position events of first human player
    pos_ts = np.array(match_player_position_ts.get(mid, []))
    median_delta = None
    if pos_ts.size >= 2:
        diffs = np.diff(np.sort(pos_ts))
        median_delta = int(np.median(diffs))
    report['timestamp_analysis'][mid] = {
        'min_ts': min_ts,
        'max_ts': max_ts,
        'duration_raw_units': duration,
        'median_position_delta_raw': median_delta,
    }

# Coordinate bounds per map
for map_name, stats in coord_stats.items():
    px_vals = np.array(stats['px_vals'])
    py_vals = np.array(stats['py_vals'])
    if px_vals.size == 0:
        continue
    report['coordinate_bounds'][map_name] = {
        'px_min': float(px_vals.min()),
        'px_max': float(px_vals.max()),
        'py_min': float(py_vals.min()),
        'py_max': float(py_vals.max()),
        'out_of_bounds_rows': stats['out_of_bounds'],
        'null_coordinate_rows': stats['null_coords'],
    }

# Matches appearing in multiple February_* folders
multi_folder_matches = [mid for mid, folders in match_folders.items() if len(folders) > 1]
report['match_id_multiple_folders'] = multi_folder_matches

# Players per match statistics
player_counts = []
human_counts = []
bot_counts = []
for mid, users in match_players.items():
    total = len(users)
    human = len(match_players_by_type[mid]['human'])
    bot = len(match_players_by_type[mid]['bot'])
    player_counts.append(total)
    human_counts.append(human)
    bot_counts.append(bot)

if player_counts:
    report['players_per_match_stats'] = {
        'total_players': {
            'min': int(min(player_counts)),
            'median': int(np.median(player_counts)),
            'max': int(max(player_counts)),
        },
        'human_players': {
            'min': int(min(human_counts)),
            'median': int(np.median(human_counts)),
            'max': int(max(human_counts)),
        },
        'bot_players': {
            'min': int(min(bot_counts)),
            'median': int(np.median(bot_counts)),
            'max': int(max(bot_counts)),
        },
    }

print(json.dumps(report, indent=2, default=str))
