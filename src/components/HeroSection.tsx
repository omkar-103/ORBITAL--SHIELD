import React from 'react';
import { Shield, Activity, Zap, Radio, Thermometer, Database, ArrowRight, Play, AlertTriangle } from 'lucide-react';
import { SubsystemMap, MissionProfile } from '../types/spacecraft';

interface HeroSectionProps {
  subsystems: SubsystemMap;
  overallHealth: number;
  activeMission: MissionProfile;
  onOpenFaultLab: () => void;
  onOpenSimulationLab: () => void;
  onStartDemo: () => void;
  activeFaultCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  subsystems,
  overallHealth,
  activeMission,
  onOpenFaultLab,
  onOpenSimulationLab,
  onStartDemo,
  activeFaultCount,
}) => {
  const getHealthColor = (score: number) => {
    if (score < 45) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (score < 75) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  return (
    <div className="relative border-b border-white/10 bg-[#060910] bg-grid-aerospace bg-radial-vignette overflow-hidden py-8 px-4 lg:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Mission Identity & Core Statement */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-cyan-400 font-semibold uppercase">{activeMission.spacecraft}</span>
            <span aria-hidden="true">·</span>
            <span>{activeMission.orbit}</span>
            <span aria-hidden="true">·</span>
            <span>ST-09 Fault Simulation Platform</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-tech font-bold uppercase tracking-tight text-white leading-tight">
              Predict. Simulate. <span className="text-cyan-400">Protect.</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              We don’t just detect spacecraft failures. We let mission operators understand, simulate, and prepare for
              cascading anomalies before they jeopardize mission objectives.
            </p>
          </div>

          {/* SENSE -> UNDERSTAND -> PREDICT -> SIMULATE -> COMPARE -> DECIDE -> RECOVER Pipeline */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono uppercase text-slate-400">
              <span className="text-cyan-300 font-semibold">Sense</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300">Understand</span>
              <span className="text-slate-600">→</span>
              <span className="text-amber-300">Predict</span>
              <span className="text-slate-600">→</span>
              <span className="text-cyan-300">Simulate</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300">Compare</span>
              <span className="text-slate-600">→</span>
              <span className="text-emerald-300 font-semibold">Recover</span>
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onStartDemo}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono uppercase rounded-lg transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Launch Demo Sequence</span>
            </button>

            <button
              onClick={onOpenFaultLab}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs font-mono uppercase rounded-lg border border-white/10 transition-all active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Inject Subsystem Fault</span>
            </button>

            <button
              onClick={onOpenSimulationLab}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium text-xs font-mono uppercase rounded-lg border border-white/10 transition-all active:scale-95"
            >
              <span>What-If Multi-Scenario Lab</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Right Column: Spacecraft Readiness & Subsystem Matrix Card */}
        <div className="lg:col-span-5 bg-[#0B0F19]/90 border border-white/10 rounded-xl p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
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
                  {overallHealth < 50 ? '● DEGRADED' : overallHealth < 80 ? '▲ CAUTION' : '● NOMINAL CRUISE'}
                </span>
              </div>
            </div>

            {activeFaultCount > 0 ? (
              <div className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{activeFaultCount} ACTIVE FAULT</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>ALL TELEMETRY NOMINAL</span>
              </div>
            )}
          </div>

          {/* Subsystem Health Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Power */}
            <div className={`p-2.5 rounded-lg border ${getHealthColor(subsystems.power.healthScore)}`}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-current" />
                  POWER
                </span>
                <span className="tabular-nums font-semibold">{subsystems.power.healthScore}%</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {subsystems.power.batteryVoltage}V · {subsystems.power.stateOfCharge}% SoC
              </p>
            </div>

            {/* Thermal */}
            <div className={`p-2.5 rounded-lg border ${getHealthColor(subsystems.thermal.healthScore)}`}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-current" />
                  THERMAL
                </span>
                <span className="tabular-nums font-semibold">{subsystems.thermal.healthScore}%</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {subsystems.thermal.batteryCellTemp}°C cell
              </p>
            </div>

            {/* Comm */}
            <div className={`p-2.5 rounded-lg border ${getHealthColor(subsystems.communication.healthScore)}`}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-current" />
                  COMM
                </span>
                <span className="tabular-nums font-semibold">{subsystems.communication.healthScore}%</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {subsystems.communication.snr}dB SNR
              </p>
            </div>

            {/* AOCS */}
            <div className={`p-2.5 rounded-lg border ${getHealthColor(subsystems.aocs.healthScore)}`}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-current" />
                  AOCS
                </span>
                <span className="tabular-nums font-semibold">{subsystems.aocs.healthScore}%</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {subsystems.aocs.attitudeError}" error
              </p>
            </div>

            {/* Payload */}
            <div className={`p-2.5 rounded-lg border ${getHealthColor(subsystems.payload.healthScore)} sm:col-span-2`}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-current" />
                  SCIENCE PAYLOAD
                </span>
                <span className="tabular-nums font-semibold">{subsystems.payload.healthScore}%</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {subsystems.payload.sensorThroughput} MB/s · {subsystems.payload.bufferFill}% buffer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
