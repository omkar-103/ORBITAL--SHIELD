import React from 'react';
import { SubsystemMap, ActiveFault, SubsystemId, SimulationScenario } from '../types/spacecraft';
import { SpacecraftViewer3D } from './SpacecraftViewer3D';
import { AlertTriangle, Zap, CheckCircle2, Shield, X, Radio, Thermometer } from 'lucide-react';

interface MissionCommandModeProps {
  onExit: () => void;
  subsystems: SubsystemMap;
  selectedSubsystem: SubsystemId | null;
  onSelectSubsystem: (sub: SubsystemId | null) => void;
  inEclipse: boolean;
  orbitProgress: number;
  overallHealth: number;
  activeFaults: ActiveFault[];
  onExecuteSafePower: () => Promise<void>;
  isExecuting: boolean;
  executedScenarioId: string | null;
}

export const MissionCommandMode: React.FC<MissionCommandModeProps> = ({
  onExit,
  subsystems,
  selectedSubsystem,
  onSelectSubsystem,
  inEclipse,
  orbitProgress,
  overallHealth,
  activeFaults,
  onExecuteSafePower,
  isExecuting,
  executedScenarioId,
}) => {
  const isCritical = overallHealth < 50 || activeFaults.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#040609] text-white flex flex-col p-4 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Top Mission Command Strip */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-tech text-xs font-bold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>MISSION COMMAND · LEVEL 1 AUTHORIZATION</span>
          </div>

          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            AeroSat OS-001 · Orbit {(orbitProgress * 100).toFixed(1)}% · {inEclipse ? 'UMBRA' : 'ILLUMINATED'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Health:</span>
            <span className={`text-base font-bold tabular-nums ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overallHealth}%
            </span>
          </div>

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-mono transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Exit Cockpit</span>
          </button>
        </div>
      </div>

      {/* Main Command Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 overflow-hidden">
        {/* Large Central 3D Twin */}
        <div className="lg:col-span-8 h-full flex flex-col">
          <div className="flex-1 min-h-[360px]">
            <SpacecraftViewer3D
              subsystems={subsystems}
              selectedSubsystem={selectedSubsystem}
              onSelectSubsystem={onSelectSubsystem}
              inEclipse={inEclipse}
              orbitProgress={orbitProgress}
            />
          </div>
        </div>

        {/* Tactical Right Sidebar: Live Critical Gauges & Emergency Action */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4 overflow-y-auto">
          {/* Active Fault Status Card */}
          <div className="bg-[#0A0E17] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Anomaly Vector
              </span>
              {activeFaults.length > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  CRITICAL THREAT
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NOMINAL CRUISE
                </span>
              )}
            </div>

            {activeFaults.length > 0 ? (
              <div className="space-y-1">
                <div className="font-tech text-base font-bold text-rose-400 uppercase">
                  {activeFaults[0].type.replace('_', ' ')}
                </div>
                <p className="text-xs font-mono text-slate-300">
                  Severity: <span className="font-bold text-white">{activeFaults[0].severity}%</span> · Subsystem: {activeFaults[0].subsystem.toUpperCase()}
                </p>
                <p className="text-xs font-mono text-amber-300/90 pt-1">
                  Predicted Horizon: Internal cell impedance will precipitate secondary brownouts within 34 minutes.
                </p>
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400">
                All subsystem operational parameters tracking within acceptable design margins.
              </p>
            )}
          </div>

          {/* Critical Mission Telemetry Readouts */}
          <div className="bg-[#0A0E17] border border-white/10 rounded-xl p-4 space-y-2 text-xs font-mono">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              Critical Bus Telemetry
            </span>

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Battery Bus Voltage:</span>
              <span className="text-white font-bold tabular-nums">{subsystems.power.batteryVoltage} V</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Cell Temperature:</span>
              <span className="text-white font-bold tabular-nums">{subsystems.power.batteryTemp} °C</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">RF Link Margin:</span>
              <span className="text-white font-bold tabular-nums">{subsystems.communication.linkMargin} dB</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Science Imager Data:</span>
              <span className="text-white font-bold tabular-nums">{subsystems.payload.sensorThroughput} MB/s</span>
            </div>
          </div>

          {/* Direct Tactical Recovery Action */}
          <div className="bg-[#0A0E17] border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Contingency Decision Protocol
              </span>
              <h4 className="font-tech text-base font-bold text-white uppercase mt-0.5">
                Safe Power Mode (CMD-PWR-04)
              </h4>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Stow optical payload, bias solar arrays +12° for thermal rejection, preserve battery reserve &gt;75%.
              </p>
            </div>

            <button
              onClick={onExecuteSafePower}
              disabled={isExecuting || executedScenarioId === 'scenario_a'}
              className={`w-full py-3 rounded-lg text-xs font-mono uppercase font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                executedScenarioId === 'scenario_a'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {executedScenarioId === 'scenario_a' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Safe Power Mode Active & Stabilized</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{isExecuting ? 'Transmitting Uplink Command...' : 'Authorize & Execute Safe Power Mode'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
