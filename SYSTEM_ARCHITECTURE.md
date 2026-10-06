# ORBITAL-SHIELD — Complete System & Software Architecture Manual

> **Mission Objective:** Autonomous Satellite Digital Twin, Predictive Subsystem Health, and Closed-Loop Anomaly Mitigation for Spacecraft in Low Earth Orbit (LEO).
> **Challenge:** ST-09 Hackathon Winning Reference Architecture.

---

## 1. Executive Summary & Mission Overview

**ORBITAL-SHIELD** is an enterprise-grade, mission-critical Autonomous Spacecraft Digital Twin platform designed to detect, diagnose, explain, and mitigate cross-subsystem cascading anomalies before they cause irreversible mission loss.

In traditional satellite operations, ground operators monitor scalar threshold alarms (e.g., `voltage < 24.0V`). However, modern spacecraft subsystems are tightly coupled:
- A rise in **Battery Cell Internal Resistance ($R_{int}$)** causes an unmodeled bus voltage sag.
- Constant-power DC-DC converters compensate by drawing higher current ($I = P/V$).
- Increased current induces **Joule Heating ($I^2 R$)** within the Power Distribution Unit (PDU).
- Elevated temperature causes thermal radiator saturation, throttling the **Scientific Multispectral Payload**.
- Under-voltage degrades **S-Band RF Power Amplifier (TWTA/SSPA)** output, eroding downlink link margin to near total communication blackout.

ORBITAL-SHIELD eliminates blind spots by pairing live telemetry with an independent analytical **Nominal Digital Twin Model**, detecting subtle residual divergences via **EWMA Statistical Filtering**, mapping failures through an interactive **Causal Physics Graph**, and testing automated interventions via **Grounded What-If Simulation** with **Closed-Loop Verification**.

---

## 2. Complete Technology Stack

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ORBITAL-SHIELD TECH STACK                             │
├──────────────────────┬───────────────────────────────────────────────────────────┤
│ Frontend Core        │ React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Motion │
│ 3D Spatial Graphics  │ Three.js (r186), ACES Filmic Tone Mapping, PBR Shaders    │
│ Backend Service      │ Node.js 22+, Express 4, TypeScript (tsx runtime), REST     │
│ Persistence Layer    │ PostgreSQL (pg client) with resilient In-Memory Store      │
│ Digital Twin Physics │ Analytical LEO Orbital Mechanics, Solar Flux, EWMA Hyst.  │
│ Machine Learning     │ Python 3.10+, Scikit-learn, Pandas, NumPy, SciPy, Joblib  │
│ Generative AI / LLM  │ Groq Cloud (llama-3.3-70b-versatile), Google Gemini 3.8   │
│ UI & Design Tokens   │ Lucide React, Chakra Petch & JetBrains Mono Fonts         │
└──────────────────────┴───────────────────────────────────────────────────────────┘
```

### Detailed Component Inventory

1. **Frontend Architecture:**
   - **Framework:** React 19 with strict TypeScript typing and zero external state bloat.
   - **Styling:** Tailwind CSS v4 utilizing CSS custom variables and an Aerospace Dark HUD theme.
   - **Micro-Animations:** Motion (`motion/react`) for smooth physics transitions, cascade edge pulses, and drawer expansions.
   - **Icons:** `lucide-react` for mission-control telemetry symbology.

2. **3D Visualization Engine:**
   - **Three.js (r186):** Realistic satellite rendering with ACES Filmic Tone Mapping, physically-based materials (PBR), specular solar panel arrays, thermal radiator fins, and directional solar illumination.
   - **Subsystem Raycasting:** Real-time pointer intersection detecting hovered/selected modules (Power, Thermal, RF, AOCS, Payload).
   - **2D Schematic Fallback:** Procedural SVG engineering schematic rendered seamlessly if WebGL is disabled or on lower-power devices.

3. **Backend Service & API:**
   - **Runtime:** Node.js with `tsx` for TypeScript execution without ahead-of-time build steps during development.
   - **Framework:** Express.js 4 delivering high-throughput JSON endpoints.
   - **Reliability:** Built-in dual-mode storage. If PostgreSQL (`DATABASE_URL`) is unavailable, it automatically drops back to an in-memory transactional mock array (`memoryIncidents[]`, `activeFaults[]`).

4. **Machine Learning Pipeline (Python):**
   - **Python Virtual Environment:** Isolated `.venv` with `scikit-learn>=1.3.0`, `pandas>=2.0.0`, `numpy>=1.24.0`, `scipy>=1.10.0`, `joblib>=1.3.0`.
   - **Model A (NASA PCoE Li-ion Battery SOH):** `GradientBoostingRegressor` trained on NASA Ames battery aging run-to-failure cycles.
   - **Model B (ESA OPS-SAT Telemetry Anomaly Detection):** `HistGradientBoostingClassifier` trained on European Space Agency OPS-SAT telemetry features.
   - **Microservice:** `ml/index.py` delivering model artifacts to the UI via `/api/ml/benchmark`.

5. **Artificial Intelligence Engine:**
   - **Primary Model:** Groq Cloud high-speed inference running `llama-3.3-70b-versatile`.
   - **Fallback Model:** Google GenAI (`@google/genai`) running `gemini-3.8-flash`.
   - **Deterministic Fallback:** Rule-based aerospace reasoning engine ensuring complete offline functionality without requiring API keys.

---

## 3. High-Level System Architecture

```text
                                  ┌───────────────────────────────┐
                                  │   Low Earth Orbit Simulator   │
                                  │ (Altitude 550km, Period 92m)  │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │ 1.0 Hz Physical Telemetry Gen │
                                  │  Bus V, Temp, Margin, AOCS    │
                                  └───────┬───────────────┬───────┘
                                          │               │
                     ┌────────────────────┘               └────────────────────┐
                     ▼                                                         ▼
       ┌───────────────────────────┐                             ┌───────────────────────────┐
       │   EXPRESS BACKEND SERVER  │                             │  CLIENT-SIDE DIGITAL TWIN │
       │        (server.ts)        │                             │      (twinModel.ts)       │
       ├───────────────────────────┤                             ├───────────────────────────┤
       │ • Fault Injection Engine  │                             │ • Pure Nominal Estimator  │
       │ • What-If Forward Sim     │                             │ • Residual Generator e(t) │
       │ • AI Diagnostic Synthesis │                             │ • EWMA Hysteresis Filter  │
       │ • Incident Audit Log      │                             │ • Closed-Loop Verifier    │
       └─────────────┬─────────────┘                             └─────────────┬─────────────┘
                     │                                                         │
                     └────────────────────────────┬────────────────────────────┘
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │   ORBITAL-SHIELD UI CONSOLE   │
                                  ├───────────────────────────────┤
                                  │ 1. 3D Twin HUD & Raycaster    │
                                  │ 2. F1 Twin vs Reality Chart   │
                                  │ 3. F2 EWMA Detector Chip      │
                                  │ 4. Causal Propagation Graph   │
                                  │ 5. What-If Simulation Lab     │
                                  │ 6. Model Lab (NASA / OPS-SAT) │
                                  └───────────────────────────────┘
```

### Telemetry Pipeline Data Flow

1. **Ingestion & Orbit Propagation:**
   - Time moves in Mission Elapsed Time (`MET`).
   - Orbit position propagates at $\omega = \frac{2\pi}{5520\text{ s}}$.
   - Eclipse occurs between orbit progress $0.55 \le \text{prog} \le 0.90$. In eclipse, solar generation falls from $420\text{W} \to 0\text{W}$.
2. **Nominal State Calculation:**
   - In parallel, `twinModel.ts` computes the exact expected voltage $\hat{V}_{\text{bus}}(t)$ and temperature $\hat{T}_{\text{batt}}(t)$ for a healthy satellite.
3. **Residual Generation:**
   - Residual $r(t) = y_{\text{meas}}(t) - \hat{y}_{\text{nom}}(t)$ is derived at every 1-second tick.
4. **Statistical Filtering:**
   - The EWMA detector smooths high-frequency sensor noise and tests persistence against safety bands.
5. **UI Synchronization:**
   - 3D spacecraft shader emissions update dynamically (green $\to$ yellow $\to$ red).
   - Telemetry HUD charts render live data along with twin comparison traces.

---

## 4. Project Directory Structure

```text
ORBITAL-SHIELD/blueprint/
├── .env.example                 # Template for PORT, GROQ_API_KEY, DATABASE_URL
├── .gitignore                   # Excludes node_modules, dist, .venv, *.joblib
├── CREATED.md                   # Formal Architectural Audit & Change Decision Record
├── package.json                 # Node dependencies and build scripts
├── README.md                    # Primary user manual, presentation demo guide, tech stack
├── server.ts                    # Express backend, physics generator, What-If simulation
├── SYSTEM_ARCHITECTURE.md       # Comprehensive system architecture & implementation manual
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite bundler configuration with Tailwind plugin
│
├── ml/                          # Machine Learning Subsystem (Python)
│   ├── data/
│   │   ├── nasa_battery/        # NASA PCoE .mat battery cycle discharge files
│   │   └── opssat/              # ESA OPS-SAT telemetry dataset.csv
│   ├── index.py                 # Lightweight Python HTTP microservice
│   ├── requirements.txt         # Python dependencies (scikit-learn, pandas, scipy, joblib)
│   ├── train_battery.py         # LOBO Gradient Boosting Regressor for Battery SOH
│   └── train_opssat.py          # HistGradientBoosting anomaly classifier for OPS-SAT
│
├── models/                      # Serialized ML Artifacts (Trained)
│   ├── battery_replay.json      # SOH cycle-by-cycle predictions for UI Model Lab
│   ├── battery_soh.joblib       # Trained Scikit-learn battery model binary
│   ├── battery_soh.metrics.json # Quantitative test metrics (MAE, RMSE vs dummy)
│   ├── opssat_anomaly.joblib    # Trained ESA anomaly detector binary
│   └── opssat_anomaly.metrics.json # Precision, recall, F1, ROC-AUC metrics
│
└── src/                         # Frontend Application (React 19 + TypeScript)
    ├── App.tsx                  # Master application orchestrator, state manager
    ├── index.css                # Global CSS, theme colors, typography
    ├── main.tsx                 # React DOM mount point
    │
    ├── components/              # UI Subsystem Views
    │   ├── AIAnalysisPanel.tsx          # 3-tier Grounded AI (Observed, Predicted, Recommended)
    │   ├── CascadingFailureGraph.tsx    # Interactive physics dependency graph & edge inspector
    │   ├── DemoScenarioController.tsx   # 8-step deterministic presentation sequence
    │   ├── FaultInjectionCenter.tsx     # Precision fault trigger controls
    │   ├── HeroSection.tsx              # Cockpit header, Digital Twin Sync, Live Detector Chip
    │   ├── IncidentHistoryView.tsx      # Chronological incident audit log & Model Lab tab
    │   ├── ModelLabView.tsx             # Interactive visualization of NASA & ESA ML benchmarks
    │   ├── SpacecraftViewer3D.tsx       # Three.js 3D satellite visualization & 2D fallback
    │   ├── TelemetryCharts.tsx          # F1 Twin vs Reality charts & lower residual strip
    │   ├── TopNavBar.tsx                # Strict 5-tab mission control top navigation
    │   └── WhatIfSimulationLab.tsx      # Grounded multi-scenario lab & Closed-Loop recovery
    │
    └── services/                # Business Logic & Math
        ├── api.ts               # Typed client fetch wrappers with in-memory fallbacks
        └── twinModel.ts         # Nominal physics twin, EWMA filter, Sync, Closed-Loop Verifier
```

---

## 5. Detailed Component & Code Architecture

### 5.1. Analytical Nominal Twin ([`src/services/twinModel.ts`](file:///c:/Users/Saishuklesh/OneDrive/Desktop/HACKTHONS/ORBIT-SHIELD/blueprint/src/services/twinModel.ts))

The digital twin runs a closed-form nominal physics model calibrated for a 550 km Sun-Synchronous orbit:

```typescript
export function calculateNominalPrediction(missionTime: number, inEclipse: boolean, orbitProgress: number): NominalPrediction {
  // Bus Voltage: 28.2V baseline, drops 0.4V during eclipse, orbital harmonic variation
  const baseVoltage = 28.2;
  const eclipseDrop = inEclipse ? 0.4 : 0.0;
  const orbitalHarmonic = 0.1 * Math.sin(orbitProgress * Math.PI * 2);
  const busVoltage = Number((baseVoltage - eclipseDrop + orbitalHarmonic).toFixed(2));

  // Battery Core Temp: 20°C baseline, rises +3.5°C in sunlight, sinusoidal diurnal swing
  const baseTemp = 20.0;
  const solarThermalFlux = inEclipse ? 0.0 : 3.5;
  const thermalWave = 1.2 * Math.sin(orbitProgress * Math.PI * 2 - Math.PI / 4);
  const batteryTemp = Number((baseTemp + solarThermalFlux + thermalWave).toFixed(2));

  return { busVoltage, batteryTemp, solarArrayDraw: inEclipse ? 0 : 380, batterySoc: inEclipse ? 78 : 95 };
}
```

### 5.2. EWMA Residual Anomaly Detector with Hysteresis

To eliminate sensor noise false alarms, the residual error $r(t) = y(t) - \hat{y}(t)$ is filtered using an Exponentially Weighted Moving Average (EWMA):

$$S_t = \alpha \cdot |r_t| + (1 - \alpha) \cdot S_{t-1} \quad \text{with } \alpha = 0.30$$

#### Dual Hysteresis Thresholds:
| Subsystem Channel | Watch Threshold | Anomaly Threshold | Units |
|---|---|---|---|
| **Main Bus Voltage** | $\pm 0.85$ | $\pm 1.80$ | Volts ($\text{V}$) |
| **Battery Core Temp** | $\pm 1.20$ | $\pm 2.80$ | Celsius ($^\circ\text{C}$) |

#### Persistence Filter Rules:
1. **Transition to `WATCH`**: Residual must exceed the Watch threshold for **$\ge 3$ consecutive seconds**.
2. **Transition to `ANOMALY`**: Residual must exceed the Anomaly threshold for **$\ge 3$ consecutive seconds**.
3. **Transition to `NOMINAL`**: Smoothed residual must fall below Watch threshold for **$\ge 5$ consecutive seconds**. This prevents alarm flapping on the boundary.

### 5.3. Causal Propagation Graph ("WHY It Propagated")

Located in [`src/components/CascadingFailureGraph.tsx`](file:///c:/Users/Saishuklesh/OneDrive/Desktop/HACKTHONS/ORBIT-SHIELD/blueprint/src/components/CascadingFailureGraph.tsx), the graph models physical cross-subsystem coupling:

```text
[Battery Degradation]
         │ (High internal impedance: V_bus = E_cell - I * R_int)
         ▼
    [Main Power Bus]
         ├─── (Constant Power: I = P / V_bus → I^2*R Joule heating) ───► [Thermal Loop]
         │                                                                   │ (Radiator saturation)
         │                                                                   ▼
         ├─── (Under-voltage lockout at 24.0V) ────────────────────────► [Payload Rail]
         │
         └─── (TWTA amplifier drive current starvation) ───────────────► [RF Communications]
```

Clicking any edge in the UI opens the **Causal Propagation Inspector** detailing:
1. **Root Cause Mechanism**: Underlying electro-chemical or mechanical failure trigger.
2. **Measured Telemetry Evidence**: Live sensor readings compared against nominal baseline.
3. **Coupling Model Relationship**: First-principles physical equations governing the interaction.
4. **Downstream Consequence**: Cascading failure vector across mission objectives.

### 5.4. Grounded What-If Simulation Engine ([`server.ts`](file:///c:/Users/Saishuklesh/OneDrive/Desktop/HACKTHONS/ORBIT-SHIELD/blueprint/server.ts))

When the user simulates recovery, the backend does **not** load pre-rendered static curves. It extracts the **live spacecraft state** and computes forward trajectories:
- **Scenario A (Safe Power Mode - Recommended):** Shuts down payload ($340\text{W} \to 0\text{W}$), biases solar array drive $+12^\circ$ for maximum sun capture, bus stabilizes at $28.4\text{V}$, survival probability $96.8\%$.
- **Scenario B (Duty-Cycle Payload):** Restricts imaging to 25% duty cycle, bus stabilizes at tight margin ($24.8\text{V}$), survival probability $78.2\%$.
- **Scenario C (Maintain Current Config - Do Nothing):** Bus collapses below $21.5\text{V}$ during eclipse entry at $T+18\text{m}$, total mission blackout ($0.0\%$ survival).

### 5.5. Closed-Loop Recovery Verification

Sending a command in space does not guarantee recovery. The digital twin enforces closed-loop verification:
1. **Pre-Recovery Snapshot**: Captures frozen baseline ($V_{\text{bus}} = 23.8\text{V}, T_{\text{batt}} = 38.4^\circ\text{C}$).
2. **Command Dispatch**: Executes `CMD-PWR-04` (Safe Power Configuration).
3. **Real-Time Convergence Audit**: Continuously evaluates incoming telemetry against four safety envelopes:
   - $V_{\text{bus}} \ge 24.5\text{V}$ (Nominal bus ceiling).
   - $T_{\text{batt}} \le 34.0^\circ\text{C}$ (Thermal safe envelope).
   - $\text{Link Margin} \ge 3.5\text{ dB}$ (RF link closure).
   - $\text{Payload} \ge 45.0\text{ MB/s}$ (Duty-cycled science output).
4. **Confirmation**: Emits `MISSION STATE: STABILIZED` with verifiable before $\to$ after deltas.

---

## 6. Machine Learning Pipeline Details

### 6.1. Model A: NASA PCoE Battery Degradation Regression
- **Script:** [`ml/train_battery.py`](file:///c:/Users/Saishuklesh/OneDrive/Desktop/HACKTHONS/ORBIT-SHIELD/blueprint/ml/train_battery.py)
- **Dataset:** NASA Ames Prognostics Center of Excellence (PCoE) 18650 Li-ion cells (`B0005`, `B0006`, `B0007`, `B0018`).
- **Features Extracted:**
  - `v_mean_ratio`: Mean discharge voltage normalized against cycle 1.
  - `v_end_ratio`: End-of-discharge voltage ratio.
  - `t_mean_delta`: Thermal rise rate during initial 600-second discharge.
- **Evaluation:** Rigorous **Leave-One-Battery-Out (LOBO)** cross-validation.
- **Benchmark Results:**
  - Mean Absolute Error (MAE): **0.0422** (significantly outperforms the baseline dummy predictor of **0.0859**).
  - Saved Artifact: `models/battery_soh.joblib` and `models/battery_replay.json`.

### 6.2. Model B: ESA OPS-SAT Spacecraft Telemetry Anomaly Detection
- **Script:** [`ml/train_opssat.py`](file:///c:/Users/Saishuklesh/OneDrive/Desktop/HACKTHONS/ORBIT-SHIELD/blueprint/ml/train_opssat.py)
- **Dataset:** European Space Agency (ESA) OPS-SAT CubeSat operational telemetry dataset (`dataset.csv`).
- **Features Extracted (19 total):** Rolling mean, variance, standard deviation, skewness, kurtosis, peak count, smoothed peak differentials.
- **Model Architecture:** `HistGradientBoostingClassifier` with `StandardScaler` pipeline.
- **Benchmark Results:**
  - **ROC-AUC:** **99.02%**
  - **F1 Score:** **0.899**
  - **Balanced Accuracy:** **93.7%**
  - Saved Artifact: `models/opssat_anomaly.joblib` and `models/opssat_anomaly.metrics.json`.

### 6.3. How to Run the Python Machine Learning Pipelines
To re-train the models and generate new JSON benchmark artifacts, run:

```powershell
# 1. Activate project virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Train NASA Battery SOH Model
python ml/train_battery.py

# 3. Train ESA OPS-SAT Anomaly Detection Model
python ml/train_opssat.py
```

---

## 7. Judge Presentation & Technical Defense (Q&A)

### Q1: "How is this an actual Digital Twin and not just a dashboard displaying telemetry?"
> **Defense:**
> *"A dashboard merely plots incoming numbers. ORBITAL-SHIELD executes an independent, analytical mathematical twin (`twinModel.ts`) running in parallel with reality. We evaluate the residual error vector $r(t) = y_{\text{measured}}(t) - \hat{y}_{\text{nominal}}(t)$ at every second. If internal battery impedance degrades, the physical sensor sags while the nominal model stays at nominal. Anomaly detection is performed on this divergence, catching degradation before hard safety limit cutoffs are reached."*

### Q2: "Why did you use EWMA with Hysteresis instead of standard threshold alerts?"
> **Defense:**
> *"Spacecraft telemetry contains transient spikes caused by payload shutter activation, reaction wheel desaturation pulses, and solar array tracking slews. Simple scalar thresholds cause alert fatigue through false positives. Our EWMA filter ($\alpha = 0.30$) requires sustained residual divergence across $\ge 3$ consecutive samples to enter WATCH or ANOMALY, and demands $\ge 5$ consecutive nominal samples to clear. This provides rock-solid noise immunity."*

### Q3: "How does your What-If simulation produce realistic outcomes?"
> **Defense:**
> *"Our simulation engine (`server.ts`) takes the live, current telemetry point as initial boundary conditions. It calculates orbital shadow entry timing ($T+18\text{m}$) and models subsystem power draw under different command procedures. Under Safe Power Mode, payload shedding drops draw from $340\text{W}$ to $0\text{W}$, keeping battery discharge within safe thermal limits. The simulation is mathematically grounded in the live state of the spacecraft."*

### Q4: "What happens if external databases or AI APIs go down during orbital operations?"
> **Defense:**
> *"The system is built on fail-safe aerospace design principles. If PostgreSQL is offline, `server.ts` seamlessly switches to an internal transactional memory store. If the Groq or Gemini API is unreachable, a deterministic aerospace rule-based reasoning engine takes over, ensuring zero downtime and zero hallucination."*

---

*Authored for ORBITAL-SHIELD (ST-09 Winning Reference Implementation).*
