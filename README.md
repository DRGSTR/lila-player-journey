# LILA BLACK — Level Designer Telemetry Visualizer

> High-performance, browser-based spatial telemetry and match replay tool for **LILA BLACK** (mobile extraction shooter). Built specifically for **Level Designers** to diagnose player flow, combat choke points, storm collapse pacing, and AI bot lethality.

---

## 🌐 Live Application

* **Live Hosted Web App:** [https://lila-player-journey-psi.vercel.app/](https://lila-player-journey-psi.vercel.app/) *(Hosted on Vercel Edge CDN with zero cold starts)*

---

## 🧭 Feature Walkthrough

1. **Select Map, Date & Match:** Choose `AmbroseValley`, `GrandRift`, or `Lockdown` in the left sidebar, optionally filter by date (`2026-02-10`–`2026-02-14`), and pick any match from the activity-sorted dropdown.
2. **Isolate Entities & Events:** Toggle **Humans** (solid cyan paths) vs. **Bots** (dashed amber paths) or click **Humans Only**. Click any player marker on the canvas to isolate their journey and dim all other entities.
3. **Scrub Match Playback:** Use the bottom timeline bar (`Spacebar` to play/pause, `1x`–`20x` speed, or drag the scrubber) and switch between **Full Path** and **30s Tail** modes to watch combat, loot, and storm events trigger in real time.
4. **Inspect Spatial Heatmaps:** Enable map-wide **Human Traffic**, **Bot Traffic**, **Kill Zones**, **Death Zones**, **Storm Deaths**, or **Loot Hotspots** and adjust **Opacity** and **Radius** to inspect bottlenecks against the underlying map geometry.

---

## ⚡ Key Features

* **High-DPI Interactive Minimaps:**
  * Canonical `0–1024` coordinate space rendered over crisp `2048×2048` WebP minimaps (`AmbroseValley`, `GrandRift`, `Lockdown`).
  * 60 FPS pan and cursor-centered zoom (30% to 500%).
* **Trajectory Playback Engine:**
  * Full `requestAnimationFrame` timeline scrubber with sub-second delta interpolation.
  * Speed multipliers: `1x`, `2x`, `5x`, `10x`, `20x` (with **Spacebar** play/pause hotkey).
  * **Trail Modes:** `Full Path` vs. `30s Tail` (recent comet trail with progressive alpha decay).
* **Tactical Visual Distinction:**
  * **Humans:** Solid vibrant cyan paths + circular white-ringed markers.
  * **Bots:** Dashed amber lines + diamond markers.
  * **Quick Toggle:** Instant **"Humans Only"** mode for isolating human routing without bot clutter.
* **Animated Event Markers & Pulses:**
  * Chronologically reveals `PvP Kills` (red), `Bot Combat` (orange), `Storm Deaths` (magenta), and `Loot Picks` (gold).
  * Real-time expanding pulse rings whenever a combat event triggers.
* **Click-to-Isolate & Hover Tooltips:**
  * Clicking any player marker or path dims non-selected entities to 12% opacity, spotlighting an individual player's full match journey.
  * Instant hover hit-testing displaying exact coordinates, time `MM:SS`, and actor details.
* **Spatial Heatmap Overlays:**
  * Additive radial gradients with a 256-step thermal color ramp.
  * Toggleable layers: `Human Traffic`, `Bot Traffic`, `Kill Zones`, `Death Zones`, `Storm Deaths`, and `Loot Hotspots`.
  * Independent **Opacity** and **Radius / Falloff** sliders so level designers can see map topology underneath.

---

## 🛠️ Tech Stack & Architecture

* **Offline ETL Pipeline:** Python 3.11 (`pyarrow`, `pandas`, `Pillow`)
  * Cleans 1,243 raw `*.nakama-0` Parquet files (~89,100 events across 796 matches).
  * Projects 3D world (x, z) coordinates into canonical [0, 1024] pixel space.
  * Resolves Unix-seconds timestamp storage anomalies and byte-encoded strings.
  * Resamples raw minimaps (4320px to 9000px) into optimized 2048 × 2048 WebP textures.
* **Frontend Web Application:** Next.js 14 (App Router, TypeScript, Tailwind CSS)
* **Canvas Renderer:** Layered HTML5 2D Canvas with dual offscreen buffers for heatmaps and trajectories.

For detailed system design, coordinate formulas, and engineering tradeoffs, read [ARCHITECTURE.md](ARCHITECTURE.md).  
For the 3 empirical level-design findings, read [INSIGHTS.md](INSIGHTS.md).

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* **Node.js:** v18.17+ (tested on Node v20/v26)
* **Python:** 3.10+ (virtual environment with `pyarrow`, `pandas`, `Pillow`, `matplotlib`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/DRGSTR/lila-player-journey.git
cd lila-player-journey

# Install Node dependencies
npm install
```

### 2. (Optional) Re-run Python ETL Pipeline
All static JSON chunks and optimized WebP minimaps are pre-built and tracked in `public/`. Note that `raw_data/` is gitignored; to re-run the pipeline from scratch, extract `player_data.zip` into `raw_data/player_data/` first.

```bash
# Activate your Python virtual environment
.\.venv\Scripts\python.exe scripts/preprocess.py

# Run Level Design Analytics
.\.venv\Scripts\python.exe scripts/analyze_insights.py
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
npm run build
npm start
```

---

## 📁 Repository Structure

```
├── public/
│   ├── data/
│   │   ├── manifest.json            # Match index & metadata (796 matches)
│   │   ├── matches/<match_id>.json  # Compact player paths & event telemetry
│   │   └── heatmaps/<map_id>.json   # Aggregated spatial points per date
│   └── minimaps/
│       ├── AmbroseValley.webp       # 2048x2048 optimized map (249 KB)
│       ├── GrandRift.webp           # 2048x2048 optimized map (225 KB)
│       └── Lockdown.webp            # 2048x2048 optimized map (269 KB)
├── scripts/
│   ├── preprocess.py                # Offline Parquet ETL pipeline
│   ├── verify_maps.py               # Visual coordinate alignment check
│   └── analyze_insights.py          # Level design analytics script
├── src/
│   ├── app/                         # Next.js App Router (layout, page, styles)
│   ├── components/
│   │   ├── TelemetryCanvas.tsx      # Core 60 FPS HTML5 Canvas engine
│   │   ├── Sidebar.tsx              # Filter controls & heatmap toggles
│   │   ├── PlaybackBar.tsx          # Timeline scrubber & speed multipliers
│   │   ├── MapHUD.tsx               # Zoom controls, isolation pill & legend
│   │   └── Tooltip.tsx              # Floating hover hit-test HUD
│   ├── types/                       # TypeScript telemetry interfaces
│   └── utils/                       # Heatmap thermal LUT & formatters
├── AGENT_GUIDE.md                   # Single source of truth & execution log
├── ARCHITECTURE.md                  # 1-page system architecture & tradeoffs
├── INSIGHTS.md                      # 3 data-backed level-design findings
└── README.md                        # Project documentation
```

---

## 📄 License
Created for the LILA Gaming Product Engineer assessment.
