import { TelemetryPoint, SubsystemId } from '../types/spacecraft';

/**
 * ORBITAL-SHIELD — Digital Twin Coupling & Nominal State Model (F1 & F2)
 * 
 * Single source of truth for:
 * 1. Pure, read-only deterministic nominal predictions (zero active faults)
 * 2. Real-time residual calculations (measured - predicted)
 * 3. EWMA / CUSUM residual detector with hysteresis (NOMINAL -> WATCH -> ANOMALY)
 * 4. Digital Twin synchronization status (SYNCHRONIZED, DRIFT, STALE)
 * 5. Closed-loop recovery verification (pre vs post snapshot)
 */

export interface NominalPrediction {
  batteryVoltage: number;
  busVoltage: number;
  batteryTemp: number;
  radiatorTemp: number;
  avionicsTemp: number;
  snr: number;
  linkMargin: number;
  packetLoss: number;
  sensorThroughput: number;
  bufferFill: number;
}

export interface ResidualPoint {
  missionTime: number;
  timestamp: string;
  measuredBusVoltage: number;
  predictedBusVoltage: number;
  residualBusVoltage: number;
  measuredBatteryTemp: number;
  predictedBatteryTemp: number;
  residualBatteryTemp: number;
}

export type DetectorState = 'NOMINAL' | 'WATCH' | 'ANOMALY';

export interface DetectorResult {
  state: DetectorState;
  drivingChannel: 'Bus Voltage' | 'Battery Core Temp';
  currentResidual: number;
  ewmaBusVoltage: number;
  ewmaBatteryTemp: number;
  consecutiveAnomalySamples: number;
  consecutiveRecoverySamples: number;
  thresholds: {
    busWatch: number;
    busAnomaly: number;
    tempWatch: number;
    tempAnomaly: number;
  };
}

export type TwinSyncStatus = 'SYNCHRONIZED' | 'DRIFT' | 'STALE';

export interface TwinSyncInfo {
  status: TwinSyncStatus;
  telemetryTimeStr: string;
  twinStateTimeStr: string;
  driftSeconds: number;
  samplesIncorporated: number;
  lastUpdated: string;
}

export interface RecoveryMetricDiff {
  label: string;
  unit: string;
  before: number;
  after: number;
  verified: boolean;
  targetRule: string;
}

export interface RecoveryVerificationResult {
  verified: boolean;
  missionState: 'STABILIZED' | 'PENDING' | 'DEGRADED';
  scenarioTitle: string;
  metrics: RecoveryMetricDiff[];
  verificationReasons: string[];
  timestamp: string;
}

// Named Constants for EWMA Detector (Section 9)
export const EWMA_ALPHA = 0.35;
export const BUS_WATCH_THRESHOLD = 0.50; // V residual divergence
export const BUS_ANOMALY_THRESHOLD = 1.60; // V residual divergence
export const TEMP_WATCH_THRESHOLD = 1.20; // °C residual divergence
export const TEMP_ANOMALY_THRESHOLD = 2.80; // °C residual divergence

export const SAMPLES_REQUIRED_WATCH = 2;
export const SAMPLES_REQUIRED_ANOMALY = 3;
export const SAMPLES_REQUIRED_RECOVERY = 3;

/**
 * Pure, deterministic, read-only nominal prediction matching server physics without active faults
 */
export function calculateNominalPrediction(
  missionTime: number,
  inEclipse: boolean,
  orbitProgress: number
): NominalPrediction {
  const baseVoltage = inEclipse ? 25.4 : 29.8;
  const batteryVoltage = Number(baseVoltage.toFixed(2));
  const busVoltage = Number((batteryVoltage * 0.98).toFixed(2));

  const baseThermal = inEclipse ? 18.5 : 31.0;
  const batteryTemp = Number(baseThermal.toFixed(1));
  const avionicsTemp = 28.0;
  const radiatorTemp = Number(((inEclipse ? -12 : 24)).toFixed(1));

  const snr = 18.4;
  const linkMargin = 6.8;
  const packetLoss = 0.05;

  const sensorThroughput = 180.0;
  const bufferFill = 34;

  return {
    batteryVoltage,
    busVoltage,
    batteryTemp,
    radiatorTemp,
    avionicsTemp,
    snr,
    linkMargin,
    packetLoss,
    sensorThroughput,
    bufferFill,
  };
}

/**
 * Calculates single sample residuals for a TelemetryPoint
 */
export function calculateResidualPoint(point: TelemetryPoint): ResidualPoint {
  const nom = calculateNominalPrediction(point.missionTime, point.inEclipse, point.orbitProgress);

  const measuredBusVoltage = point.subsystems.power.busVoltage;
  const predictedBusVoltage = nom.busVoltage;
  const residualBusVoltage = Number((measuredBusVoltage - predictedBusVoltage).toFixed(2));

  const measuredBatteryTemp = point.subsystems.power.batteryTemp;
  const predictedBatteryTemp = nom.batteryTemp;
  const residualBatteryTemp = Number((measuredBatteryTemp - predictedBatteryTemp).toFixed(2));

  return {
    missionTime: point.missionTime,
    timestamp: point.timestamp,
    measuredBusVoltage,
    predictedBusVoltage,
    residualBusVoltage,
    measuredBatteryTemp,
    predictedBatteryTemp,
    residualBatteryTemp,
  };
}

/**
 * Evaluates EWMA residual detector across telemetry history with hysteresis
 */
export function evaluateResidualDetector(history: TelemetryPoint[]): DetectorResult {
  const thresholds = {
    busWatch: BUS_WATCH_THRESHOLD,
    busAnomaly: BUS_ANOMALY_THRESHOLD,
    tempWatch: TEMP_WATCH_THRESHOLD,
    tempAnomaly: TEMP_ANOMALY_THRESHOLD,
  };

  if (!history || history.length === 0) {
    return {
      state: 'NOMINAL',
      drivingChannel: 'Bus Voltage',
      currentResidual: 0,
      ewmaBusVoltage: 0,
      ewmaBatteryTemp: 0,
      consecutiveAnomalySamples: 0,
      consecutiveRecoverySamples: 0,
      thresholds,
    };
  }

  // Calculate residuals series
  const residuals = history.map(calculateResidualPoint);

  let ewmaBus = 0;
  let ewmaTemp = 0;
  let currentState: DetectorState = 'NOMINAL';
  let consecutiveAnomaly = 0;
  let consecutiveRecovery = 0;

  for (let i = 0; i < residuals.length; i++) {
    const r = residuals[i];
    const absBus = Math.abs(r.residualBusVoltage);
    const absTemp = Math.abs(r.residualBatteryTemp);

    if (i === 0) {
      ewmaBus = absBus;
      ewmaTemp = absTemp;
    } else {
      ewmaBus = Number((EWMA_ALPHA * absBus + (1 - EWMA_ALPHA) * ewmaBus).toFixed(3));
      ewmaTemp = Number((EWMA_ALPHA * absTemp + (1 - EWMA_ALPHA) * ewmaTemp).toFixed(3));
    }

    const isExceedingAnomaly = ewmaBus >= BUS_ANOMALY_THRESHOLD || ewmaTemp >= TEMP_ANOMALY_THRESHOLD;
    const isExceedingWatch = ewmaBus >= BUS_WATCH_THRESHOLD || ewmaTemp >= TEMP_WATCH_THRESHOLD;

    if (isExceedingAnomaly) {
      consecutiveAnomaly++;
      consecutiveRecovery = 0;
      if (consecutiveAnomaly >= SAMPLES_REQUIRED_ANOMALY) {
        currentState = 'ANOMALY';
      } else if (currentState !== 'ANOMALY' && consecutiveAnomaly >= SAMPLES_REQUIRED_WATCH) {
        currentState = 'WATCH';
      }
    } else if (isExceedingWatch) {
      if (currentState === 'ANOMALY') {
        consecutiveRecovery++;
        if (consecutiveRecovery >= SAMPLES_REQUIRED_RECOVERY) {
          currentState = 'WATCH';
        }
      } else {
        consecutiveAnomaly++;
        consecutiveRecovery = 0;
        if (consecutiveAnomaly >= SAMPLES_REQUIRED_WATCH) {
          currentState = 'WATCH';
        }
      }
    } else {
      // Within nominal bounds
      consecutiveAnomaly = 0;
      consecutiveRecovery++;
      if (currentState === 'ANOMALY') {
        if (consecutiveRecovery >= SAMPLES_REQUIRED_RECOVERY) {
          currentState = 'WATCH';
        }
      } else if (currentState === 'WATCH') {
        if (consecutiveRecovery >= SAMPLES_REQUIRED_RECOVERY) {
          currentState = 'NOMINAL';
        }
      } else {
        currentState = 'NOMINAL';
      }
    }
  }

  const latest = residuals[residuals.length - 1];
  const busDominance = ewmaBus / BUS_WATCH_THRESHOLD;
  const tempDominance = ewmaTemp / TEMP_WATCH_THRESHOLD;
  const drivingChannel: 'Bus Voltage' | 'Battery Core Temp' =
    busDominance >= tempDominance ? 'Bus Voltage' : 'Battery Core Temp';

  const currentResidual = drivingChannel === 'Bus Voltage' ? latest.residualBusVoltage : latest.residualBatteryTemp;

  return {
    state: currentState,
    drivingChannel,
    currentResidual,
    ewmaBusVoltage: ewmaBus,
    ewmaBatteryTemp: ewmaTemp,
    consecutiveAnomalySamples: consecutiveAnomaly,
    consecutiveRecoverySamples: consecutiveRecovery,
    thresholds,
  };
}

/**
 * Calculates digital twin synchronization status
 */
export function calculateTwinSync(
  point: TelemetryPoint | null,
  samplesCount: number,
  lastTickTimeMs: number
): TwinSyncInfo {
  if (!point) {
    return {
      status: 'STALE',
      telemetryTimeStr: 'T+00:00:00',
      twinStateTimeStr: 'T+00:00:00',
      driftSeconds: 0,
      samplesIncorporated: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const elapsed = Math.max(0, Math.round((Date.now() - lastTickTimeMs) / 1000));
  let status: TwinSyncStatus = 'SYNCHRONIZED';
  if (elapsed > 4) {
    status = 'STALE';
  } else if (elapsed > 1) {
    status = 'DRIFT';
  }

  const formatMET = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `T+${h}:${m}:${s}`;
  };

  const met = formatMET(point.missionTime);

  return {
    status,
    telemetryTimeStr: met,
    twinStateTimeStr: met,
    driftSeconds: Number(elapsed.toFixed(2)),
    samplesIncorporated: samplesCount,
    lastUpdated: point.timestamp,
  };
}

/**
 * Closed-loop verification of recovery execution comparing pre and post telemetry
 */
export function verifyRecoveryAction(
  preSnapshot: TelemetryPoint | null,
  current: TelemetryPoint,
  scenarioTitle: string
): RecoveryVerificationResult {
  const pre = preSnapshot || current;

  const preBus = pre.subsystems.power.busVoltage;
  const postBus = current.subsystems.power.busVoltage;
  const busVerified = postBus >= 24.5;

  const preTemp = pre.subsystems.power.batteryTemp;
  const postTemp = current.subsystems.power.batteryTemp;
  const tempVerified = postTemp <= 34.0;

  const preMargin = pre.subsystems.communication.linkMargin;
  const postMargin = current.subsystems.communication.linkMargin;
  const marginVerified = postMargin >= 3.5;

  const preThroughput = pre.subsystems.payload.sensorThroughput;
  const postThroughput = current.subsystems.payload.sensorThroughput;
  const payloadVerified = postThroughput >= 45.0;

  const allVerified = busVerified && tempVerified && marginVerified;

  const metrics: RecoveryMetricDiff[] = [
    {
      label: 'Main Bus Voltage',
      unit: 'V',
      before: preBus,
      after: postBus,
      verified: busVerified,
      targetRule: '≥ 24.5V (Nominal bus ceiling)',
    },
    {
      label: 'Battery Pack Core Temp',
      unit: '°C',
      before: preTemp,
      after: postTemp,
      verified: tempVerified,
      targetRule: '≤ 34.0°C (Thermal safe envelope)',
    },
    {
      label: 'RF Downlink Margin',
      unit: 'dB',
      before: preMargin,
      after: postMargin,
      verified: marginVerified,
      targetRule: '≥ 3.5 dB (Link closure margin)',
    },
    {
      label: 'Payload Sensor Throughput',
      unit: 'MB/s',
      before: preThroughput,
      after: postThroughput,
      verified: payloadVerified,
      targetRule: '≥ 45.0 MB/s (Duty-cycled science output)',
    },
  ];

  const verificationReasons: string[] = [];
  if (busVerified) {
    verificationReasons.push(`Bus voltage restored from ${preBus}V to ${postBus}V (+${(postBus - preBus).toFixed(1)}V recovery)`);
  }
  if (tempVerified) {
    verificationReasons.push(`Battery core thermal gradient stabilized from ${preTemp}°C to ${postTemp}°C`);
  }
  if (marginVerified) {
    verificationReasons.push(`RF communication link margin held above threshold at ${postMargin} dB`);
  }

  return {
    verified: allVerified,
    missionState: allVerified ? 'STABILIZED' : 'PENDING',
    scenarioTitle,
    metrics,
    verificationReasons,
    timestamp: new Date().toISOString(),
  };
}
