import json
import os
from pathlib import Path
import re
import numpy as np
import pyarrow.parquet as pq
import pandas as pd
from PIL import Image

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = PROJECT_ROOT / 'raw_data' / 'player_data'
MINIMAP_SRC = DATA_ROOT / 'minimaps'
PUBLIC_ROOT = PROJECT_ROOT / 'public'
PUBLIC_MINIMAPS = PUBLIC_ROOT / 'minimaps'
PUBLIC_DATA = PUBLIC_ROOT / 'data'
MATCHES_DIR = PUBLIC_DATA / 'matches'
HEATMAPS_DIR = PUBLIC_DATA / 'heatmaps'

PUBLIC_MINIMAPS.mkdir(parents=True, exist_ok=True)
PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
MATCHES_DIR.mkdir(parents=True, exist_ok=True)
HEATMAPS_DIR.mkdir(parents=True, exist_ok=True)

# 1. Process minimap images (resize to 2048x2048 WebP)
minimap_mappings = {
    'AmbroseValley': 'AmbroseValley_Minimap.png',
    'GrandRift': 'GrandRift_Minimap.png',
    'Lockdown': 'Lockdown_Minimap.jpg',
}

print("Converting and resizing minimaps to 2048x2048 WebP...")
for map_id, src_filename in minimap_mappings.items():
    src_path = MINIMAP_SRC / src_filename
    if not src_path.exists():
        raise FileNotFoundError(f"Minimap source file not found: {src_path}")
    im = Image.open(src_path)
    im_resized = im.resize((2048, 2048), Image.Resampling.LANCZOS)
    out_path = PUBLIC_MINIMAPS / f"{map_id}.webp"
    im_resized.save(out_path, format='WEBP', quality=88)
    print(f"Saved {out_path.name} ({out_path.stat().st_size / 1024:.1f} KB)")

# Remove any other files in public/minimaps
valid_names = {f"{k}.webp" for k in minimap_mappings}
for f in PUBLIC_MINIMAPS.iterdir():
    if f.is_file() and f.name not in valid_names:
        f.unlink()
        print(f"Removed unexpected file: {f.name}")

# Map config from README
MAP_CONFIG = {
    'AmbroseValley': {'scale': 900, 'origin_x': -370, 'origin_z': -473},
    'GrandRift': {'scale': 581, 'origin_x': -290, 'origin_z': -290},
    'Lockdown': {'scale': 1000, 'origin_x': -500, 'origin_z': -500},
}

def world_to_pixel(x, z, cfg):
    u = (x - cfg['origin_x']) / cfg['scale']
    v = (z - cfg['origin_z']) / cfg['scale']
    px = round(u * 1024.0, 1)
    py = round((1.0 - v) * 1024.0, 1)
    return px, py

UUID_RE = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

def is_bot_user(uid):
    uid_str = str(uid)
    return uid_str.isdigit() or not bool(UUID_RE.match(uid_str))

# Aggregation structures
match_frames = {}

print("Reading Parquet files...")
all_files = list(DATA_ROOT.glob('February_*/**/*.nakama-0'))
print(f"Found {len(all_files)} total files.")

for f in all_files:
    try:
        table = pq.read_table(str(f))
        df = table.to_pandas()
    except Exception as e:
        print(f"Warning: Failed reading {f}: {e}")
        continue
    
    # Determine date from path
    date_str = '2026-02-10'
    for part in f.parts:
        if part.startswith('February_'):
            day_num = part.split('_')[1]
            date_str = f"2026-02-{int(day_num):02d}"
            break
            
    df['file_date'] = date_str
    
    # Standardize raw timestamp to int64 (raw Unix seconds stored in timestamp[ms])
    df['ts_raw'] = df['ts'].astype('int64')
        
    for mid, grp in df.groupby('match_id'):
        match_frames.setdefault(mid, []).append(grp)

print(f"Grouped into {len(match_frames)} unique matches. Processing...")

manifest_matches = []
heatmaps = {m: {} for m in MAP_CONFIG}

for mid, grp_list in match_frames.items():
    match_df = pd.concat(grp_list, ignore_index=True)
    clean_mid = mid.replace('.nakama-0', '')
    
    # Sort chronologically
    match_df = match_df.sort_values('ts_raw').reset_index(drop=True)
    
    map_id = match_df['map_id'].iloc[0]
    if isinstance(map_id, bytes):
        map_id = map_id.decode('utf-8')
    cfg = MAP_CONFIG[map_id]
    
    date_str = match_df['file_date'].iloc[0]
    
    # Normalized timestamp: seconds elapsed since earliest event in match
    min_ts = int(match_df['ts_raw'].min())
    max_ts = int(match_df['ts_raw'].max())
    duration_sec = round(float(max_ts - min_ts), 2)
    match_df['t_sec'] = (match_df['ts_raw'] - min_ts).astype(float).round(2)
    
    # Precompute pixel coordinates
    px_list, py_list = [], []
    for x_val, z_val in zip(match_df['x'].astype(float), match_df['z'].astype(float)):
        px, py = world_to_pixel(x_val, z_val, cfg)
        px_list.append(px)
        py_list.append(py)
    match_df['px'] = px_list
    match_df['py'] = py_list
    
    # Decode event strings
    decoded_events = []
    for ev in match_df['event']:
        if isinstance(ev, (bytes, bytearray)):
            decoded_events.append(ev.decode('utf-8'))
        else:
            decoded_events.append(str(ev))
    match_df['event_str'] = decoded_events
    
    # Players
    players_data = []
    humans_count = 0
    bots_count = 0
    
    for uid, p_grp in match_df.groupby('user_id', sort=False):
        uid_str = str(uid)
        bot_flag = is_bot_user(uid_str)
        if bot_flag:
            bots_count += 1
        else:
            humans_count += 1
            
        p_path = [[round(float(r.t_sec), 2), r.px, r.py] for r in p_grp.itertuples()]
        players_data.append({
            'id': uid_str,
            'is_bot': bot_flag,
            'path': p_path
        })
        
        # Heatmap traffic
        date_hm = heatmaps[map_id].setdefault(date_str, {
            'human_traffic': [],
            'bot_traffic': [],
            'kills': [],
            'deaths': [],
            'storm': [],
            'loot': []
        })
        coords = [[r.px, r.py] for r in p_grp.itertuples()]
        if bot_flag:
            date_hm['bot_traffic'].extend(coords)
        else:
            date_hm['human_traffic'].extend(coords)
            
    # Non-movement events
    non_move = match_df[~match_df['event_str'].isin(['Position', 'BotPosition'])]
    events_data = []
    date_hm = heatmaps[map_id].setdefault(date_str, {
        'human_traffic': [],
        'bot_traffic': [],
        'kills': [],
        'deaths': [],
        'storm': [],
        'loot': []
    })
    
    kill_count = 0
    death_count = 0
    storm_deaths = 0
    
    for r in non_move.itertuples():
        ev_type = r.event_str
        uid_str = str(r.user_id)
        bot_flag = is_bot_user(uid_str)
        
        events_data.append({
            't': round(float(r.t_sec), 2),
            'px': r.px,
            'py': r.py,
            'type': ev_type,
            'user_id': uid_str,
            'is_bot': bot_flag
        })
        
        pt = [r.px, r.py]
        if ev_type in ('Kill', 'BotKill'):
            kill_count += 1
            date_hm['kills'].append(pt)
        elif ev_type in ('Killed', 'BotKilled'):
            death_count += 1
            date_hm['deaths'].append(pt)
        elif ev_type == 'KilledByStorm':
            death_count += 1
            storm_deaths += 1
            date_hm['storm'].append(pt)
        elif ev_type == 'Loot':
            date_hm['loot'].append(pt)

    # Save individual match JSON
    match_payload = {
        'match_id': clean_mid,
        'map_id': map_id,
        'date': date_str,
        'duration_sec': duration_sec,
        'players': players_data,
        'events': events_data
    }
    with open(MATCHES_DIR / f"{clean_mid}.json", 'w', encoding='utf-8') as mf:
        json.dump(match_payload, mf, separators=(',', ':'))
        
    manifest_matches.append({
        'match_id': clean_mid,
        'map_id': map_id,
        'date': date_str,
        'human_count': humans_count,
        'bot_count': bots_count,
        'event_count': int(len(match_df)),
        'duration_sec': duration_sec,
        'kill_count': kill_count,
        'death_count': death_count,
        'storm_deaths': storm_deaths
    })

# Sort manifest by event_count descending
manifest_matches.sort(key=lambda x: x['event_count'], reverse=True)
manifest = {
    'maps': list(MAP_CONFIG.keys()),
    'matches': manifest_matches
}

with open(PUBLIC_DATA / 'manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

for map_id, date_dict in heatmaps.items():
    with open(HEATMAPS_DIR / f"{map_id}.json", 'w', encoding='utf-8') as hf:
        json.dump(date_dict, hf, separators=(',', ':'))

total_size_mb = sum(p.stat().st_size for p in PUBLIC_DATA.rglob('*') if p.is_file()) / (1024 * 1024)
print(f"ETL completed successfully.")
print(f"Total matches written: {len(manifest_matches)}")
print(f"Top match durations (sec): {[m['duration_sec'] for m in manifest_matches[:5]]}")
print(f"Public data size: {total_size_mb:.2f} MB")
