import React, { useState } from 'react';
import { SimulationScenario } from '../types/spacecraft';
import { Play, CheckCircle2, AlertOctagon, TrendingUp, BatteryCharging, Radio, Database, Shield, ArrowRight, Zap } from 'lucide-react';

interface WhatIfSimulationLabProps {
  scenarios: SimulationScenario[];
  activeFaultType: string;
  severity: number;
  onExecuteRecovery: (scenario: SimulationScenario) => Promise<void>;
  isExecuting: boolean;
  executedScenarioId: string | null;
}

export const WhatIfSimulationLab: React.FC<WhatIfSimulationLabProps> = ({
  scenarios,
  activeFaultType,
  severity,
  onExecuteRecovery,
  isExecuting,
  executedScenarioId,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario_a');

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const getRiskBadge = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (risk === 'LOW') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (risk === 'MEDIUM') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Predictive Decision Support Engine
          </span>
          <h2 className="font-tech text-xl font-bold uppercase text-white mt-0.5">
            What-If Multi-Scenario Simulation Lab
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Evaluate parallel mission trajectory branches over a 90-minute orbital propagation window.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Active Threat: <span className="text-amber-400 font-semibold">{activeFaultType.replace('_', ' ').toUpperCase()}</span> ({severity}% Mag)
          </span>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map(sc => {
          const isSelected = selectedScenarioId === sc.id;
          const isExecuted = executedScenarioId === sc.id;

          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#070A11] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getRiskBadge(sc.riskLevel)}`}>
                    {sc.riskLevel} RISK
                  </span>
                  {isExecuted && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE COMMAND
                    </span>
                  )}
                </div>

                <h3 className="font-tech text-sm font-bold uppercase text-white">{sc.title}</h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                  {sc.description}
                </p>
              </div>

              {/* Core Outcome Metrics */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mission Survival:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      sc.survivalProbability > 85 ? 'text-emerald-400' : sc.survivalProbability > 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {sc.survivalProbability}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Battery Reserve:</span>
                  <span className="text-white tabular-nums">{sc.batteryReserve}%</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Preserved Science:</span>
                  <span className="text-cyan-300 tabular-nums">{sc.payloadScienceOutput}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Scenario Deep-Dive & Timeline */}
      <div className="bg-[#070A11] border border-white/10 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">Selected Recovery Vector</span>
            <h4 className="font-tech text-lg font-bold text-white uppercase mt-0.5">{selectedScenario.title}</h4>
            <p className="text-xs font-mono text-slate-300 mt-0.5">{selectedScenario.description}</p>
          </div>

          <button
            onClick={() => onExecuteRecovery(selectedScenario)}
            disabled={isExecuting || executedScenarioId === selectedScenario.id}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono uppercase font-bold transition-all shadow-lg active:scale-95 ${
              executedScenarioId === selectedScenario.id
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 cursor-default'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {executedScenarioId === selectedScenario.id ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Strategy Executed & Applied</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>{isExecuting ? 'Uplinking Command Sequence...' : 'Execute Recovery Strategy'}</span>
              </>
            )}
          </button>
        </div>

        {/* Trade-off Comparison Metric Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase">Mission Survival Probability</span>
            <div className="text-xl font-bold text-emerald-400 tabular-nums">{selectedScenario.survivalProbability}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${selectedScenario.survivalProbability}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase">Battery Reserve (Eclipse Exit)</span>
            <div className="text-xl font-bold text-cyan-300 tabular-nums">{selectedScenario.batteryReserve}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${selectedScenario.batteryReserve}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase">Thermal Stability Index</span>
            <div className="text-xl font-bold text-amber-300 tabular-nums">{selectedScenario.thermalStability}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${selectedScenario.thermalStability}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
            <span className="text-slate-400 block text-[10px] uppercase">Science Payload Output</span>
            <div className="text-xl font-bold text-purple-300 tabular-nums">{selectedScenario.payloadScienceOutput}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-400 h-full rounded-full" style={{ width: `${selectedScenario.payloadScienceOutput}%` }} />
            </div>
          </div>
        </div>

        {/* 90-Minute Simulation Event Timeline (Part 11) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
              Projected Trajectory Event Timeline (T+00 to T+90 min)
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              Recovery Horizon: {selectedScenario.recoveryTimeMinutes} min
            </span>
          </div>

          <div className="relative pl-6 space-y-3 border-l-2 border-cyan-500/30">
            {selectedScenario.timeline.map((step, idx) => (
              <div key={idx} className="relative group">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-[#070A11]" />
                <div className="flex items-baseline gap-3 text-xs font-mono">
                  <span className="text-cyan-300 font-bold shrink-0">
                    T+{step.minute.toString().padStart(2, '0')}m
                  </span>
                  <span className="text-slate-300">{step.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
