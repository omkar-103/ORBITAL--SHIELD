# ORBITAL-SHIELD — Complete AI Handoff, System Inventory & Future Implementation Blueprint

> **PURPOSE OF THIS DOCUMENT**:  
> This document is a comprehensive technical handoff written specifically for any **next AI agent** or **software engineer** working on **ORBITAL-SHIELD**. Read this file first before modifying or extending the codebase. It explains **what the project is**, **what has already been built file-by-file**, **how the physics/telemetry/AI architecture works**, **how it maps to the Master Build Prompt**, and **what future features and infrastructure remain to be implemented**.

---

## 1. What Is This Project? (Vision & Problem Statement)

- **Application Name**: `ORBITAL-SHIELD`
- **Tagline**: *"Predict. Simulate. Protect."*
- **Core Problem Statement**: **ST-09 — Mission Digital Twin for Predictive Fault Simulation**
- **Core Premise**: Create a production-grade aerospace mission operations platform and satellite digital twin that mirrors real-time simulated telemetry, allows operators to inject subsystem faults (battery degradation, thermal stress, sensor failure, communication loss), visualizes cascading cross-subsystem failures, runs multi-scenario "What-If" trajectory simulations, and provides strictly evidence-grounded AI decision support.
- **Core Operator Workflow**:
  ```
  SENSE → UNDERSTAND → PREDICT → SIMULATE → COMPARE → DECIDE → RECOVER
  ```
- **Crucial Product Differentiator**:
  This is **NOT** a generic SaaS dashboard or an "AI chatbot for spacecraft." The core product is the **Digital Twin + Physics Cascade Engine + What-If Simulation Lab**, with AI acting strictly as an evidence-grounded telemetry analyst dividing outputs into `OBSERVED`, `PREDICTED`, and `RECOMMENDED` categories.

---

## 2. Design System & Visual Constitution (Must Be Preserved)

Any future UI additions **must** adhere to the established October 2026 aerospace visual language:

1. **60-30-10 Dark Space Palette**:
   - **60% Canvas**: Deep space obsidian (`#05070B` / `#060910` / `#070A11`)
   - **30% Structural Surfaces**: Flat slate panels (`#0B0F19`, `#111726`) with crisp 1px hairline borders (`border-white/10`)
   - **10% Semantic Telemetry Accents**:
     - Active Telemetry / Primary Accent: Laser Cyan (`#06B6D4` / `cyan-400`)
     - Nominal State: Emerald (`#10B981` / `emerald-400`) + `● NOMINAL`
     - Degraded / Warning State: Amber (`#F59E0B` / `amber-400`) + `▲ DEGRADED` / `WARNING`
     - Critical / Fault State: Rose (`#EF4444` / `rose-400`) + `✖ CRITICAL`
   - *Accessibility Rule*: Never signal state by color alone; always pair with geometric symbols (`●`, `▲`, `✖`) and explicit status text.
2. **Typography (2+1 Font System loaded in `index.html` & `src/index.css`)**:
   - **Display / Headers**: `'Chakra Petch'` (`.font-tech`) — angular technical display font for headers and subsystem titles.
   - **Body Prose**: `'Plus Jakarta Sans'` — clean high-legibility geometric sans.
   - **Telemetry & Numerals**: `'JetBrains Mono'` (`font-mono tabular-nums`) — mandatory for all fluctuating voltages, temperatures, percentages, timestamps, and coordinates so numbers never jitter horizontally.
3. **Top Bar Contract (`src/components/Header.tsx`)**:
   - Strict 3-zone header: Zone 1 (Brand Wordmark + Mission Selector), Zone 2 (5 clean navigation tabs with underline indicator), Zone 3 (Mission Elapsed Time + Demo Scenario trigger + Mission Command toggle).

---

## 3. Complete File-by-File Inventory (What Is Already Built & Working)

### Root Configuration & Server
```
/
├── .env.example                 # Environment variable template (GEMINI_API_KEY, APP_URL)
├── index.html                   # HTML entry point with SEO meta tags & Google Fonts (Chakra Petch, Plus Jakarta Sans, JetBrains Mono)
├── metadata.json                # AI Studio metadata (ORBITAL-SHIELD + MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API)
├── package.json                 # Full-stack scripts ("dev": "tsx server.ts", "build": "vite build", "start": "tsx server.ts")
├── tsconfig.json                # TypeScript ES2022 configuration
├── vite.config.ts               # Vite + React + Tailwind v4 configuration
├── server.ts                    # Express Full-Stack Backend + Telemetry Engine + Gemini 3.8 Flash API
├── README.md                    # User-facing documentation & quickstart
└── AI_HANDOFF_AND_BLUEPRINT.md  # THIS FILE — Detailed handoff & roadmap for next AI
```

### Source Code (`/src`)
```
/src
├── main.tsx                                    # React 19 DOM root mount
├── index.css                                   # Tailwind v4 import, CSS variables, .font-tech, .tabular-nums, .bg-grid-aerospace
├── App.tsx                                     # Master state orchestrator, 1.0 Hz polling loop, tab router, modal controllers
├── assets/images/
│   ├── hero_spacecraft_orbit_1790846205476.jpg          # Generated photorealistic LEO satellite asset
│   └── satellite_schematic_cutaway_1790846219996.jpg    # Generated 2D CAD cutaway schematic asset (used in 2D fallback)
├── types/
│   └── spacecraft.ts                           # All TypeScript interfaces for telemetry, subsystems, faults, graphs, simulations, AI
├── services/
│   └── api.ts                                  # API client talking to server.ts with automatic local physics fallback
└── components/
    ├── Header.tsx                              # 3-zone top navigation bar, mission selector, MET clock, Demo & Command triggers
    ├── HeroSection.tsx                         # Mission identity, SENSE->RECOVER pipeline, overall health & 5-subsystem readiness matrix
    ├── SubsystemPanel.tsx                      # 5 interactive subsystem cards (Power, Thermal, Comm, AOCS, Payload) with live metrics
    ├── SpacecraftViewer3D.tsx                  # Interactive Three.js 3D satellite digital twin + 2D engineering schematic fallback
    ├── TelemetryCharts.tsx                     # Multi-channel SVG time-series charts with hover crosshair probe & critical thresholds
    ├── FaultInjectionCenter.tsx                # "FAULT LAB" — 4 fault archetypes, severity/duration sliders, presets, live injection
    ├── CascadingFailureGraph.tsx               # Interactive SVG node-edge dependency graph + deep-dive node diagnostic inspector
    ├── AIAnalysisPanel.tsx                     # 3-column evidence-grounded AI panel (OBSERVED / PREDICTED / RECOMMENDED)
    ├── WhatIfSimulationLab.tsx                 # 4-scenario side-by-side comparison, trade-off bars, 90-min timeline, Execute Recovery button
    ├── IncidentHistoryView.tsx                 # Searchable, severity-filterable chronological anomaly & operational audit log
    ├── MissionCommandMode.tsx                  # Fullscreen distraction-free tactical cockpit mode for high-stakes operations
    └── DemoScenarioController.tsx              # Floating 7-step deterministic automated demo controller with Play/Pause/Step/Reset
```

---

## 4. Deep-Dive Into What Is Currently Implemented & How It Works

### A. Backend Server & Physics Telemetry Simulator (`server.ts` + `src/services/api.ts`)
- **Runtime**: Express server (`server.ts`) running on port `3000`. In development, it mounts `vite.middlewares` so frontend and backend run on a single port (`3000`).
- **Dual-Engine Resilience**: Every API call in `src/services/api.ts` first requests the Express backend (`/api/*`). If the backend is unreachable for any reason, `src/services/api.ts` seamlessly executes an identical client-side physics simulation engine (`generateLocalTelemetry()`) so the UI never breaks or stalls.
- **Orbital & Subsystem Physics Modeled**:
  - **Orbital Period**: Simulated `5520` seconds (92-minute Low Earth Orbit). `orbitProgress` cycles `0.0 → 1.0`. When `orbitProgress > 0.65`, the spacecraft enters **Eclipse (Umbra)** (`inEclipse = true`), dropping solar generation to `0W` and switching battery current from charging (`+12.5A`) to discharging (`-14.2A`).
  - **5 Coupled Subsystems**:
    1. `power`: `batteryVoltage` (22–32V), `batteryCurrent` (A), `batteryTemp` (°C), `stateOfCharge` (%), `solarGeneration` (W), `powerConsumption` (W), `busVoltage` (V), `healthScore` (0–100), `status` (`NOMINAL` | `WARNING` | `CRITICAL`).
    2. `thermal`: `batteryCellTemp` (°C), `avionicsTemp` (°C), `payloadSensorTemp` (°C), `radiatorTemp` (°C), `heatPipeFlux` (W/m²), `healthScore`, `status`.
    3. `communication`: `snr` (dB), `linkMargin` (dB), `packetLoss` (%), `downlinkBandwidth` (Mbps), `rfAmplifierTemp` (°C), `healthScore`, `status`.
    4. `aocs`: `reactionWheelRpm`, `attitudeError` (arcsec), `starTrackerFidelity` (%), `gyroDrift` (deg/hr), `healthScore`, `status`.
    5. `payload`: `sensorThroughput` (MB/s), `bufferFill` (%), `detectorCalibration` (%), `healthScore`, `status`.
  - **Cross-Subsystem Cascading Math**:
    - Injecting `battery_degradation` reduces `batteryDegradationFactor`, which lowers `batteryVoltage`, increases `powerConsumption` (due to internal resistance Joule heating), elevates `batteryTemp` by up to `+14.5°C`, depresses `snr` and `linkMargin` when voltage drops below `24.0V`, and throttles `payload.sensorThroughput` from `180 MB/s` down to `45 MB/s` when voltage drops below `24.2V`.

### B. REST API Endpoints Implemented in `server.ts`
1. `GET /api/health` — Returns server status and timestamp.
2. `GET /api/missions` — Returns active mission ID and 3 selectable mission profiles (`OS-001` Sentinel LEO Observation, `OS-002` Helios Deep Space Relay, `OS-003` Aegis SAR Sentinel).
3. `POST /api/missions/select` — Switches active mission and resets active faults.
4. `GET /api/telemetry/current` — Advances mission clock by 1 second, computes coupled subsystem physics, and returns a `TelemetryData` snapshot.
5. `POST /api/faults/inject` — Injects or updates a fault (`type`, `severity`, `duration`, `subsystem`) and records a timestamped `CRITICAL` or `WARNING` event in `incidentHistory`.
6. `POST /api/faults/clear` — Clears all active faults, restores nominal state, and logs an `INFO` incident event.
7. `GET /api/incidents` — Returns the latest 30 timestamped incident events.
8. `POST /api/simulation/run` — Accepts `{ faultType, severity }` and computes 4 parallel 90-minute scenario projections (`baseline`, `scenario_a` Safe Power Mode, `scenario_b` Payload Duty Cycling, `scenario_c` Downlink Priority & Thermal Slew).
9. `POST /api/ai/explain` — Server-side `@google/genai` integration calling model `'gemini-3.8-flash'` with `User-Agent: 'aistudio-build'`. Sends the exact current telemetry snapshot and active fault state, instructing the model to output three strict sections (`OBSERVED:`, `PREDICTED:`, `RECOMMENDED:`). Includes a deterministic physics fallback if `GEMINI_API_KEY` is not configured.

### C. 3D Spacecraft Digital Twin (`src/components/SpacecraftViewer3D.tsx`)
- Built with native **Three.js** (`WebGLRenderer` with `ACESFilmicToneMapping`).
- **3D Scene Contents**:
  - 450-point deep-space starfield, Earth sphere curvature with atmospheric limb ring, and orbital trajectory ring.
  - Directional sunlight (dims automatically when `inEclipse === true`) + Earth albedo fill light.
  - **Modular 3D Spacecraft Geometry**:
    - Central hexagonal avionics bus with Gold MLI foil material (`aocs`).
    - Left & right photovoltaic solar array wings + booms (`power`).
    - Internal core battery bay (`power`).
    - Back-face thermal radiator panel (`thermal`).
    - Top parabolic high-gain X-band dish antenna + feedhorn (`communication`).
    - Bottom optical payload baffle + glass lens (`payload`).
    - 4 corner RCS thruster pods (`aocs`).
- **Interactive Features**:
  - **Raycasting**: Clicking any 3D mesh on the spacecraft identifies its `userData.subsystem` and selects it.
  - **Smooth Camera Lerping**: Selecting a subsystem (via 3D click, bottom HUD bar, or top subsystem cards) smoothly interpolates (`Vector3.lerp`) the camera position and look-at target to inspect that specific hardware module.
  - **Live Telemetry Emissive Glow**: Meshes dynamically shift emissive color and intensity based on subsystem status (`0x10b981` emerald for Nominal, `0xf59e0b` amber for Warning, `0xef4444` red for Critical).
  - **2D Schematic Fallback**: Toggle button switches from WebGL 3D to the generated CAD cutaway schematic (`satellite_schematic_cutaway_1790846219996.jpg`) with live telemetry callout overlays.

### D. Interactive Workbenches & Modes
- **Fault Lab (`FaultInjectionCenter.tsx`)**: Allows selecting any of the 4 fault archetypes, tuning Severity (`5%–95%`) and Duration (`10–180 min`), or clicking 1-click aerospace presets (*Eclipse Battery Thermal Runaway 42%*, *Radiator Louver Jam 65%*, *Deep Space Downlink Dropout 70%*).
- **Cascading Failure Graph (`CascadingFailureGraph.tsx`)**: Interactive 7-node, 8-edge SVG dependency network (`Photovoltaic Array → Battery Storage → Regulated Main Bus → Thermal Loop / Downlink RF / Multispectral Payload`). Degraded edges pulse with amber/red gradients. Clicking any node opens the **Node Deep-Dive Inspector** showing hard telemetry evidence, upstream contributing factors, predicted downstream impact, failure horizon, and confidence percentage.
- **What-If Simulation Lab (`WhatIfSimulationLab.tsx`)**: Compares 4 operational strategies side-by-side with survival probability, battery reserve, thermal stability, preserved science output, and a `T+00m` to `T+65m` event timeline. Clicking **"Execute Recovery Strategy"** triggers recovery on the digital twin, clears the fault, logs the recovery action, and updates the AI analysis.
- **Mission Command Mode (`MissionCommandMode.tsx`)**: Fullscreen tactical overlay stripping away secondary navigation to show the 3D Digital Twin, active anomaly vector, critical bus gauges, and a 1-click **"Authorize & Execute Safe Power Mode (CMD-PWR-04)"** button.
- **Automated Demo Scenario (`DemoScenarioController.tsx`)**: Floating 7-step guided controller (`1. Nominal Cruise` → `2. Inject 38% Battery Fault` → `3. Telemetry Divergence` → `4. Cascading Propagation` → `5. AI Evidence Grounding` → `6. What-If Simulation` → `7. Execute Recovery & Stabilize`) with auto-play timer (7s per step), manual step navigation, and presenter narration.

---

## 5. Gap Analysis: Master Prompt vs. Current Implementation

| Master Prompt Requirement | Current Status | Implementation Details / Notes |
|---|---|---|
| **Part 1–3: Product Vision, Design Direction, Hero Experience** | ✅ **100% Complete** | Dark aerospace theme, 3-zone header, SENSE→RECOVER pipeline, readiness matrix. |
| **Part 4: 3D Digital Twin & 2D Fallback** | ✅ **95% Complete** | Three.js satellite with subsystem picking, camera focus, status glow, and 2D schematic toggle. *(Future: drag-to-orbit mouse controls & 3D dependency arcs)*. |
| **Part 5: Main Mission Control Dashboard & Telemetry Charts** | ✅ **95% Complete** | 5 subsystem cards + multi-channel SVG charts with hover crosshairs. *(Future: zoom/pan brush & multi-fault anomaly pins on chart)*. |
| **Part 6: Real-Time Telemetry Pipeline** | ⚠️ **Adapted (In-Memory + Polling)** | Currently uses 1.0 Hz physics generator in `server.ts` polled via `/api/telemetry/current`. *(Future: SSE / WebSocket push + persistent DB storage)*. |
| **Part 7: Fault Injection Center ("FAULT LAB")** | ✅ **100% Complete** | 4 fault types, severity/duration sliders, presets, live digital twin state transition. |
| **Part 8: Cascading Failure Visualization** | ✅ **100% Complete** | Interactive SVG node-edge graph with animated degraded edges and node inspector panel. |
| **Part 9: Evidence-Grounded AI Analysis** | ✅ **100% Complete** | Server-side Gemini 3.8 Flash (`@google/genai`) strictly separated into `OBSERVED`, `PREDICTED`, and `RECOMMENDED`. |
| **Part 10–12: What-If Simulation, Timeline & Recovery** | ✅ **95% Complete** | 4 scenarios, survival/reserve/thermal/science metrics, event timeline, and recovery execution. *(Future: multi-line comparative trajectory chart)*. |
| **Part 13–14: Incident Timeline & Mission History** | ✅ **90% Complete** | Chronological incident audit log with severity filter & search + 3 mission profiles. *(Future: historical mission replay & simulation run archive table)*. |
| **Part 15–16: Production Database (PostgreSQL / Supabase) & Realtime** | ✅ **100% Complete (Supabase PostgreSQL)** | Complete dual-mode persistence (`server/db.ts` + `db/schema.sql`). 9 wired tables with zero-latency in-memory fallback. |
| **Part 17–18: Backend & Frontend Architecture** | ✅ **Adapted for AI Studio** | Built with React 19 + Vite + Express (`server.ts`) per AI Studio full-stack runtime constraints. |
| **Part 25–26: Mission Command Mode & Demo Mode** | ✅ **100% Complete** | Fullscreen Mission Command cockpit and 7-step deterministic Demo Scenario walkthrough. |
| **Part 27–29: Error States, Security, Observability** | ⚠️ **Partial** | Server-side API key protection & client fallback implemented. Needs user auth (RBAC) and structured telemetry health monitor. |
| **Task B: Model Lab & Offline Public ML Benchmarks** | ✅ **100% Complete** | Offline training pipelines on NASA PCoE battery aging and ESA OPSSAT-AD datasets (`ml/train_battery.py`, `ml/train_opssat.py`), benchmark route (`server/ml.ts`), and UI component (`src/components/ModelLabView.tsx`). |

---

## 6. Future Roadmap & System Status

### ✅ Priority 1: Persistent Database Integration (COMPLETED — Supabase PostgreSQL)
Supabase PostgreSQL persistence is implemented via `pg` connection pooler (`server/db.ts`, `db/schema.sql`):
- **Resilience Guarantee**: In-memory state remains the authoritative source of truth. If `DATABASE_URL` is omitted, malformed, or the remote database is unreachable, the system executes in zero-latency memory-only mode with a 15-second circuit breaker.
- **Wired Tables (9 Active)**:
  1. `server_state` — Clock recovery (`mission_time`) & active mission ID on server boot, auto-flushed every 5s.
  2. `telemetry` — Multi-row batch insertion every 5s (buffered up to 600 rows).
  3. `fault_events` — Tracks injected subsystem faults, start timestamps, duration, and cleared status.
  4. `incident_events` — Persisted operational incident and anomaly audit logs (queried by `/api/incidents`).
  5. `simulation_runs` — Monte Carlo / deterministic What-If simulation run metadata linked to faults.
  6. `simulation_results` — 4 scenario outcome records per simulation run with JSON timelines.
  7. `operator_actions` — Audit log of operator commands (e.g. `CLEAR_FAULTS`).
  8. `missions` — Seeded profiles (`OS-001`, `OS-002`, `OS-003`).
  9. `spacecraft` — Seeded satellite bus records (`OS-001-SC1`, `OS-002-SC1`, `OS-003-SC1`).
- **Unwired Tables (6 Ready for Future RBAC/Alert Features)**:
  `users` (role-based access), `subsystems` (per-subsystem health thresholds), `anomalies` (out-of-family detections), `recovery_strategies` (command templates), `system_alerts` (flight director broadcasts), `models` (registry).

### ✅ Model Lab: Offline Public Machine Learning Benchmarks (COMPLETED)
- Offline training scripts added in `/ml/` with `ml/requirements.txt`:
  - `ml/train_battery.py`: NASA PCoE Li-ion Battery Aging regression (Leave-One-Battery-Out across B0005, B0006, B0007, B0018) using `GradientBoostingRegressor` over the initial 600s discharge window.
  - `ml/train_opssat.py`: ESA OPSSAT-AD Telemetry Anomaly Detection (Zenodo 12588359, arXiv:2407.04730) using `RandomForestClassifier` with balanced class weights vs. `DummyClassifier`.
- Backend Route: `GET /api/ml/benchmark` in `server/ml.ts` reads `/models/*.json` artifacts and serves them safely to the frontend.
- Frontend: `src/components/ModelLabView.tsx` embedded as an accessible sub-view inside the Incident Log / Mission Archive tab. Includes SVG true-vs-predicted degradation curves, cell selector, per-cell MAE vs. dummy baseline, and 2x2 confusion matrix (TN/FP/FN/TP).


### Priority 2: True Real-Time Streaming (Server-Sent Events `/api/telemetry/stream`)
- Upgrade the 1.0 Hz polling in `src/App.tsx` to an **SSE (Server-Sent Events)** stream (`GET /api/telemetry/stream`) in `server.ts` so the backend pushes telemetry ticks, anomaly detections, and fault state changes in real time to all connected clients simultaneously, while keeping `fetchCurrentTelemetry()` as a fallback.

### Priority 3: Enhanced 3D Digital Twin Interactions (`src/components/SpacecraftViewer3D.tsx`)
- **Pointer Drag Orbit Controls**: Add mouse-down / pointer-move spherical camera rotation so operators can freely orbit around the 3D satellite in addition to the preset subsystem focus buttons.
- **3D Dependency Arcs**: When a subsystem is selected or a fault is active, render glowing 3D `THREE.QuadraticBezierCurve3` tubes between the affected 3D meshes (e.g., from the Battery mesh to the Main Bus mesh to the X-Band Dish mesh) directly in 3D space.
- **Solar Panel Tracking**: Rotate `leftWing.rotation.x` and `rightWing.rotation.x` dynamically as a function of `orbitProgress` to visually track the sun vector.

### Priority 4: Multi-Scenario Trajectory Curves & Custom What-If Parameters (`src/components/WhatIfSimulationLab.tsx`)
- Add a **Comparative Trajectory Line Chart** inside `WhatIfSimulationLab.tsx` that plots projected Battery Reserve (%) and Temperature (°C) from `T+00m` to `T+90m` for all 4 scenarios (`Baseline` in dashed red, `Safe Power Mode` in solid emerald, `Duty Cycling` in cyan, `Thermal Slew` in amber) on the same chart so operators can visually see where `Baseline` crosses the critical failure line (`T+38m`) while `Safe Power Mode` recovers.
- Add **Custom Strategy Sliders** allowing the operator to test custom parameters (e.g., *Payload Power Throttle %*, *Solar Array Offset Angle °*, *Downlink Duty Cycle %*) and dynamically recompute survival probability.

### Priority 5: Mission History & Simulation Archive View
- Expand the `Incident Log` tab (or add a `Mission Archive` sub-view) to display:
  - Past completed simulation runs with side-by-side outcome comparisons.
  - Operator decision audit logs (`CMD-PWR-04 executed by Flight Director at T+03:58:12`).
  - A **"Download Mission Telemetry & Incident Report (JSON / CSV)"** export button.

### Priority 6: Multi-Fault Compounding & Time-Warp Scrubbing
- Allow multiple simultaneous faults in `FaultInjectionCenter.tsx` (e.g., *Battery Degradation* + *Thermal Stress* at the same time) with compounding cascade effects rather than replacing faults of the same type.
- Add a **Simulation Time-Warp Multiplier** (`1x Real-Time`, `5x Fast-Forward`, `15x Orbit Scrub`) in the top bar so operators can watch a full 92-minute orbit and eclipse transition unfold in 6 minutes.

---

## 7. Technical Guardrails for Next AI Agent

1. **Never Call `@google/genai` From Client Files**:
   - All Gemini calls **must** stay in `server.ts` (using `process.env.GEMINI_API_KEY` and `model: 'gemini-3.8-flash'`). Never import `@google/genai` inside `/src/*`.
2. **Keep Full-Stack Server on Port 3000**:
   - Do not change `"dev": "tsx server.ts"` in `package.json`. Express + Vite middleware must listen on port `3000`.
3. **Never Use `window.alert`, `window.confirm`, or External Unsplash URLs**:
   - Use custom aerospace modals/toasts and local assets in `/src/assets/images/` or `generate_image`.
4. **Always Verify Build**:
   - After any code edits, run `compile_applet` and `lint_applet` to confirm zero TypeScript or bundling errors.
