export type SubsystemStatus = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export type SubsystemId = 'power' | 'thermal' | 'communication' | 'aocs' | 'payload';

export interface PowerSubsystem {
  batteryVoltage: number; // 22 - 32 V
  batteryCurrent: number; // A (+ charge, - discharge)
  batteryTemp: number; // °C
  stateOfCharge: number; // %
  solarGeneration: number; // W
  powerConsumption: number; // W
  busVoltage: number; // V
  healthScore: number; // 0 - 100
  status: SubsystemStatus;
}

export interface ThermalSubsystem {
  batteryCellTemp: number; // °C
  avionicsTemp: number; // °C
  payloadSensorTemp: number; // °C
  radiatorTemp: number; // °C
  heatPipeFlux: number; // W/m²
  healthScore: number;
  status: SubsystemStatus;
}

export interface CommSubsystem {
  snr: number; // dB
  linkMargin: number; // dB
  packetLoss: number; // %
  downlinkBandwidth: number; // Mbps
  rfAmplifierTemp: number; // °C
  healthScore: number;
  status: SubsystemStatus;
}

export interface AocsSubsystem {
  reactionWheelRpm: number;
  attitudeError: number; // arcsec
  starTrackerFidelity: number; // %
  gyroDrift: number; // deg/hr
  healthScore: number;
  status: SubsystemStatus;
}

export interface PayloadSubsystem {
  sensorThroughput: number; // MB/s
  bufferFill: number; // %
  detectorCalibration: number; // %
  healthScore: number;
  status: SubsystemStatus;
}

export interface SubsystemMap {
  power: PowerSubsystem;
  thermal: ThermalSubsystem;
  communication: CommSubsystem;
  aocs: AocsSubsystem;
  payload: PayloadSubsystem;
}

export interface ActiveFault {
  id: string;
  type: 'battery_degradation' | 'thermal_stress' | 'sensor_failure' | 'communication_loss';
  subsystem: SubsystemId;
  severity: number; // 1 - 100
  startTime: number;
  duration: number; // minutes
}

export interface TelemetryPoint {
  timestamp: string;
  missionTime: number;
  orbitProgress: number; // 0 - 1
  inEclipse: boolean;
  subsystems: SubsystemMap;
  overallHealth: number;
  activeFaults: ActiveFault[];
}

export interface DependencyNode {
  id: string;
  label: string;
  subsystem: SubsystemId | 'mission';
  status: SubsystemStatus;
  health: number;
  role: string;
  evidence: string;
  downstreamImpact: string;
  riskHorizon: string;
  confidence: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  activePulse: boolean;
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  actionType: 'NO_ACTION' | 'POWER_SAFE' | 'DUTY_CYCLE' | 'THERMAL_SLEW';
  survivalProbability: number; // %
  batteryReserve: number; // %
  thermalStability: number; // score
  commAvailability: number; // %
  payloadScienceOutput: number; // %
  recoveryTimeMinutes: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  failureTimeEstimateMinutes: number | null;
  timeline: Array<{
    minute: number;
    event: string;
  }>;
}

export interface IncidentEvent {
  id: string;
  timestamp: string;
  missionTimeStr: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  subsystem: string;
  details: string;
}

export interface MissionProfile {
  id: string;
  name: string;
  orbit: string;
  inclination: string;
  launchDate: string;
  spacecraft: string;
  target: string;
}

export interface AIAnalysisResult {
  observed: string;
  predicted: string;
  recommended: string;
  model: string;
  timestamp: string;
  isStreaming?: boolean;
}
