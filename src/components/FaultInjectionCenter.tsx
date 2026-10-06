import React, { useState } from 'react';
import { ActiveFault, SubsystemId } from '../types/spacecraft';
import { AlertTriangle, Zap, Thermometer, Radio, Activity, RefreshCw, Flame, CheckCircle } from 'lucide-react';

interface FaultInjectionCenterProps {
  activeFaults: ActiveFault[];
  onInjectFault: (type: string, severity: number, duration: number, subsystem: string) => Promise<void>;
  onClearFaults: () => Promise<void>;
  isInjecting: boolean;
}

export const FaultInjectionCenter: React.FC<FaultInjectionCenterProps> = ({
  activeFaults,
  onInjectFault,
  onClearFaults,
  isInjecting,
}) => {
  const [selectedType, setSelectedType] = useState<'battery_degradation' | 'thermal_stress' | 'sensor_failure' | 'communication_loss'>('battery_degradation');
  const [severity, setSeverity] = useState<number>(65);
  const [duration, setDuration] = useState<number>(60);
  const [lastInjectedName, setLastInjectedName] = useState<string | null>(null);

  const faultArchetypes = [
    {
      type: 'battery_degradation',
      subsystem: 'power' as SubsystemId,
      title: 'Battery Cell Impedance Degradation',
      icon: Zap,
      color: 'text-amber-400',
      description: 'Internal resistance elevation causing voltage drop under load and accelerated thermal dissipation.',
      cascadingChain: 'Battery Storage → Power Bus → Heat Generation → Downlink RF Power',
      defaultSeverity: 65,
    },
    {
      type: 'thermal_stress',
      subsystem: 'thermal' as SubsystemId,
      title: 'Radiator Heat-Pipe Degradation',
      icon: Thermometer,
      color: 'text-rose-400',
      description: 'Thermal transfer loop restriction leading to excessive avionics and sensor focal plane temperatures.',
      cascadingChain: 'Thermal Radiator → Battery Core → Payload Sensor Noise → Downlink Duty Cycle',
      defaultSeverity: 55,
    },
    {
      type: 'sensor_failure',
      subsystem: 'aocs' as SubsystemId,
      title: 'AOCS Star Tracker Stray-Light Blinding',
      icon: Activity,
      color: 'text-purple-400',
      description: 'Attitude determination error escalation resulting in reaction wheel desaturation cycles.',
      cascadingChain: 'Star Tracker → Attitude Control → Antenna Pointing → Solar Array Sun Vector',
      defaultSeverity: 45,
    },
    {
      type: 'communication_loss',
      subsystem: 'communication' as SubsystemId,
      title: 'X-Band Traveling Wave Tube Degrade',
      icon: Radio,
      color: 'text-cyan-400',
      description: 'RF power amplifier degradation depressing ground station link margin and increasing packet retransmission.',
      cascadingChain: 'RF Transmitter → Ground Station Link → Buffer Congestion → Science Dump Delay',
      defaultSeverity: 60,
    },
  ];

  const currentArchetype = faultArchetypes.find(f => f.type === selectedType)!;

  const handleInject = async () => {
    await onInjectFault(selectedType, severity, duration, currentArchetype.subsystem);
    setLastInjectedName(currentArchetype.title);
  };

  const handleApplyPreset = (type: typeof selectedType, sev: number, dur: number) => {
    setSelectedType(type);
    setSeverity(sev);
    setDuration(dur);
  };

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Fault Lab & Injection Center
          </span>
          <h2 className="font-tech text-xl font-bold uppercase text-white mt-0.5">
            Mission Predictive Fault Simulator
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Inject precision subsystem stress parameters to trigger real cascading digital twin dynamics.
          </p>
        </div>

        {activeFaults.length > 0 && (
          <button
            onClick={onClearFaults}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono uppercase transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset To Nominal State</span>
          </button>
        )}
      </div>

      {/* Fault Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {faultArchetypes.map(f => {
          const isSelected = selectedType === f.type;
          const isActive = activeFaults.some(af => af.type === f.type);
          const Icon = f.icon;

          return (
            <button
              key={f.type}
              onClick={() => {
                setSelectedType(f.type as typeof selectedType);
                setSeverity(f.defaultSeverity);
              }}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-white/5 ${f.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="font-tech text-sm font-semibold text-white uppercase">{f.title}</h3>
              <p className="text-[11px] font-mono text-slate-400 mt-1 line-clamp-2">{f.description}</p>
            </button>
          );
        })}
      </div>

      {/* Parameter Control Panel */}
      <div className="p-4 rounded-xl bg-[#070A11] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400">Selected Fault Vector</span>
            <h4 className="font-tech text-base font-semibold text-white uppercase flex items-center gap-2">
              <span className={currentArchetype.color}>{currentArchetype.title}</span>
              <span className="text-xs font-mono text-slate-500 font-normal">
                (Subsystem: {currentArchetype.subsystem.toUpperCase()})
              </span>
            </h4>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Propagation Vector: <span className="text-cyan-300">{currentArchetype.cascadingChain}</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Severity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Fault Severity Magnitude:</span>
              <span className={`font-bold text-sm tabular-nums ${severity > 60 ? 'text-rose-400' : severity > 35 ? 'text-amber-400' : 'text-cyan-300'}`}>
                {severity}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              step="1"
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Minor Drift (5%)</span>
              <span>Moderate Stress (50%)</span>
              <span>Severe Breakdown (95%)</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Simulation Window / Duration:</span>
              <span className="font-bold text-sm text-cyan-300 tabular-nums">{duration} min</span>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              step="5"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Short (10 min)</span>
              <span>1 Orbit (92 min)</span>
              <span>Multi-Orbit (180 min)</span>
            </div>
          </div>
        </div>

        {/* Quick Aerospace Scenario Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-slate-500">Scenario Presets:</span>
          <button
            onClick={() => handleApplyPreset('battery_degradation', 42, 60)}
            className="px-2.5 py-1 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-300"
          >
            Eclipse Battery Thermal Runaway (42%)
          </button>
          <button
            onClick={() => handleApplyPreset('thermal_stress', 65, 45)}
            className="px-2.5 py-1 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-300"
          >
            Radiator Louver Jam (65%)
          </button>
          <button
            onClick={() => handleApplyPreset('communication_loss', 70, 30)}
            className="px-2.5 py-1 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-300"
          >
            Deep Space Downlink Dropout (70%)
          </button>
        </div>

        {/* Injection Action Trigger */}
        <div className="pt-3 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            {lastInjectedName ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Active in Digital Twin: {lastInjectedName}
              </span>
            ) : (
              <span>Ready for parameter injection</span>
            )}
          </div>

          <button
            onClick={handleInject}
            disabled={isInjecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-tech font-bold uppercase rounded-lg transition-all shadow-lg shadow-rose-600/30 active:scale-95"
          >
            <Flame className="w-4 h-4" />
            <span>{isInjecting ? 'Injecting Telemetry Stress...' : 'Inject Fault Into Digital Twin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
