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
*(To be populated and locked after Phase 1 & Phase 2.)*

### 5.1 Workspace & Data Directory Structure
- *Pending Phase 1 inspection.*

### 5.2 Dataset README Summary
- *Pending Phase 1 inspection.*

### 5.3 Parquet Schema & Encoding Quirks
- *Pending Phase 1 inspection.*

### 5.4 Bot vs. Human Classification Rule
- *Pending Phase 1 inspection.*

### 5.5 Event Types & Timestamp Normalization
- *Pending Phase 1 inspection.*

### 5.6 Minimap Assets & Coordinate Mapping Formula
- *Pending Phase 1 inspection.*

### 5.7 Approved Tradeoffs & Edge-Case Handling
- *Pending Phase 1 & 2 decisions.*