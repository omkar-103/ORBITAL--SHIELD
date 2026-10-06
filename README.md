# ORBITAL-SHIELD 
### Autonomous Mission Resilience & Spacecraft Subsystem Digital Twin Platform
*“Predict. Simulate. Protect.”*

**Core Challenge Reference**: ST-09 — Mission Digital Twin for Predictive Fault Simulation  
**Platform Version**: 2026.4 Production Build  

> **DEPLOYMENT & DATABASE**: Read [`/DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for full Vercel multi-services and Supabase PostgreSQL setup instructions.

---

## 1. Executive Overview

**ORBITAL-SHIELD** is an aerospace mission operations platform engineered to shift satellite contingency management from reactive firefighting to predictive, simulated resilience. 

During high-stakes orbital operations, spacecraft subsystem anomalies—such as battery impedance degradation, radiator heat-pipe blockages, attitude sensor blinding, or RF downlink amplifier decay—do not occur in isolation. They propagate across coupled power buses, thermal gradients, and communications schedules.

ORBITAL-SHIELD integrates:
1. **Interactive 3D Digital Twin**: High-fidelity Three.js satellite visualization with subsystem raycasting, health emission indicators, and 2D engineering schematic fallback.
2. **Real-Time Telemetry Pipeline**: Multi-channel 1.0 Hz ingestion covering Power, Thermal, RF Communications, AOCS & Guidance, and Multispectral Scientific Payload.
3. **Fault Lab**: Precision injection center for subsystem stress vectors (severity, duration, cascade horizon).
4. **Cascading Failure Visualization**: Interactive dependency network illustrating failure propagation from energy storage through thermal dissipation to mission science loss.
5. **What-If Simulation Lab**: Multi-scenario trajectory evaluation comparing Baseline Continue, Safe Power Mode, Payload Duty Cycling, and Downlink Priority.
6. **Evidence-Grounded AI**: Powered by Groq llama3.3-70b-versatile (`@groq`), strictly dividing insights into **OBSERVED** telemetry facts, **PREDICTED** physical extrapolations, and **RECOMMENDED** recovery actions with zero hallucination.
7. **Mission Command Mode**: High-contrast, distraction-free operations cockpit designed for rapid tactical execution.
8. **Automated Demo Scenario**: Deterministic 7-step guided walkthrough for evaluation and presentations.

---

## 2. System Architecture

```
                             [ Spacecraft Telemetry Pipeline ]
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
            [ Physics Simulation Engine ]             [ Telemetry Store / State ]
            (Orbital shadow, thermal flux,            (1.0 Hz multi-channel ring buffer)
             impedance, link budget)                             │
                       │                                         │
        ┌──────────────┴──────────────┐                          │
        ▼                             ▼                          │
 [ Fault Injection Lab ]   [ Cascading Graph Engine ]            │
 (Battery / Thermal /      (Edge pulse propagation,              │
  AOCS / Downlink)          cross-subsystem impacts)             │
        │                             │                          │
        └──────────────┬──────────────┘                          │
                       ▼                                         ▼
            [ What-If Monte Carlo Lab ]          [ Grounded Safety AI ]
            (Baseline vs Safe Power vs           (Groq llama)
             Duty Cycling vs Thermal Slew)       (Observed / Predicted / Recommended)
                       │                                         │
                       └────────────────────┬────────────────────┘
                                            ▼
                               [ ORBITAL-SHIELD Web Console ]
                         Three.js 3D Twin │ SVG Multi-Channel HUD
                         Mission Command  │ Incident Event Audit
```

---

## 3. Technology Stack

- **Frontend Core**: React 19, TypeScript, Tailwind CSS v4, Motion
- **3D Spatial Visualization**: Three.js (ACES Filmic Tone Mapping, PBR materials, custom geometry, raycasting)
- **Backend Service**: 
- **AI Intelligence**: 
- **Icons & UI Accents**: Lucide React
- **Design System**: Aerospace Dark Theme, JetBrains Mono tabular numerals, Chakra Petch display typography

---

## 4. Subsystems Monitored

| Subsystem | Monitored Telemetry Channels | Nominal Operating Range | Fault Scenarios |
|---|---|---|---|
| **Power & Battery** | Bus Voltage, Cell Temp, State of Charge (SoC), Solar Generation, System Draw | 24.0V – 32.0V, 15°C – 32°C, 45% – 99% SoC | Cell impedance rise, eclipse depletion, bus sag |
| **Thermal Loop** | Battery Core Temp, Avionics Temp, Radiator Temp, Heat Pipe Flux | <34°C core, -20°C to +45°C radiator | Heat-pipe dryout, radiator louver jam |
| **RF Communications** | Signal-to-Noise (SNR), Link Margin, Packet Loss, Downlink Bandwidth | >12 dB SNR, >3.0 dB margin, <2% loss | High-gain dish mispoint, amplifier degrade |
| **AOCS & Guidance** | Reaction Wheel RPM, Pointing Error, Star Tracker Lock, Gyro Drift | <4500 RPM, <2.5 arcsec error, >95% lock | Optical stray-light blinding, gyro drift |
| **Scientific Payload** | Sensor Throughput, Solid-State Buffer Fill, Calibration Quality | 180 MB/s max, <80% buffer fill | Buffer overflow, thermal throttling |

---

## 5. Walkthrough & Demo Guide (2-Minute Presentation)

Click the **"DEMO SCENARIO"** button in the top navigation bar to launch the guided walkthrough:

1. **Step 1: Nominal Cruise** — Spacecraft in Sun-Synchronous LEO; all 5 subsystem telemetry bars display green nominal states.
2. **Step 2: Inject Battery Degradation** — 38% internal cell impedance degradation is introduced into the power subsystem.
3. **Step 3: Telemetry Divergence** — Bus voltage drops from 29.8V to 24.2V; battery core temperature elevates (+7.2°C).
4. **Step 4: Cascading Failure Propagation** — Navigate to the **Cascade Graph** to observe propagation from battery into main bus, heating up the thermal loop and depressing RF amplifier margins.
5. **Step 5: Evidence-Grounded AI Analysis** — Inspect the 3 distinct tiers:
   - **OBSERVED**: Exact telemetry facts and measured temperature rises.
   - **PREDICTED**: Extrapolated bus collapse within 34 minutes if no action is taken.
   - **RECOMMENDED**: Specific flight director command sequence.
6. **Step 6: What-If Multi-Scenario Lab** — Compare Baseline (42% survival probability) against Safe Power Mode (98% survival probability).
7. **Step 7: Execute Safe Power Mode** — Click **"Execute Strategy"** to apply the operational command. Spacecraft stabilizes, solar panels bias +12°, and health restores to nominal cruise.
8. **Step 8: Closed-Loop Verification** — Inspect the Recovery Verification card confirming real pre vs post metric recovery (bus voltage restored, battery temperature cooled, link margin stabilized).

---

## 6. Digital Twin Coupling & Predictive Residual Architecture (F1 & F2)

Unlike passive telemetry dashboards, ORBITAL-SHIELD continuously evaluates measured telemetry against a pure, deterministic **Digital Twin Nominal Model**:

```
REALITY (Measured Telemetry)
       │
       ▼
[ Nominal Digital Twin Prediction ]
(Pure physics model at same orbital time with zero active faults)
       │
       ▼
[ Residual Calculation: e(t) = y_meas(t) - y_nom(t) ]
(Bus Voltage Residual · Battery Core Temp Residual)
       │
       ▼
[ EWMA Residual Detector with Hysteresis ]
(NOMINAL  ──[watch threshold]──>  WATCH  ──[anomaly threshold]──>  ANOMALY)
       │
       ▼
[ Cross-Subsystem Causal Failure Graph (WHY It Propagated) ]
(Interactive edge inspector displaying Cause · Measured Evidence · Physics Coupling · Consequence)
       │
       ▼
[ Grounded What-If Simulation & Closed-Loop Recovery Verification ]
(Starts from live twin state; verifies actual post-recovery metrics)
```

### Digital Twin Synchronization
- **Indicators**: `● SYNCHRONIZED`, `▲ DRIFT`, `✖ STALE`.
- **Authoritative Clock**: Displays real mission elapsed time (`T+HH:MM:SS`), drift delta in seconds, and total samples ingested.

### F1: Twin vs Reality Residual Chart & Strip
- **Upper Chart**: Simultaneously renders solid cyan **Measured Reality** against dashed amber **Twin Nominal Prediction**.
- **Lower Residual Strip**: Features zero line, shaded safe / watch / anomaly threshold bands, and real-time residual polyline.

### F2: EWMA Residual Detector
- **Hysteresis States**: `● NOMINAL`, `▲ WATCH`, `✖ ANOMALY`.
- **Thresholds**:
  - Bus Voltage: Watch $\pm0.50\text{V}$, Anomaly $\pm1.60\text{V}$.
  - Battery Temperature: Watch $\pm1.20^\circ\text{C}$, Anomaly $\pm2.80^\circ\text{C}$.
- **Shared State**: Drives both the Telemetry Chart residual strip and the Live Detector Chip on the main overview.

### Causal Evidence Inspector ("WHY This Propagated")
Clicking any connection edge in the Cascading Failure Graph reveals:
1. **Root Cause Mechanism**: Underlying physical failure trigger.
2. **Measured Telemetry Evidence**: Live values contrasted with nominal baseline.
3. **Coupling Model Relationship**: Spacecraft physical coupling formula.
4. **Downstream Consequence**: Cascading degradation vector across dependent subsystems.
5. **Coupling State**: `● NOMINAL`, `▲ DEGRADED CASCADE`, `✖ CRITICAL PROPAGATED`.

### Closed-Loop Recovery Verification
- Captures an authoritative pre-recovery twin telemetry snapshot upon executing recovery.
- Compares against live post-recovery telemetry across Bus Voltage, Battery Core Temp, Downlink Margin, and Payload Throughput.
- Confirms `MISSION STATE: STABILIZED` with verifiable before $\rightarrow$ after metrics.

---

## 7. Environment Variables

Create `.env` using `.env.example`:

```env
# GEMINI_API_KEY: Required for Gemini AI safety analysis.
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# APP_URL: URL where applet is hosted.
APP_URL="http://localhost:3000"

# DATABASE_URL (Optional): Supabase PostgreSQL connection pooler URI.
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
# Leave unset or empty to run in zero-friction in-memory mode.
DATABASE_URL="postgresql://postgres.your-project:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Optional: Set to 'false' if running against local postgres without TLS
DATABASE_SSL=true
```

---

## 7. Database Persistence (Supabase PostgreSQL)

ORBITAL-SHIELD supports dual-mode persistence:
- **Zero-Friction In-Memory Mode**: If `DATABASE_URL` is omitted or the database is down, the system operates seamlessly in memory without blocking or throwing errors.
- **Persistent Production Mode**: Connects via `pg` connection pooler to Supabase PostgreSQL (`db/schema.sql`).

### Wired vs. Unwired Tables
| Table | Status | Description |
|---|---|---|
| `server_state` | **Wired** | Global mission clock (`mission_time`) & `active_mission_id`, auto-saved every 5s and restored on boot |
| `telemetry` | **Wired** | Buffered high-rate telemetry, flushed in 5-second multi-row batches (`<=600` buffer cap) |
| `fault_events` | **Wired** | Injected subsystem anomalies with start time, severity, and active/cleared tracking |
| `incident_events` | **Wired** | Chronological operator and anomaly audit log; queried on `/api/incidents` with in-memory fallback |
| `simulation_runs` | **Wired** | What-If simulation run records linked to the triggering fault event |
| `simulation_results`| **Wired** | 4 parallel recovery scenarios per simulation run (survival prob, reserves, thermal stability, timeline) |
| `operator_actions`| **Wired** | Audit trail of operator commands (e.g. `CLEAR_FAULTS`) |
| `missions` | **Wired (Seeded)**| Mission profiles (`OS-001`, `OS-002`, `OS-003`) |
| `spacecraft` | **Wired (Seeded)**| Spacecraft bus profiles (`AeroSat-Twin Mk IV`, `ChronoRelay Alpha`, `RadarAegis-3`) |
| `users` | Unwired | Schema ready for future RBAC authentication (Flight Director, Telemetry Operator, Observer) |
| `subsystems` | Unwired | Subsystem catalog schema ready for configurable limits |
| `anomalies` | Unwired | Dedicated out-of-family anomaly detections schema |
| `recovery_strategies`| Unwired | Command sequence reference templates |
| `system_alerts` | Unwired | Operator alert broadcast schema |
| `models` | Unwired | ML model registry metadata schema |

*Known runtime behavior note*: Each telemetry polling call advances the simulated clock by 1 second. If multiple browser tabs are open simultaneously, the clock will advance accordingly.

---

## 8. Model Lab (Offline Public ML Benchmarks)

Real-data models are trained **offline in Python** on public satellite datasets; Node only serves the benchmark outputs.

### Running Offline Training
```bash
# 1. Install Python ML requirements
pip install -r ml/requirements.txt

# 2. Train NASA PCoE battery aging model (Leave-One-Battery-Out regression)
# Data files placed in ml/data/nasa_battery/ (B0005.mat, B0006.mat, B0007.mat, B0018.mat)
python ml/train_battery.py

# 3. Train ESA OPSSAT-AD telemetry anomaly classifier
# Data file placed in ml/data/opssat/dataset.csv
python ml/train_opssat.py
```

### Viewing Results in UI
In the **Incident Log** tab, toggle the sub-view switcher to **"Model Lab (Offline ML Benchmark)"** to inspect:
- **NASA PCoE Battery Card**: Interactive SVG degradation curves (True SOH vs. GradientBoosting Predicted SOH) with cell selector (`B0005`, `B0006`, `B0007`, `B0018`), per-cell MAE vs. dummy baseline, and `● BEATS BASELINE` indicators.
- **ESA OPSSAT-AD Card**: Precision, recall, F1, ROC-AUC, balanced accuracy, and a labeled 2x2 confusion matrix (TN/FP/FN/TP) alongside top predictive telemetry channels.

### Dataset Credits & Citations
- **NASA Ames Prognostics Center of Excellence (PCoE)**: Li-ion Battery Aging Datasets (B0005, B0006, B0007, B0018), NASA Dashlink.
- **ESA OPSSAT-AD**: Ruszczak, Kotowski, Evans, Nalepa — *The OPS-SAT benchmark for detecting anomalies in satellite telemetry* (Zenodo record 12588359, arXiv:2407.04730).
- **ESA-ADB**: Kotowski et al. — *European Space Agency Benchmark for Anomaly Detection in Satellite Telemetry* (arXiv:2406.17826).

---

## 9. Local Development & Build

```bash
# Install dependencies
npm install

# Start development server (Express backend + Vite middleware on port 3000)
npm run dev

# Compile and type-check
npm run build
npm run lint

# Production start
npm start
```

