import { TelemetryPoint, SimulationScenario, IncidentEvent, MissionProfile, AIAnalysisResult, ActiveFault } from '../types/spacecraft';

// Client-side fallback simulator state if network or backend route is momentarily offline
let fallbackMissionTime = 14200;
let fallbackFaults: ActiveFault[] = [];

export function generateLocalTelemetry(): TelemetryPoint {
  fallbackMissionTime += 1;
  const orbitPeriod = 5520; // 92 min
  const orbitProgress = (fallbackMissionTime % orbitPeriod) / orbitPeriod;
  const inEclipse = orbitProgress > 0.65;

  let batteryDegradationFactor = 1.0;
  let thermalStressFactor = 1.0;
  let sensorErrorFactor = 1.0;
  let commDegradationFactor = 1.0;

  for (const fault of fallbackFaults) {
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

  const solarGenNominal = inEclipse ? 0 : 540 + Math.sin(orbitProgress * Math.PI * 2) * 40;
  let powerConsumption = 340;
  if (batteryDegradationFactor < 0.85) {
    powerConsumption += (1 - batteryDegradationFactor) * 80;
  }

  const baseVoltage = inEclipse ? 25.4 : 29.8;
  const batteryVoltage = Number((baseVoltage * (0.85 + 0.15 * batteryDegradationFactor) + (Math.random() * 0.12 - 0.06)).toFixed(2));
  const batteryCurrent = inEclipse ? Number((-14.2 / batteryDegradationFactor).toFixed(2)) : Number((12.5 * batteryDegradationFactor).toFixed(2));
  const stateOfCharge = Math.max(12, Math.min(99, Math.round((inEclipse ? 68 : 94) * batteryDegradationFactor)));

  const baseThermal = inEclipse ? 18.5 : 31.0;
  const batteryTemp = Number((baseThermal * thermalStressFactor + (1 - batteryDegradationFactor) * 14.5 + (Math.random() * 0.2)).toFixed(1));
  const avionicsTemp = Number((28.0 * thermalStressFactor + (Math.random() * 0.2)).toFixed(1));
  const radiatorTemp = Number(((inEclipse ? -12 : 24) * thermalStressFactor).toFixed(1));

  const snr = Number((18.4 * commDegradationFactor - (batteryVoltage < 24 ? 2.5 : 0) + (Math.random() * 0.2 - 0.1)).toFixed(1));
  const linkMargin = Number((6.8 * commDegradationFactor - (batteryVoltage < 24 ? 1.8 : 0)).toFixed(1));
  const packetLoss = Number((Math.max(0.05, (1 - commDegradationFactor) * 18.5 + (batteryVoltage < 24 ? 4.2 : 0))).toFixed(2));

  const starTrackerFidelity = Number((98.5 * sensorErrorFactor).toFixed(1));
  const attitudeError = Number(((1 / sensorErrorFactor) * 1.8 + Math.random() * 0.2).toFixed(2));

  const sensorThroughput = batteryVoltage < 24.2 ? 45.0 : 180.0;
  const bufferFill = Math.min(98, Math.round(34 + (1 - commDegradationFactor) * 45));

  const powerScore = Math.max(10, Math.round(stateOfCharge * 0.6 + (batteryVoltage / 30) * 40));
  const thermalScore = Math.max(15, Math.round(100 - Math.max(0, batteryTemp - 30) * 3.5));
  const commScore = Math.max(8, Math.round(commDegradationFactor * 100 - packetLoss * 1.5));
  const aocsScore = Math.max(20, Math.round(sensorErrorFactor * 100 - attitudeError * 3));
  const payloadScore = Math.max(12, Math.round((sensorThroughput / 180) * 60 + (100 - bufferFill) * 0.4));

  const getStatus = (score: number) => {
    if (score < 45) return 'CRITICAL';
    if (score < 75) return 'WARNING';
    return 'NOMINAL';
  };

  const overallHealth = Math.round((powerScore * 0.3 + thermalScore * 0.2 + commScore * 0.2 + aocsScore * 0.15 + payloadScore * 0.15));

  return {
    timestamp: new Date().toISOString(),
    missionTime: fallbackMissionTime,
    orbitProgress: Number(orbitProgress.toFixed(4)),
    inEclipse,
    subsystems: {
      power: {
        batteryVoltage,
        batteryCurrent,
        batteryTemp,
        stateOfCharge,
        solarGeneration: Number(solarGenNominal.toFixed(1)),
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
    activeFaults: [...fallbackFaults],
  };
}

export async function fetchCurrentTelemetry(): Promise<TelemetryPoint> {
  try {
    const res = await fetch('/api/telemetry/current');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch {
    return generateLocalTelemetry();
  }
}

export async function injectFaultApi(
  type: string,
  severity: number,
  duration: number,
  subsystem: string
): Promise<{ success: boolean; activeFaults: ActiveFault[] }> {
  try {
    const res = await fetch('/api/faults/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, severity, duration, subsystem }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Local fallback
    const newFault: ActiveFault = {
      id: `fault-${Date.now()}`,
      type: type as ActiveFault['type'],
      subsystem: subsystem as ActiveFault['subsystem'],
      severity,
      startTime: fallbackMissionTime,
      duration,
    };
    fallbackFaults = fallbackFaults.filter(f => f.type !== type);
    fallbackFaults.push(newFault);
    return { success: true, activeFaults: fallbackFaults };
  }
}

export async function clearFaultsApi(): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/faults/clear', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    fallbackFaults = [];
    return { success: true };
  }
}

export async function runSimulationApi(
  faultType: string,
  severity: number
): Promise<{ scenarios: SimulationScenario[] }> {
  try {
    const res = await fetch('/api/simulation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faultType, severity }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const sev = Number(severity) || 35;
    return {
      scenarios: [
        {
          id: 'baseline',
          title: 'Continue Nominal Operations',
          description: 'Maintain baseline science and downlink schedule without load shedding.',
          actionType: 'NO_ACTION',
          survivalProbability: Math.max(15, Math.round(100 - sev * 1.4)),
          batteryReserve: Math.max(6, Math.round(48 - sev * 0.65)),
          thermalStability: Math.max(22, Math.round(88 - sev * 0.8)),
          commAvailability: Math.max(18, Math.round(92 - sev * 0.9)),
          payloadScienceOutput: 96,
          recoveryTimeMinutes: 120,
          riskLevel: sev > 50 ? 'HIGH' : 'MEDIUM',
          failureTimeEstimateMinutes: Math.max(18, Math.round(95 - sev * 1.1)),
          timeline: [
            { minute: 0, event: 'Fault onset detected in telemetry stream' },
            { minute: 15, event: 'Bus voltage decay begins under 380W payload load' },
            { minute: 32, event: 'Thermal limits exceeded in battery pack (+39.2°C)' },
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
          batteryReserve: Math.min(88, Math.max(38, Math.round(82 - sev * 0.3))),
          thermalStability: 94,
          commAvailability: 85,
          payloadScienceOutput: 68,
          recoveryTimeMinutes: 28,
          riskLevel: 'LOW',
          failureTimeEstimateMinutes: null,
          timeline: [
            { minute: 0, event: 'Execute Safe Power Mode transition command' },
            { minute: 4, event: 'Payload imager stowed in thermal standby (power drops from 340W to 125W)' },
            { minute: 12, event: 'Battery pack cell temperature stabilizes below 27.5°C' },
            { minute: 25, event: 'State of charge recovers above 75% entering sunlight' },
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
      ],
    };
  }
}

export async function requestAIAnalysisApi(
  telemetry: TelemetryPoint,
  activeFault?: ActiveFault,
  subsystemFocus?: string
): Promise<AIAnalysisResult> {
  try {
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telemetry, activeFault, subsystemFocus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return parseAIExplanation(data.explanation, data.model);
  } catch {
    // Grounded physics fallback
    const v = telemetry.subsystems.power.batteryVoltage;
    const t = telemetry.subsystems.power.batteryTemp;
    const soc = telemetry.subsystems.power.stateOfCharge;
    const isDegraded = activeFault?.type === 'battery_degradation' || v < 25;

    return {
      observed: `Telemetry confirms battery cell voltage at ${v}V (bus: ${telemetry.subsystems.power.busVoltage}V) with core thermal state elevated to ${t}°C. Current state of charge is ${soc}% with a system load draw of ${telemetry.subsystems.power.powerConsumption}W during ${telemetry.inEclipse ? 'orbital eclipse' : 'sunlit pass'}.`,
      predicted: isDegraded
        ? `Under current thermal rise (+0.4°C/min) and continuous ${telemetry.subsystems.power.powerConsumption}W demand, internal cell impedance will force bus voltage below the 23.0V critical threshold within 34 minutes, triggering autonomous payload trip.`
        : `All subsystem parameters currently track within nominal orbital tolerances. Next thermal peak anticipated at sunrise in ${(100 - telemetry.orbitProgress * 100).toFixed(0)} minutes.`,
      recommended: isDegraded
        ? `Execute Safe Power Mode transition immediately. Throttle multispectral imager power rails, increase radiator cold-space bias by 12°, and constrain high-gain downlink to 20% duty cycle until thermal stabilization.`
        : `Maintain planned observation pass schedule. Verify star tracker calibration lock prior to next ground station window.`,
      model: 'deterministic-physics-engine',
      timestamp: new Date().toISOString(),
    };
  }
}

function parseAIExplanation(rawText: string, model: string): AIAnalysisResult {
  let observed = '';
  let predicted = '';
  let recommended = '';

  const observedMatch = rawText.match(/OBSERVED:?([\s\S]*?)(?=PREDICTED:|$)/i);
  const predictedMatch = rawText.match(/PREDICTED:?([\s\S]*?)(?=RECOMMENDED:|$)/i);
  const recommendedMatch = rawText.match(/RECOMMENDED:?([\s\S]*?)$/i);

  if (observedMatch && observedMatch[1]) observed = observedMatch[1].trim();
  if (predictedMatch && predictedMatch[1]) predicted = predictedMatch[1].trim();
  if (recommendedMatch && recommendedMatch[1]) recommended = recommendedMatch[1].trim();

  if (!observed && !predicted && !recommended) {
    observed = rawText.slice(0, 200).trim();
    predicted = rawText.slice(200, 400).trim();
    recommended = rawText.slice(400).trim();
  }

  return {
    observed: observed || 'Observed telemetry values logged within baseline parameters.',
    predicted: predicted || 'Extrapolated trajectories indicate stable orbital thermal performance.',
    recommended: recommended || 'Maintain scheduled payload activities and monitor link margins.',
    model: model || 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  };
}

export async function fetchIncidentsApi(): Promise<IncidentEvent[]> {
  try {
    const res = await fetch('/api/incidents');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return [
      {
        id: 'inc-01',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        missionTimeStr: 'T+03:22:15',
        severity: 'INFO',
        title: 'Orbital Sunset Transition Nominal',
        subsystem: 'POWER',
        details: 'Spacecraft entered umbra. Solar array power reduced to 0W. Battery discharge nominal at 14.2A.',
      },
      {
        id: 'inc-02',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        missionTimeStr: 'T+03:52:40',
        severity: 'INFO',
        title: 'Svalbard AOS Signal Lock',
        subsystem: 'COMMUNICATION',
        details: 'High-gain X-band contact acquired with Svalbard ground station. 150 Mbps downlink active.',
      },
    ];
  }
}

export async function fetchMissionsApi(): Promise<{ activeMissionId: string; missions: MissionProfile[] }> {
  try {
    const res = await fetch('/api/missions');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      activeMissionId: 'OS-001',
      missions: [
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
      ],
    };
  }
}

export async function selectMissionApi(missionId: string): Promise<{ success: boolean; activeMissionId?: string }> {
  try {
    const res = await fetch('/api/missions/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { success: true, activeMissionId: missionId };
  }
}

export interface MlBenchmarkData {
  available: boolean;
  battery: {
    dataset: string;
    task: string;
    protocol: string;
    features: string[];
    per_cell: Record<string, { mae: number; rmse: number; dummy_mae: number; n_test: number }>;
    mean_mae: number;
    mean_dummy_mae: number;
    beats_dummy: boolean;
    eol_cycle_per_cell: Record<string, number>;
  } | null;
  batteryReplay: Record<string, Array<{ cycle: number; soh_true: number; soh_pred: number }>> | null;
  opssat: {
    dataset: string;
    n_train: number;
    n_test: number;
    anomaly_rate_test: number;
    features: string[];
    threshold: number;
    model: {
      accuracy: number;
      balanced_accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      confusion_matrix: number[][];
    };
    dummy_most_frequent: {
      accuracy: number;
      balanced_accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      roc_auc: number;
      confusion_matrix: number[][];
    };
    top_features: Array<{ feature: string; importance: number }>;
  } | null;
}

export async function fetchMlBenchmark(): Promise<MlBenchmarkData | null> {
  try {
    const res = await fetch('/api/ml/benchmark');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

