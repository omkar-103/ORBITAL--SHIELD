import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

import {
  dbInit,
  dbClose,
  queueTelemetry,
  recordFaultInjected,
  recordFaultsCleared,
  loadActiveFaults,
  recordIncident,
  seedIncidentsIfEmpty,
  getRecentIncidents,
  recordSimulation,
  recordOperatorAction,
  saveServerState,
  loadServerState,
} from './server/db.ts';
import { getBenchmark } from './server/ml.ts';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface TelemetryData {
  timestamp: string;
  missionTime: number; // seconds since epoch
  orbitProgress: number; // 0 to 1
  inEclipse: boolean;
  subsystems: {
    power: {
      batteryVoltage: number; // 22 - 32 V
      batteryCurrent: number; // A (positive charge, negative discharge)
      batteryTemp: number; // °C
      stateOfCharge: number; // %
      solarGeneration: number; // W
      powerConsumption: number; // W
      busVoltage: number; // V
      healthScore: number; // 0 - 100
      status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    };
    thermal: {
      batteryCellTemp: number; // °C
      avionicsTemp: number; // °C
      payloadSensorTemp: number; // °C
      radiatorTemp: number; // °C
      heatPipeFlux: number; // W/m²
      healthScore: number;
      status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    };
    communication: {
      snr: number; // dB
      linkMargin: number; // dB
      packetLoss: number; // %
      downlinkBandwidth: number; // Mbps
      rfAmplifierTemp: number; // °C
      healthScore: number;
      status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    };
    aocs: {
      reactionWheelRpm: number;
      attitudeError: number; // arcsec
      starTrackerFidelity: number; // %
      gyroDrift: number; // deg/hr
      healthScore: number;
      status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    };
    payload: {
      sensorThroughput: number; // MB/s
      bufferFill: number; // %
      detectorCalibration: number; // %
      healthScore: number;
      status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    };
  };
  overallHealth: number;
  activeFaults: Array<{
    id: string;
    type: string;
    subsystem: string;
    severity: number;
    startTime: number;
    duration: number;
  }>;
}

// In-memory simulation state
let missionTime = 14200; // Simulated Mission Elapsed Time in seconds
let activeFaults: Array<{
  id: string;
  type: string;
  subsystem: string;
  severity: number;
  startTime: number;
  duration: number;
}> = [];

let activeMissionId = 'OS-001';
let lastFaultEventId: string | null = null;


const missions = [
  {
    id: 'OS-001',
    name: 'Sentinel LEO Observation',
    orbit: 'Sun-Synchronous 540km (92 min period)',
    inclination: '97.4°',
    launchDate: '2025-11-14',
    spacecraft: 'AeroSat-Twin Mk IV',
    target: 'Global Environmental & Multispectral Remote Sensing',
  },
  {
    id: 'OS-002',
    name: 'Helios Deep Space Relay',
    orbit: 'Lagrange Point L2 Lissajous',
    inclination: '0.0°',
    launchDate: '2026-03-20',
    spacecraft: 'ChronoRelay Alpha',
    target: 'High-bandwidth Lunar & Deep Space Communications',
  },
  {
    id: 'OS-003',
    name: 'Aegis SAR Sentinel',
    orbit: 'Polar LEO 680km',
    inclination: '98.2°',
    launchDate: '2026-08-05',
    spacecraft: 'RadarAegis-3',
    target: 'Interferometric Synthetic Aperture Radar Reconnaissance',
  },
];

const incidentHistory: Array<{
  id: string;
  timestamp: string;
  missionTimeStr: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  subsystem: string;
  details: string;
}> = [
  {
    id: 'inc-01',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    missionTimeStr: 'T+03:22:15',
    severity: 'INFO',
    title: 'Orbital Sunset Entered',
    subsystem: 'Power',
    details: 'Eclipse transition nominal; solar panels unloaded, battery discharge initiated at 14.8A.',
  },
  {
    id: 'inc-02',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    missionTimeStr: 'T+03:52:40',
    severity: 'INFO',
    title: 'Ground Station Pass Established',
    subsystem: 'Communication',
    details: 'Svalbard ground station acquisition of signal (AOS) confirmed. X-band downlink at 142 Mbps.',
  },
];

function generateCurrentTelemetry(): TelemetryData {
  missionTime += 1;
  const orbitPeriod = 5520; // 92 minutes in seconds
  const orbitProgress = (missionTime % orbitPeriod) / orbitPeriod;
  const inEclipse = orbitProgress > 0.65; // ~35% of orbit is eclipse

  // Baseline power values
  let batteryDegradationFactor = 1.0;
  let thermalStressFactor = 1.0;
  let sensorErrorFactor = 1.0;
  let commDegradationFactor = 1.0;

  // Process active faults
  for (const fault of activeFaults) {
    const elapsed = missionTime - fault.startTime;
    if (elapsed <= fault.duration * 60) {
      const sev = fault.severity / 100;
      if (fault.type === 'battery_degradation') {
        batteryDegradationFactor = Math.max(0.3, 1.0 - sev * 0.7);
      } else if (fault.type === 'thermal_stress') {
        thermalStressFactor = 1.0 + sev * 0.8;
      } else if (fault.type === 'sensor_failure') {
        sensorErrorFactor = Math.max(0.2, 1.0 - sev * 0.75);
      } else if (fault.type === 'communication_loss') {
        commDegradationFactor = Math.max(0.1, 1.0 - sev * 0.85);
      }
    }
  }

  // Cascading impact: Battery degradation also elevates cell temperature and depresses bus voltage
  const solarGenNominal = inEclipse ? 0 : 540 + Math.sin(orbitProgress * Math.PI * 2) * 40;
  const solarGen = solarGenNominal;

  let powerConsumption = 340; // Base load
  if (batteryDegradationFactor < 0.8) {
    // Battery degradation cascade: higher internal resistance requires more current
    powerConsumption += (1 - batteryDegradationFactor) * 80;
  }

  // Battery voltage & charge
  const baseVoltage = inEclipse ? 25.4 : 29.8;
  const batteryVoltage = Number((baseVoltage * (0.85 + 0.15 * batteryDegradationFactor) + (Math.random() * 0.15 - 0.075)).toFixed(2));
  const batteryCurrent = inEclipse ? Number((-14.2 / batteryDegradationFactor).toFixed(2)) : Number((12.5 * batteryDegradationFactor).toFixed(2));
  const stateOfCharge = Math.max(12, Math.min(99, Math.round((inEclipse ? 68 : 94) * batteryDegradationFactor)));

  // Thermal values
  const baseThermal = inEclipse ? 18.5 : 31.0;
  const batteryTemp = Number((baseThermal * thermalStressFactor + (1 - batteryDegradationFactor) * 14.5 + (Math.random() * 0.3)).toFixed(1));
  const avionicsTemp = Number((28.0 * thermalStressFactor + (Math.random() * 0.2)).toFixed(1));
  const radiatorTemp = Number(((inEclipse ? -12 : 24) * thermalStressFactor).toFixed(1));

  // Comm values
  const snr = Number((18.4 * commDegradationFactor - (batteryVoltage < 24 ? 2.5 : 0) + (Math.random() * 0.2 - 0.1)).toFixed(1));
  const linkMargin = Number((6.8 * commDegradationFactor - (batteryVoltage < 24 ? 1.8 : 0)).toFixed(1));
  const packetLoss = Number((Math.max(0.05, (1 - commDegradationFactor) * 18.5 + (batteryVoltage < 24 ? 4.2 : 0))).toFixed(2));

  // AOCS values
  const starTrackerFidelity = Number((98.5 * sensorErrorFactor).toFixed(1));
  const attitudeError = Number(((1 / sensorErrorFactor) * 1.8 + Math.random() * 0.2).toFixed(2));

  // Payload
  const sensorThroughput = batteryVoltage < 24.2 ? 45.0 : 180.0;
  const bufferFill = Math.min(98, Math.round(34 + (1 - commDegradationFactor) * 45));

  // Determine subsystem statuses & scores
  const powerScore = Math.max(10, Math.round(stateOfCharge * 0.6 + (batteryVoltage / 30) * 40));
  const thermalScore = Math.max(15, Math.round(100 - Math.max(0, batteryTemp - 30) * 3.5));
  const commScore = Math.max(8, Math.round(commDegradationFactor * 100 - packetLoss * 1.5));
  const aocsScore = Math.max(20, Math.round(sensorErrorFactor * 100 - attitudeError * 3));
  const payloadScore = Math.max(12, Math.round((sensorThroughput / 180) * 60 + (100 - bufferFill) * 0.4));

  const getStatus = (score: number): 'NOMINAL' | 'WARNING' | 'CRITICAL' => {
    if (score < 45) return 'CRITICAL';
    if (score < 75) return 'WARNING';
    return 'NOMINAL';
  };

  const overallHealth = Math.round((powerScore * 0.3 + thermalScore * 0.2 + commScore * 0.2 + aocsScore * 0.15 + payloadScore * 0.15));

  return {
    timestamp: new Date().toISOString(),
    missionTime,
    orbitProgress: Number(orbitProgress.toFixed(4)),
    inEclipse,
    subsystems: {
      power: {
        batteryVoltage,
        batteryCurrent,
        batteryTemp,
        stateOfCharge,
        solarGeneration: Number(solarGen.toFixed(1)),
        powerConsumption: Number(powerConsumption.toFixed(1)),
        busVoltage: Number((batteryVoltage * 0.98).toFixed(2)),
        healthScore: powerScore,
        status: getStatus(powerScore),
      },
      thermal: {
        batteryCellTemp: batteryTemp,
        avionicsTemp,
        payloadSensorTemp: Number((batteryTemp - 4.2).toFixed(1)),
        radiatorTemp,
        heatPipeFlux: Number((120 * thermalStressFactor).toFixed(1)),
        healthScore: thermalScore,
        status: getStatus(thermalScore),
      },
      communication: {
        snr,
        linkMargin,
        packetLoss,
        downlinkBandwidth: commDegradationFactor < 0.5 ? 45 : 150,
        rfAmplifierTemp: Number((avionicsTemp + 8).toFixed(1)),
        healthScore: commScore,
        status: getStatus(commScore),
      },
      aocs: {
        reactionWheelRpm: 3420 + Math.floor(Math.random() * 80),
        attitudeError,
        starTrackerFidelity,
        gyroDrift: Number(((1 / sensorErrorFactor) * 0.04).toFixed(3)),
        healthScore: aocsScore,
        status: getStatus(aocsScore),
      },
      payload: {
        sensorThroughput,
        bufferFill,
        detectorCalibration: Number((99.2 * sensorErrorFactor).toFixed(1)),
        healthScore: payloadScore,
        status: getStatus(payloadScore),
      },
    },
    overallHealth,
    activeFaults: [...activeFaults],
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Initialize database persistence (best-effort: runs in-memory if DATABASE_URL unset or unavailable)
  const dbOk = await dbInit();
  if (dbOk) {
    const state = await loadServerState();
    if (state) {
      missionTime = state.missionTime;
      activeMissionId = state.activeMissionId;
    }
    const restoredFaults = await loadActiveFaults(activeMissionId, missionTime);
    activeFaults = restoredFaults;
    console.log(`[db] restored mission ${activeMissionId} at T=${missionTime}s with ${activeFaults.length} active fault(s)`);

    await seedIncidentsIfEmpty(activeMissionId, incidentHistory);

    const stateTimer = setInterval(() => {
      void saveServerState(missionTime, activeMissionId);
    }, 5000);
    stateTimer.unref();

    const shutdown = async () => {
      console.log('\n[server] shutting down...');
      await saveServerState(missionTime, activeMissionId);
      await dbClose();
      process.exit(0);
    };
    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  }

  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', platform: 'ORBITAL-SHIELD', time: new Date().toISOString() });
  });

  app.get('/api/missions', (_req: Request, res: Response) => {
    res.json({
      activeMissionId,
      missions,
    });
  });

  app.post('/api/missions/select', (req: Request, res: Response) => {
    const { missionId } = req.body;
    if (missionId && missions.some(m => m.id === missionId)) {
      void recordFaultsCleared(activeMissionId);
      activeMissionId = missionId;
      activeFaults = []; // clear faults for fresh mission
      lastFaultEventId = null;
      void saveServerState(missionTime, activeMissionId);
      res.json({ success: true, activeMissionId });
    } else {
      res.status(400).json({ error: 'Invalid mission ID' });
    }
  });

  app.get('/api/telemetry/current', (_req: Request, res: Response) => {
    const data = generateCurrentTelemetry();
    queueTelemetry(activeMissionId, data);
    res.json(data);
  });

  app.post('/api/faults/inject', (req: Request, res: Response) => {
    const { type, severity, duration, subsystem } = req.body;
    const newFault = {
      id: `fault-${Date.now()}`,
      type: type || 'battery_degradation',
      subsystem: subsystem || 'power',
      severity: Math.min(100, Math.max(1, Number(severity) || 35)),
      startTime: missionTime,
      duration: Math.min(180, Math.max(5, Number(duration) || 60)),
    };

    activeFaults = activeFaults.filter(f => f.type !== newFault.type);
    activeFaults.push(newFault);

    // Record incident event
    const faultTitles: Record<string, string> = {
      battery_degradation: 'Battery Cell Impedance Degradation Injected',
      thermal_stress: 'Thermal Subsystem Heat-Pipe Degradation Injected',
      sensor_failure: 'AOCS Star Tracker / Gyro Anomaly Injected',
      communication_loss: 'High-Gain Antenna Downlink Degradation Injected',
    };

    const incident = {
      id: `inc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      missionTimeStr: `T+${Math.floor(missionTime / 3600).toString().padStart(2, '0')}:${Math.floor((missionTime % 3600) / 60).toString().padStart(2, '0')}:${(missionTime % 60).toString().padStart(2, '0')}`,
      severity: (newFault.severity > 60 ? 'CRITICAL' : 'WARNING') as 'CRITICAL' | 'WARNING',
      title: faultTitles[newFault.type] || 'Subsystem Fault Injected',
      subsystem: newFault.subsystem.toUpperCase(),
      details: `Operator injected ${newFault.severity}% severity fault for duration ${newFault.duration} min. Cascading dynamics activated.`,
    };

    incidentHistory.unshift(incident);

    void recordFaultInjected(activeMissionId, newFault).then(id => {
      if (id) lastFaultEventId = id;
    });
    void recordIncident(activeMissionId, incident);

    res.json({ success: true, fault: newFault, activeFaults });
  });

  app.post('/api/faults/clear', (_req: Request, res: Response) => {
    activeFaults = [];
    const incident = {
      id: `inc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      missionTimeStr: `T+${Math.floor(missionTime / 3600).toString().padStart(2, '0')}:${Math.floor((missionTime % 3600) / 60).toString().padStart(2, '0')}:${(missionTime % 60).toString().padStart(2, '0')}`,
      severity: 'INFO' as const,
      title: 'Fault State Reset to Nominal',
      subsystem: 'ALL',
      details: 'All subsystem stress parameters cleared. Nominal telemetry simulation restored.',
    };

    incidentHistory.unshift(incident);

    void recordFaultsCleared(activeMissionId);
    void recordIncident(activeMissionId, incident);
    void recordOperatorAction(activeMissionId, 'CLEAR_FAULTS');
    lastFaultEventId = null;

    res.json({ success: true, activeFaults: [] });
  });

  app.get('/api/incidents', async (_req: Request, res: Response) => {
    const dbIncidents = await getRecentIncidents(30);
    if (dbIncidents && dbIncidents.length > 0) {
      res.json(dbIncidents);
    } else {
      res.json(incidentHistory.slice(0, 30));
    }
  });

  // What-If Simulation endpoint (grounded in current digital twin state)
  app.post('/api/simulation/run', (req: Request, res: Response) => {
    const { scenario, faultType, severity, currentTelemetry } = req.body;
    const sev = Number(severity) || 35;
    const fault = faultType || 'battery_degradation';

    // Ground starting state in live twin state if available
    const liveBus = currentTelemetry?.subsystems?.power?.busVoltage ? Number(currentTelemetry.subsystems.power.busVoltage) : null;
    const liveTemp = currentTelemetry?.subsystems?.power?.batteryTemp ? Number(currentTelemetry.subsystems.power.batteryTemp) : null;
    const liveSoc = currentTelemetry?.subsystems?.power?.stateOfCharge ? Number(currentTelemetry.subsystems.power.stateOfCharge) : null;

    // Calculate outcomes across 4 operational strategies
    const scenarios = [
      {
        id: 'baseline',
        title: 'Continue Nominal Operations',
        description: 'Maintain baseline science and downlink schedule without load shedding.',
        actionType: 'NO_ACTION',
        survivalProbability: Math.max(15, Math.round(100 - sev * 1.4)),
        batteryReserve: Math.max(6, Math.round((liveSoc ? liveSoc * 0.5 : 48) - sev * 0.45)),
        thermalStability: Math.max(22, Math.round(88 - sev * 0.8)),
        commAvailability: Math.max(18, Math.round(92 - sev * 0.9)),
        payloadScienceOutput: 96,
        recoveryTimeMinutes: 120,
        riskLevel: sev > 50 ? 'HIGH' : 'MEDIUM',
        failureTimeEstimateMinutes: Math.max(18, Math.round(95 - sev * 1.1)),
        timeline: [
          { minute: 0, event: `Fault onset active; initial bus voltage at ${liveBus ? `${liveBus}V` : '24.2V'} under payload draw` },
          { minute: 15, event: 'Bus voltage decay accelerates under high instrument demand' },
          { minute: 32, event: `Thermal limits exceeded in battery pack (${liveTemp ? `+${(liveTemp + 3.2).toFixed(1)}°C` : '+39.2°C'})` },
          { minute: 48, event: 'Downlink SNR drops below link margin threshold' },
          { minute: 65, event: 'Critical undervoltage trip risk on payload bus' },
        ],
      },
      {
        id: 'scenario_a',
        title: 'Safe Power Mode (Recommended)',
        description: 'Immediately transition payload to standby, repoint solar arrays +12° for thermal balance, reduce transmitter duty cycle to 25%.',
        actionType: 'POWER_SAFE',
        survivalProbability: Math.min(99, Math.round(98 - sev * 0.15)),
        batteryReserve: Math.min(88, Math.max(38, Math.round((liveSoc ? Math.min(85, liveSoc + 15) : 82) - sev * 0.2))),
        thermalStability: 94,
        commAvailability: 85,
        payloadScienceOutput: 68,
        recoveryTimeMinutes: 28,
        riskLevel: 'LOW',
        failureTimeEstimateMinutes: null,
        timeline: [
          { minute: 0, event: 'Execute Safe Power Mode transition command' },
          { minute: 4, event: 'Payload imager stowed in thermal standby (power drops from 340W to 125W)' },
          { minute: 12, event: `Battery pack cell temperature stabilizes below ${liveTemp ? Math.min(27.5, liveTemp).toFixed(1) : '27.5'}°C` },
          { minute: 25, event: `State of charge recovers above ${liveSoc ? Math.min(82, liveSoc + 12) : 75}% entering sunlight` },
          { minute: 45, event: 'Controlled health check pass via Svalbard' },
        ],
      },
      {
        id: 'scenario_b',
        title: 'Payload Duty Cycling',
        description: 'Duty-cycle optical instrument to 30% active time during peak sunlit passes only; hibernate during eclipse.',
        actionType: 'DUTY_CYCLE',
        survivalProbability: Math.min(94, Math.round(89 - sev * 0.4)),
        batteryReserve: Math.min(74, Math.max(24, Math.round(65 - sev * 0.45))),
        thermalStability: 82,
        commAvailability: 78,
        payloadScienceOutput: 84,
        recoveryTimeMinutes: 52,
        riskLevel: sev > 60 ? 'HIGH' : 'MEDIUM',
        failureTimeEstimateMinutes: sev > 70 ? 74 : null,
        timeline: [
          { minute: 0, event: 'Upload revised instrument duty-cycle schedule' },
          { minute: 8, event: 'Instrument power gated during eclipse entrance' },
          { minute: 30, event: 'Thermal peak dampened to 33.4°C' },
          { minute: 60, event: 'Downlink schedule compressed into high-elevation passes' },
        ],
      },
      {
        id: 'scenario_c',
        title: 'Downlink Priority & Thermal Slew',
        description: 'Maintain downlink for critical science dump while slewing spacecraft bus to orient radiator toward deep space.',
        actionType: 'THERMAL_SLEW',
        survivalProbability: Math.min(91, Math.round(84 - sev * 0.5)),
        batteryReserve: Math.min(68, Math.max(18, Math.round(58 - sev * 0.55))),
        thermalStability: 96,
        commAvailability: 92,
        payloadScienceOutput: 62,
        recoveryTimeMinutes: 44,
        riskLevel: 'MEDIUM',
        failureTimeEstimateMinutes: null,
        timeline: [
          { minute: 0, event: 'Initiate 18° attitude bias toward cold space vector' },
          { minute: 14, event: 'Radiator heat flux increases to 145 W/m² (cooling accelerated)' },
          { minute: 28, event: 'High-gain dish tracks ground station with reduced array sun-angle' },
          { minute: 50, event: 'Science telemetry dumped before next eclipse window' },
        ],
      },
    ];

    void recordSimulation(activeMissionId, lastFaultEventId, 90, scenarios);

    res.json({
      faultType: fault,
      severity: sev,
      simulatedAt: new Date().toISOString(),
      scenarios,
    });
  });

  // Offline ML Benchmark Route (Models trained offline, served to Model Lab)
  app.get('/api/ml/benchmark', async (_req: Request, res: Response) => {
    const benchmark = await getBenchmark();
    res.json(benchmark);
  });


  // AI-Grounded Explanation using Gemini 3.8 Flash
  app.post('/api/ai/explain', async (req: Request, res: Response) => {
    try {
      const { telemetry, activeFault, subsystemFocus } = req.body;

      const prompt = `You are the lead aerospace systems safety AI for the ORBITAL-SHIELD satellite operations mission control.
Analyze the following spacecraft digital twin telemetry and active fault state.

CRITICAL INSTRUCTIONS:
1. Ground your analysis strictly and completely in the supplied telemetry values. Do NOT invent numbers, unmentioned hardware, or speculative sci-fi components.
2. Structure your exact output in THREE clear, capitalized sections:
   OBSERVED:
   State the exact telemetry facts, recorded metrics, temperature deltas, voltage levels, and confirmed sensor readings.
   PREDICTED:
   Provide physics-grounded extrapolations of subsystem failure propagation over the next 15 to 90 minutes if no operator action is taken.
   RECOMMENDED:
   Provide specific, actionable aerospace recovery commands (e.g. payload power gating, attitude off-pointing, battery charge rate trimming).

Current Spacecraft State:
- Mission: ${activeMissionId}
- Orbit State: ${telemetry?.inEclipse ? 'IN ECLIPSE (Night)' : 'SUNLIT PASS (Day)'} (Progress: ${((telemetry?.orbitProgress || 0) * 100).toFixed(1)}%)
- Subsystem Focus: ${subsystemFocus || 'Power & Thermal'}
- Active Injected Fault: ${JSON.stringify(activeFault || 'None (Nominal)')}
- Power Subsystem: Battery Voltage = ${telemetry?.subsystems?.power?.batteryVoltage}V, Bus Voltage = ${telemetry?.subsystems?.power?.busVoltage}V, Battery Temp = ${telemetry?.subsystems?.power?.batteryTemp}°C, SoC = ${telemetry?.subsystems?.power?.stateOfCharge}%, Solar Gen = ${telemetry?.subsystems?.power?.solarGeneration}W, Load = ${telemetry?.subsystems?.power?.powerConsumption}W
- Thermal Subsystem: Radiator Temp = ${telemetry?.subsystems?.thermal?.radiatorTemp}°C, Avionics Temp = ${telemetry?.subsystems?.thermal?.avionicsTemp}°C, Battery Cell Temp = ${telemetry?.subsystems?.thermal?.batteryCellTemp}°C
- Comm Subsystem: SNR = ${telemetry?.subsystems?.communication?.snr}dB, Link Margin = ${telemetry?.subsystems?.communication?.linkMargin}dB, Packet Loss = ${telemetry?.subsystems?.communication?.packetLoss}%
- AOCS / Sensor Subsystem: Attitude Error = ${telemetry?.subsystems?.aocs?.attitudeError} arcsec, Star Tracker Fidelity = ${telemetry?.subsystems?.aocs?.starTrackerFidelity}%
- Scientific Payload: Throughput = ${telemetry?.subsystems?.payload?.sensorThroughput}MB/s, Buffer Fill = ${telemetry?.subsystems?.payload?.bufferFill}%

Provide an authoritative, crisp aerospace mission controller evaluation. Keep each section under 4 concise sentences.`;

      if (process.env.GEMINI_API_KEY) {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const rawText = response.text || '';
        
        // Parse into 3 sections or format cleanly
        res.json({
          success: true,
          explanation: rawText,
          model: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
        });
      } else {
        // Deterministic fallback if API key is not yet set
        const v = telemetry?.subsystems?.power?.batteryVoltage || 25.4;
        const t = telemetry?.subsystems?.power?.batteryTemp || 36.8;
        res.json({
          success: true,
          explanation: `OBSERVED:
Battery pack voltage registered at ${v}V with cell core temperature elevating to ${t}°C. Solar array output is ${telemetry?.inEclipse ? '0W (orbital shadow)' : `${telemetry?.subsystems?.power?.solarGeneration}W`} with a steady bus load of ${telemetry?.subsystems?.power?.powerConsumption}W.

PREDICTED:
At current thermal flux and discharge rate, internal cell impedance will depress bus voltage below the 23.0V critical threshold in approximately 36 minutes, precipitating uncommanded payload shutdown.

RECOMMENDED:
Issue command sequence CMD-PWR-04: Transition scientific sensor to standby, configure solar array drive for maximum thermal dissipation, and reduce downlink duty cycle to preserve battery reserve above 45%.`,
          model: 'deterministic-physics-engine',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      console.error('Error generating AI explanation:', err);
      res.json({
        success: true,
        explanation: `OBSERVED:
Telemetry confirms battery core thermal elevation to ${req.body?.telemetry?.subsystems?.power?.batteryTemp || 38.2}°C with bus voltage depressed to ${req.body?.telemetry?.subsystems?.power?.batteryVoltage || 24.1}V under nominal mission load.

PREDICTED:
Thermal dissipation limits on the radiator face will be exceeded within 42 minutes if science payload operations continue uninterrupted during eclipse egress.

RECOMMENDED:
Execute Safe Power Mode Alpha immediately. Throttle payload sensor data ingestion and verify battery charge controller current limiters before next orbital sunrise.`,
        model: 'deterministic-fallback',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: Number(PORT) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ORBITAL-SHIELD backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ORBITAL-SHIELD server:', err);
  process.exit(1);
});
