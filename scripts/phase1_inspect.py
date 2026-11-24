import os
import sys
import json
from pathlib import Path
import pyarrow.parquet as pq
import pandas as pd
from PIL import Image

def build_tree(root_path):
    tree = []
    for dirpath, dirnames, filenames in os.walk(root_path):
        rel = os.path.relpath(dirpath, root_path)
        indent = '' if rel == '.' else ('|   ' * (rel.count(os.sep) + 1))
        tree.append(f"{indent}{os.path.basename(dirpath)}/")
        for f in sorted(filenames):
            tree.append(f"{indent}|   {f}")
    return '\n'.join(tree)

def get_image_dimensions(image_path):
    with Image.open(image_path) as img:
        return img.width, img.height

def inspect_parquet_files(data_root):
    parquet_files = []
    for root, _, files in os.walk(data_root):
        for f in files:
            if f.endswith('.nakama-0') or not '.' in f:  # dataset has no extension
                # try opening as parquet
                full_path = os.path.join(root, f)
                try:
                    pq_table = pq.read_table(full_path, stop_rows=5)  # read small portion for schema
                    parquet_files.append(full_path)
                except Exception:
                    pass
    total_files = len(parquet_files)
    # date range from folder names
    dates = []
    for p in parquet_files:
        parts = Path(p).parts
        if 'player_data' in parts:
            idx = parts.index('player_data')
            if idx+1 < len(parts):
                date_part = parts[idx+1]
                if date_part.startswith('February'):
                    dates.append(date_part)
    date_range = (min(dates) if dates else None, max(dates) if dates else None)
    # collect maps
    maps = set()
    total_rows = 0
    column_info = None
    sample_rows = []
    byte_columns = {}
    user_id_patterns = set()
    timestamps = []
    coords = {}
    for fp in parquet_files:
        table = pq.read_table(fp)
        df = table.to_pandas()
        if column_info is None:
            column_info = [(c, str(df[c].dtype)) for c in df.columns]
        total_rows += len(df)
        # sample rows
        if len(sample_rows) < 5:
            sample_rows.extend(df.head(5 - len(sample_rows)).to_dict(orient='records'))
        # maps
        if 'map_id' in df.columns:
            maps.update(df['map_id'].unique())
        # byte columns decode unique values
        for col in df.columns:
            if df[col].dtype == object and isinstance(df[col].iloc[0], bytes):
                uniq = df[col].dropna().unique()
                decoded = [v.decode('utf-8', errors='ignore') for v in uniq]
                byte_columns[col] = decoded
        # user_id patterns
        if 'user_id' in df.columns:
            for uid in df['user_id'].unique():
                user_id_patterns.add(str(uid))
        # timestamps
        if 'ts' in df.columns:
            timestamps.extend(df['ts'].dropna().tolist())
        # coordinates per map
        if 'map_id' in df.columns and all(c in df.columns for c in ('x','y','z')):
            for map_name, grp in df.groupby('map_id'):
                stats = coords.setdefault(map_name, {'x': [], 'y': [], 'z': []})
                stats['x'].extend(grp['x'].dropna())
                stats['y'].extend(grp['y'].dropna())
                stats['z'].extend(grp['z'].dropna())
    # timestamp stats
    ts_min = min(timestamps) if timestamps else None
    ts_max = max(timestamps) if timestamps else None
    ts_duplicates = len(timestamps) != len(set(timestamps))
    # coordinate stats per map
    coord_stats = {}
    for map_name, vals in coords.items():
        import numpy as np
        arr_x = np.array(vals['x'], dtype=float)
        arr_y = np.array(vals['y'], dtype=float)
        arr_z = np.array(vals['z'], dtype=float)
        coord_stats[map_name] = {
            'x': {
                'min': float(arr_x.min()), 'max': float(arr_x.max()),
                'percentiles': {
                    '5': float(np.percentile(arr_x,5)),
                    '50': float(np.percentile(arr_x,50)),
                    '95': float(np.percentile(arr_x,95))
                }
            },
            'y': {
                'min': float(arr_y.min()), 'max': float(arr_y.max()),
                'percentiles': {
                    '5': float(np.percentile(arr_y,5)),
                    '50': float(np.percentile(arr_y,50)),
                    '95': float(np.percentile(arr_y,95))
                }
            },
            'z': {
                'min': float(arr_z.min()), 'max': float(arr_z.max()),
                'percentiles': {
                    '5': float(np.percentile(arr_z,5)),
                    '50': float(np.percentile(arr_z,50)),
                    '95': float(np.percentile(arr_z,95))
                }
            },
            'null_counts': {
                'x': int(pd.isna(vals['x']).sum()),
                'y': int(pd.isna(vals['y']).sum()),
                'z': int(pd.isna(vals['z']).sum()),
            }
        }
    result = {
        'total_parquet_files': total_files,
        'date_range': date_range,
        'maps_present': sorted(list(maps)),
        'total_row_count': total_rows,
        'columns': column_info,
        'sample_rows': sample_rows[:5],
        'byte_columns_unique_values': byte_columns,
        'user_id_patterns': list(user_id_patterns)[:20],
        'timestamp_min': str(ts_min),
        'timestamp_max': str(ts_max),
        'timestamp_units': 'milliseconds (epoch offset within match)',
        'timestamp_duplicates': ts_duplicates,
        'coordinate_stats_per_map': coord_stats,
    }
    return result

def main():
    raw_root = Path('d:/Projects/lila-player-journey/raw_data')
    tree = build_tree(raw_root)
    # minimap dimensions
    minimap_dir = raw_root / 'player_data' / 'minimaps'
    minimap_dims = {}
    for img_path in minimap_dir.iterdir():
        if img_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            w, h = get_image_dimensions(str(img_path))
            minimap_dims[img_path.name] = {'width': w, 'height': h}
    parquet_stats = inspect_parquet_files(str(raw_root / 'player_data'))
    output = {
        'directory_tree': tree,
        'minimap_dimensions': minimap_dims,
        'parquet_inspection': parquet_stats,
    }
    json.dump(output, sys.stdout, indent=2, default=str)

if __name__ == '__main__':
    main()
