# LILA BLACK Telemetry Visualizer — Antigravity Execution Guide

> **Role of this document:** This is the single source of truth for building the LILA Gaming Product Engineer assessment. Follow every rule strictly. Do not deviate from the current phase or make unverified assumptions about the data.

---

## 1. Project Goal
Build a fast, browser-based **Level Designer Telemetry Visualization Tool** for **LILA BLACK** (a mobile extraction shooter).
- **Target User:** Level Designers (NOT data scientists). Prioritize spatial clarity, map geometry visibility, and instant interactivity over complex charts.
- **Submission Requirements:**
  - Single GitHub repository containing all code, ETL scripts, and documentation.
  - Live hosted web app (Vercel, zero cold-start).
  - `ARCHITECTURE.md` (strictly 1 page).
  - `INSIGHTS.md` (3 concrete level-design/product insights backed by tool screenshots).
  - `README.md` (with a 2–3 min walkthrough video link).

---

## 2. Strict Agent Operating Rules
1. **Zero Guesswork:** Never assume column names, data types, event strings, bot ID formats, timestamp units, or coordinate bounds. Always inspect the actual files and provided README first.
2. **Phase-Gated Execution:** Only execute the **Current Active Phase**. Do NOT scaffold the frontend, write ETL pipelines, or install unrelated packages until explicitly instructed to move to the next phase.
3. **Structured Reporting:** At the end of every task, output a concise, factual report containing:
   - Exact file paths inspected or modified.
   - Verbatim schemas, sample values, and edge cases discovered.
   - Any ambiguities or anomalies found (flag them—do not silently fix or drop data without approval).
4. **Clean Repo Hygiene:** Keep raw Parquet/zip datasets out of Git (add to `.gitignore`) if large, but ensure all Python ETL scripts are reproducible and committed.
5. **Living Spec Updates:** Whenever the user provides updated findings or architectural decisions, update **Section 5 (Living Knowledge Base)** before writing new code.

---

## 3. Target Architecture (Baseline)
*(Subject to refinement once Phase 1 data forensics are complete.)*

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Offline ETL** | Python (`pyarrow`, `pandas`, `Pillow`/`matplotlib`) | Clean raw Parquet files, decode byte strings, classify bots/humans, normalize timestamps, and export compact static JSON chunks. |
| **Data Serving** | Static pre-indexed JSON (`public/data/`) | Hosted on Vercel CDN for zero cold-start and instant client-side filtering (`manifest.json` + per-match JSONs + heatmap datasets). |
| **Frontend** | Next.js (App Router, TypeScript) + Tailwind CSS | Dark-mode UI with ~75–80% viewport dedicated to the interactive map canvas and a compact sidebar for controls. |
| **Map Renderer** | HTML5 2D `<canvas>` (layered) | 60 FPS pan/zoom, player trajectories, event markers, `requestAnimationFrame` timeline playback, and toggleable radial/binned heatmaps. |

### Core UX Requirements
- **Filters:** Map selector, Date selector, Match selector, and a one-click **"Humans Only"** toggle.
- **Visual Hierarchy:** Distinct styling for **Humans** (solid, vibrant) vs. **Bots** (dashed, muted).
- **Event Markers:** Distinct shapes/colors + hover tooltips for Kills, Deaths, Loot, and Storm Deaths (exact event names TBD in Phase 1).
- **Timeline Playback:** `Play/Pause`, speed multipliers (`1x / 2x / 5x / 10x`), draggable scrubber, and Trail Mode (*Full path so far* vs. *Recent comet tail*).
- **Heatmaps:** Independent toggleable layers (Kill Zones, Death Zones, Storm Deaths, Traffic) with an opacity slider.
- **Inspection:** Pan & zoom, plus click-to-isolate an individual player's full journey.

---

## 4. Phased Roadmap

- [ ] **Phase 1: Data Forensics & Schema Discovery** *(CURRENT ACTIVE PHASE)*
  - Inspect workspace files, read the provided dataset README verbatim, profile Parquet schemas, check byte encodings, bot identifiers, timestamp formats, event types, null/out-of-bounds values, and minimap image dimensions.
- [ ] **Phase 2: Coordinate Transform Verification**
  - Derive and visually validate the World `(x, y, z)` → Minimap Pixel `(px, py)` formula across all maps using a quick Python `matplotlib` overlay script before writing any frontend code.
- [ ] **Phase 3: Offline ETL Pipeline**
  - Build `scripts/preprocess.py` to generate optimized static JSON assets in `public/data/`.
- [ ] **Phase 4: Frontend Scaffold & Static Map Viewer**
  - Initialize Next.js + Tailwind, build pan/zoom Canvas renderer, wire up Map/Date/Match filters, static paths, and event markers.
- [ ] **Phase 5: Playback Engine, Heatmaps & UX Polish**
  - Implement `requestAnimationFrame` timeline scrubber, comet-tail trails, click-to-isolate player, and toggleable heatmap overlays.
- [ ] **Phase 6: Deployment, Insights & Documentation**
  - Deploy to Vercel, extract 3 concrete level-design insights with screenshots, and finalize `ARCHITECTURE.md`, `INSIGHTS.md`, and `README.md`.

---

## 5. Living Knowledge Base
*(Populated and verified after Phase 1 & Phase 2.)*

### 5.1 Workspace & Data Directory Structure
- `raw_data/player_data/`:
  - `February_10` through `February_14`: 1,243 Parquet files without `.parquet` extension (named `{user_id}_{match_id}.nakama-0`).
  - `minimaps/`: Raw minimaps (`AmbroseValley_Minimap.png`, `GrandRift_Minimap.png`, `Lockdown_Minimap.jpg`).
- `public/`:
  - `minimaps/`: Resized `2048×2048` WebP minimaps (`AmbroseValley.webp`, `GrandRift.webp`, `Lockdown.webp`).
  - `data/`:
    - `manifest.json`: Index of all 796 matches with summary metadata and duration.
    - `matches/<clean_match_id>.json`: Individual player trajectory paths and non-movement event points.
    - `heatmaps/<map_id>.json`: Aggregated coordinate points per date (`2026-02-10` to `2026-02-14`) for human traffic, bot traffic, kills, deaths, storm deaths, and loot.
- `scripts/`:
  - `preprocess.py`: Verified ETL pipeline.
  - `verify_maps.py`: Visual trajectory-on-minimap overlay verification script.

### 5.2 Dataset README Summary & Phase 1 Verified Stats
- **Date Range:** February 10 – 14, 2026.
- **Total Files:** 1,243 files successfully read across all 5 date folders.
- **Total Event Rows:** 89,104 rows across the entire dataset.
- **Unique Matches:** 796 matches (`match_id` values).
- **Unique Players:** 339 total (245 Human UUIDs, 94 Numeric Bot IDs).
- **Maps:** `AmbroseValley`, `GrandRift`, `Lockdown`.

### 5.3 Parquet Schema & Encoding Quirks
| Column | Parquet Type | Pandas Dtype | Description / Quirks |
|---|---|---|---|
| `user_id` | `string` | `object` | Player or Bot identifier. |
| `match_id` | `string` | `object` | Match GUID with `.nakama-0` server suffix. |
| `map_id` | `string` | `object` | Map name. May read as string or byte array depending on engine. |
| `x` | `float` | `float32` | World X coordinate. |
| `y` | `float` | `float32` | Elevation / height (not used for 2D minimap plotting). |
| `z` | `float` | `float32` | World Z coordinate. |
| `ts` | `timestamp[ms]` | `datetime64[ms]` | **Critical quirk:** Column stores raw Unix timestamps in **seconds** (e.g. `1770910386`). Casting `df['ts'].astype('int64')` in pandas preserves the true integer seconds without truncation or division. |
| `event` | `binary` | `object` (bytes) | Byte strings (e.g. `b'Position'`, `b'Kill'`). Must decode with `.decode('utf-8')`. |

### 5.4 Bot vs. Human Classification Rule
- **Bot:** `user_id.isdigit()` or non-UUID format (e.g. `"1440"`, `"382"`).
- **Human:** Standard 36-char UUID format (regex: `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`).

### 5.5 Event Types & Timestamp Normalization
**8 Discovered Event Types (exact string matches after decoding):**
- Movement: `Position` (Human), `BotPosition` (Bot).
- Combat: `Kill` (Human killed Human), `Killed` (Human killed by Human), `BotKill` (Human killed Bot), `BotKilled` (Human killed by Bot).
- Environment: `KilledByStorm`.
- Item: `Loot`.

**Timestamp Normalization Formula:**
- Raw `ts_raw = df['ts'].astype('int64')` gives Unix seconds.
- Match start: `min_ts = match_df['ts_raw'].min()`.
- Match relative time: `t_sec = round(float(ts_raw - min_ts), 2)` (measured in seconds from match start, `0.0` to `duration_sec`).
- Durations for top matches: ~734s (12m 14s), ~759s (12m 39s), ~795s (13m 15s).

### 5.6 Minimap Assets & Coordinate Mapping Formula
**Actual Raw Minimap Dimensions (vs. README claims):**
- `AmbroseValley_Minimap.png`: 4320 × 4320 px (9.7 MB)
- `GrandRift_Minimap.png`: 2160 × 2158 px (2.9 MB)
- `Lockdown_Minimap.jpg`: 9000 × 9000 px (11.8 MB)

**Optimized WebP Assets:**
- All 3 images resized with Pillow `Image.Resampling.LANCZOS` to `2048×2048` WebP (`quality=88`) in `public/minimaps/` (~230–275 KB each, 762 KB total).
- Filenames: `AmbroseValley.webp`, `GrandRift.webp`, `Lockdown.webp`.

**World to 2D Minimap UV / Pixel Formula (Canonical 0–1024 Space):**
```python
u = (x - origin_x) / scale
v = (z - origin_z) / scale
px = round(u * 1024.0, 1)
py = round((1.0 - v) * 1024.0, 1)  # Inverted Y for image coordinate space
```
**Map Parameters:**
- AmbroseValley: `scale = 900`, `origin_x = -370`, `origin_z = -473`
- GrandRift: `scale = 581`, `origin_x = -290`, `origin_z = -290`
- Lockdown: `scale = 1000`, `origin_x = -500`, `origin_z = -500`

**Plotting / Canvas Alignment:**
- Use `extent=[0, 1024, 1024, 0]` when rendering the background map so `px, py` coordinates in `[0, 1024]` align 1:1 across the entire canvas.

### 5.7 Final JSON Schemas
1. **`public/data/manifest.json`**:
   - `maps`: `["AmbroseValley", "GrandRift", "Lockdown"]`
   - `matches`: Array of objects sorted by `event_count` descending:
     `{ match_id, map_id, date, human_count, bot_count, event_count, duration_sec, kill_count, death_count, storm_deaths }`
2. **`public/data/matches/<clean_match_id>.json`**:
   - `{ match_id, map_id, date, duration_sec, players: [{ id, is_bot, path: [[t, px, py], ...] }], events: [{ t, px, py, type, user_id, is_bot }] }`
3. **`public/data/heatmaps/<map_id>.json`**:
   - Dict keyed by date (`"2026-02-10"` ... `"2026-02-14"`):
     `{ human_traffic: [[px, py], ...], bot_traffic: [...], kills: [...], deaths: [...], storm: [...], loot: [...] }`
