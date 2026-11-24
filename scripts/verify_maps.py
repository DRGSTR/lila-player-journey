import os
from pathlib import Path
import re
import numpy as np
import pyarrow.parquet as pq
import pandas as pd
from PIL import Image

os.environ['MPLCONFIGDIR'] = os.path.join(os.getcwd(), 'mplconfig')
os.makedirs(os.environ['MPLCONFIGDIR'], exist_ok=True)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_ROOT = PROJECT_ROOT / 'raw_data' / 'player_data'
PUBLIC_MINIMAP_ROOT = PROJECT_ROOT / 'public' / 'minimaps'
OUTPUT_ROOT = PROJECT_ROOT / 'scripts'

MAP_CONFIG = {
    'AmbroseValley': {'scale': 900, 'origin_x': -370, 'origin_z': -473},
    'GrandRift': {'scale': 581, 'origin_x': -290, 'origin_z': -290},
    'Lockdown': {'scale': 1000, 'origin_x': -500, 'origin_z': -500},
}

def world_to_pixel(x, z, cfg):
    u = (x - cfg['origin_x']) / cfg['scale']
    v = (z - cfg['origin_z']) / cfg['scale']
    px = u * 1024.0
    py = (1.0 - v) * 1024.0
    return px, py

print("Finding top 5 matches per map...")
all_files = list(DATA_ROOT.glob('February_*/**/*.nakama-0'))
match_counts = {}
match_map = {}

for f in all_files:
    try:
        table = pq.read_table(str(f), columns=['match_id', 'map_id'])
        df = table.to_pandas()
    except Exception:
        continue
    for mid, grp in df.groupby('match_id'):
        cnt = len(grp)
        match_counts[mid] = match_counts.get(mid, 0) + cnt
        if mid not in match_map:
            m_id = grp['map_id'].iloc[0]
            if isinstance(m_id, bytes):
                m_id = m_id.decode('utf-8')
            match_map[mid] = m_id

top_matches_per_map = {}
for map_id in MAP_CONFIG:
    mids = [mid for mid, m in match_map.items() if m == map_id]
    sorted_mids = sorted(mids, key=lambda m: match_counts.get(m, 0), reverse=True)[:5]
    top_matches_per_map[map_id] = sorted_mids
    print(f"Top 5 matches for {map_id}: {[m[:8] for m in sorted_mids]}")

# Collect match data for the top matches
top_mids_all = set()
for mids in top_matches_per_map.values():
    top_mids_all.update(mids)

match_coords = {mid: {'px': [], 'py': []} for mid in top_mids_all}

print("Reading coordinates for top matches...")
for f in all_files:
    try:
        table = pq.read_table(str(f), columns=['match_id', 'map_id', 'x', 'z'])
        df = table.to_pandas()
    except Exception:
        continue
    for mid, grp in df.groupby('match_id'):
        if mid in top_mids_all:
            m_id = match_map[mid]
            cfg = MAP_CONFIG[m_id]
            for x, z in zip(grp['x'].astype(float), grp['z'].astype(float)):
                px, py = world_to_pixel(x, z, cfg)
                match_coords[mid]['px'].append(px)
                match_coords[mid]['py'].append(py)

# Plot each map
print("Generating verification plots...")
cmap = plt.get_cmap('tab10')

for map_id, matches in top_matches_per_map.items():
    img_path = PUBLIC_MINIMAP_ROOT / f"{map_id}.webp"
    if not img_path.exists():
        raise FileNotFoundError(f"Missing resized minimap at {img_path}")
    img = Image.open(img_path)
    
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.imshow(img, extent=[0, 1024, 1024, 0])
    
    for idx, mid in enumerate(matches):
        px = match_coords[mid]['px']
        py = match_coords[mid]['py']
        ax.scatter(px, py, s=6, alpha=0.6, color=cmap(idx % 10), label=f"{mid[:8]} ({len(px)} pts)")
        
    ax.set_title(f"Top 5 Busiest Matches on {map_id} (0-1024 coord space)", fontsize=13)
    ax.set_xlim(0, 1024)
    ax.set_ylim(1024, 0)
    ax.legend(loc='upper right', fontsize='small', framealpha=0.8)
    
    out_path = OUTPUT_ROOT / f"verify_{map_id}.png"
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"Generated {out_path.name} ({out_path.stat().st_size / 1024:.1f} KB)")

print("Verification complete!")
