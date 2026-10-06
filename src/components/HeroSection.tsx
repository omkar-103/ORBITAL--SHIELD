import React from 'react';
import {
  Shield,
  Activity,
  Zap,
  Radio,
  Thermometer,
  Database,
  ArrowRight,
  Play,
  AlertTriangle,
  GitCompare,
  Sparkles,
} from 'lucide-react';
import { SubsystemMap, MissionProfile } from '../types/spacecraft';
import { DetectorResult, TwinSyncInfo } from '../services/twinModel';

interface HeroSectionProps {
  subsystems: SubsystemMap;
  overallHealth: number;
  activeMission: MissionProfile;
  onOpenFaultLab: () => void;
  onOpenSimulationLab: () => void;
  onStartDemo: () => void;
  activeFaultCount: number;
  detectorResult?: DetectorResult;
  twinSyncInfo?: TwinSyncInfo;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  subsystems,
  overallHealth,
  activeMission,
  onOpenFaultLab,
  onOpenSimulationLab,
  onStartDemo,
  activeFaultCount,
  detectorResult,
  twinSyncInfo,
}) => {
  const getHealthColor = (score: number) => {
    if (score < 45) return 'text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
    if (score < 75) return 'text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
  };

  return (
    <div className="relative border-b border-cyan-500/20 bg-[#04060A] overflow-hidden py-8 px-4 lg:px-8">
      {/* Dynamic Cosmic Ambient Gradients & Starfield Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-aerospace opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.12)_0%,rgba(4,6,10,0)_75%)] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">
        {/* Main Grid: Left Identity & Pipeline vs Right Telemetry Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Mission Identity & Core Statement */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-tech font-extrabold uppercase tracking-tight text-white leading-tight">
                Predict. Simulate.{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                  Protect.
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Autonomous contingency intelligence for orbital assets. Understand cross-subsystem fault propagation,
                evaluate What-If recovery trajectories with NASA aging models, and safeguard mission science before anomalies cascade.
              </p>
            </div>

            {/* SENSE -> UNDERSTAND -> PREDICT -> SIMULATE -> COMPARE -> DECIDE -> RECOVER Pipeline */}
            <div className="p-3 rounded-xl bg-[#080C16]/90 border border-white/10 backdrop-blur-md">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Autonomous Telemetry Pipeline</span>
                <span className="text-cyan-400">1.0 Hz Active Loop</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-mono uppercase text-slate-400">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  Sense
                </span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                  Understand
                </span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Predict
                </span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Simulate
                </span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Compare
                </span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Recover
                </span>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onStartDemo}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-xs font-mono uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Launch Demo Sequence</span>
              </button>

              <button
                onClick={onOpenFaultLab}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1220] hover:bg-[#141C30] text-amber-300 font-medium text-xs font-mono uppercase rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Inject Subsystem Fault</span>
              </button>

              <button
                onClick={onOpenSimulationLab}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1220] hover:bg-[#141C30] text-white font-medium text-xs font-mono uppercase rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <span>What-If Multi-Scenario Lab</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Right Column: Spacecraft Readiness & Subsystem Matrix Card */}
          <div className="lg:col-span-5 bg-[#080D19]/90 border border-white/15 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Digital Twin Health Index
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-tech font-bold text-white tabular-nums">{overallHealth}%</span>
                  <span
                    className={`text-xs font-mono font-medium ${
                      overallHealth < 50
                        ? 'text-rose-400'
                        : overallHealth < 80
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {overallHealth < 50 ? '● CRITICAL DEGRADED' : overallHealth < 80 ? '▲ CAUTION ADVISORY' : '● NOMINAL CRUISE'}
                  </span>
                </div>
              </div>

              {activeFaultCount > 0 ? (
                <div className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 text-xs font-mono flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="font-bold">{activeFaultCount} ACTIVE FAULT</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold">ALL TELEMETRY NOMINAL</span>
                </div>
              )}
            </div>

            {/* Section 5: Digital Twin Synchronization Indicator */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    twinSyncInfo?.status === 'SYNCHRONIZED'
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                      : twinSyncInfo?.status === 'DRIFT'
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                      : 'bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                  }`}
                />
                <span className="font-bold text-white uppercase">{twinSyncInfo?.status || 'SYNCHRONIZED'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  Drift: <span className="text-cyan-300 tabular-nums font-semibold">{twinSyncInfo?.driftSeconds.toFixed(2) || '0.00'}s</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Time: <span className="text-slate-200 tabular-nums font-semibold">{twinSyncInfo?.telemetryTimeStr || 'T+00:00:00'}</span></span>
                <span>Samples: <span className="text-cyan-400 font-bold tabular-nums">{twinSyncInfo?.samplesIncorporated || 0}</span></span>
              </div>
            </div>

            {/* Section 12: Live Residual Detector Chip (F2) */}
            {detectorResult && (
              <div
                className={`px-3 py-2.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 transition-all ${
                  detectorResult.state === 'ANOMALY'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                    : detectorResult.state === 'WATCH'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <span>{detectorResult.state === 'ANOMALY' ? '✖' : detectorResult.state === 'WATCH' ? '▲' : '●'}</span>
                  <span>DETECTOR: {detectorResult.state}</span>
                </div>
                <div className="text-[11px] tabular-nums font-mono text-right">
                  <span className="text-slate-400">{detectorResult.drivingChannel} residual: </span>
                  <span className="font-bold text-white">
                    {detectorResult.currentResidual > 0 ? '+' : ''}
                    {detectorResult.currentResidual.toFixed(2)}
                    {detectorResult.drivingChannel === 'Bus Voltage' ? 'V' : '°C'}
                  </span>
                </div>
              </div>
            )}

            {/* Subsystem Health Grid with Visual Status Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Power */}
              <div className={`p-2.5 rounded-xl border transition-all ${getHealthColor(subsystems.power.healthScore)}`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Zap className="w-3 h-3 text-current" />
                    POWER
                  </span>
                  <span className="tabular-nums font-bold">{subsystems.power.healthScore}%</span>
                </div>
                <div className="w-full bg-black/40 h-1 rounded-full my-1.5 overflow-hidden">
                  <div className="bg-current h-full rounded-full" style={{ width: `${subsystems.power.healthScore}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-300 truncate">
                  {subsystems.power.batteryVoltage}V · {subsystems.power.stateOfCharge}% SoC
                </p>
              </div>

              {/* Thermal */}
              <div className={`p-2.5 rounded-xl border transition-all ${getHealthColor(subsystems.thermal.healthScore)}`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Thermometer className="w-3 h-3 text-current" />
                    THERMAL
                  </span>
                  <span className="tabular-nums font-bold">{subsystems.thermal.healthScore}%</span>
                </div>
                <div className="w-full bg-black/40 h-1 rounded-full my-1.5 overflow-hidden">
                  <div className="bg-current h-full rounded-full" style={{ width: `${subsystems.thermal.healthScore}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-300 truncate">
                  {subsystems.thermal.batteryCellTemp}°C cell
                </p>
              </div>

              {/* Comm */}
              <div className={`p-2.5 rounded-xl border transition-all ${getHealthColor(subsystems.communication.healthScore)}`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Radio className="w-3 h-3 text-current" />
                    COMM
                  </span>
                  <span className="tabular-nums font-bold">{subsystems.communication.healthScore}%</span>
                </div>
                <div className="w-full bg-black/40 h-1 rounded-full my-1.5 overflow-hidden">
                  <div className="bg-current h-full rounded-full" style={{ width: `${subsystems.communication.healthScore}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-300 truncate">
                  {subsystems.communication.snr}dB SNR
                </p>
              </div>

              {/* AOCS */}
              <div className={`p-2.5 rounded-xl border transition-all ${getHealthColor(subsystems.aocs.healthScore)}`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Activity className="w-3 h-3 text-current" />
                    AOCS
                  </span>
                  <span className="tabular-nums font-bold">{subsystems.aocs.healthScore}%</span>
                </div>
                <div className="w-full bg-black/40 h-1 rounded-full my-1.5 overflow-hidden">
                  <div className="bg-current h-full rounded-full" style={{ width: `${subsystems.aocs.healthScore}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-300 truncate">
                  {subsystems.aocs.attitudeError}" error
                </p>
              </div>

              {/* Payload */}
              <div className={`p-2.5 rounded-xl border transition-all ${getHealthColor(subsystems.payload.healthScore)} sm:col-span-2`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 font-bold">
                    <Database className="w-3 h-3 text-current" />
                    SCIENCE PAYLOAD
                  </span>
                  <span className="tabular-nums font-bold">{subsystems.payload.healthScore}%</span>
                </div>
                <div className="w-full bg-black/40 h-1 rounded-full my-1.5 overflow-hidden">
                  <div className="bg-current h-full rounded-full" style={{ width: `${subsystems.payload.healthScore}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-300 truncate">
                  {subsystems.payload.sensorThroughput} MB/s · {subsystems.payload.bufferFill}% buffer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
