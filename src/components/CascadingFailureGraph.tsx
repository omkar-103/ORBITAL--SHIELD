import React, { useState } from 'react';
import { SubsystemMap, ActiveFault, SubsystemStatus } from '../types/spacecraft';
import { Share2, AlertTriangle, ArrowRight, ShieldCheck, Cpu, Info, CheckCircle2 } from 'lucide-react';

interface CascadingFailureGraphProps {
  subsystems: SubsystemMap;
  activeFaults: ActiveFault[];
}

interface GraphNode {
  id: string;
  name: string;
  category: 'power' | 'thermal' | 'comm' | 'aocs' | 'payload' | 'mission';
  status: SubsystemStatus;
  health: number;
  evidence: string;
  contributingFactors: string[];
  predictedImpact: string;
  timeframe: string;
  confidence: number;
  x: number; // SVG percentage
  y: number;
}

export const CascadingFailureGraph: React.FC<CascadingFailureGraphProps> = ({
  subsystems,
  activeFaults,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('battery');

  const hasBatteryFault = activeFaults.some(f => f.type === 'battery_degradation') || subsystems.power.batteryVoltage < 25;
  const hasThermalFault = activeFaults.some(f => f.type === 'thermal_stress') || subsystems.thermal.batteryCellTemp > 35;
  const hasCommFault = activeFaults.some(f => f.type === 'communication_loss') || subsystems.communication.snr < 14;

  const nodes: GraphNode[] = [
    {
      id: 'solar',
      name: 'Photovoltaic Array',
      category: 'power',
      status: 'NOMINAL',
      health: 96,
      evidence: `Solar illumination: ${subsystems.power.solarGeneration}W generated across Gallium-Arsenide panels.`,
      contributingFactors: ['Sun-pointing attitude nominal', 'Orbital solar flux constant'],
      predictedImpact: 'Continues nominal power delivery during sunlit orbital phase.',
      timeframe: 'T+00 to T+58 min',
      confidence: 99,
      x: 10,
      y: 25,
    },
    {
      id: 'battery',
      name: 'Battery Energy Storage',
      category: 'power',
      status: subsystems.power.status,
      health: subsystems.power.healthScore,
      evidence: `Bus voltage: ${subsystems.power.batteryVoltage}V, Temp: ${subsystems.power.batteryTemp}°C, SoC: ${subsystems.power.stateOfCharge}%.`,
      contributingFactors: hasBatteryFault
        ? ['Injected internal cell impedance degradation', 'Excessive Joule heating during eclipse discharge']
        : ['Normal cyclic charge/discharge profile'],
      predictedImpact: hasBatteryFault
        ? 'Cell undervoltage trip expected within 38 minutes under heavy load.'
        : 'Sufficient capacity to sustain eclipse transit.',
      timeframe: hasBatteryFault ? 'T+15m to T+45m' : 'Nominal',
      confidence: 94,
      x: 30,
      y: 25,
    },
    {
      id: 'power_bus',
      name: 'Regulated Main Power Bus',
      category: 'power',
      status: subsystems.power.status === 'CRITICAL' ? 'CRITICAL' : hasBatteryFault ? 'WARNING' : 'NOMINAL',
      health: Math.max(15, subsystems.power.healthScore - 8),
      evidence: `28V DC regulated rail fluctuating at ${subsystems.power.busVoltage}V. Draw: ${subsystems.power.powerConsumption}W.`,
      contributingFactors: hasBatteryFault
        ? ['Battery supply sag during high-drain scientific downlink pass']
        : ['Bus impedance balanced within 0.05 ohms'],
      predictedImpact: hasBatteryFault
        ? 'Secondary voltage ripple may induce avionics brownouts.'
        : 'Stable 28.0V rail maintained.',
      timeframe: hasBatteryFault ? 'T+25m' : 'Nominal',
      confidence: 91,
      x: 50,
      y: 25,
    },
    {
      id: 'thermal_loop',
      name: 'Thermal Heat-Pipe Loop',
      category: 'thermal',
      status: subsystems.thermal.status,
      health: subsystems.thermal.healthScore,
      evidence: `Battery cell core: ${subsystems.thermal.batteryCellTemp}°C, Radiator face: ${subsystems.thermal.radiatorTemp}°C.`,
      contributingFactors: hasThermalFault || hasBatteryFault
        ? ['Degraded heat-pipe capillary pump flux', 'Coupled thermal dissipation from overloaded battery cells']
        : ['Radiator cold-space view vector unobstructed'],
      predictedImpact: hasThermalFault || hasBatteryFault
        ? 'Radiator capacity saturation will force focal plane sensor throttling.'
        : 'Temperatures remain within -15°C to +32°C design limits.',
      timeframe: hasThermalFault || hasBatteryFault ? 'T+32m' : 'Nominal',
      confidence: 88,
      x: 40,
      y: 70,
    },
    {
      id: 'aocs',
      name: 'Attitude & Orbit Control (AOCS)',
      category: 'aocs',
      status: subsystems.aocs.status,
      health: subsystems.aocs.healthScore,
      evidence: `Pointing error: ${subsystems.aocs.attitudeError} arcsec. Star tracker fidelity: ${subsystems.aocs.starTrackerFidelity}%.`,
      contributingFactors: ['Fine sun sensor locked', 'Reaction wheel speeds nominal'],
      predictedImpact: 'Spacecraft orientation stable within 2.1 arcsec pointing budget.',
      timeframe: 'Nominal',
      confidence: 96,
      x: 70,
      y: 70,
    },
    {
      id: 'downlink',
      name: 'X-Band Downlink RF Terminal',
      category: 'comm',
      status: subsystems.communication.status,
      health: subsystems.communication.healthScore,
      evidence: `SNR: ${subsystems.communication.snr}dB, Link margin: ${subsystems.communication.linkMargin}dB, Loss: ${subsystems.communication.packetLoss}%.`,
      contributingFactors: hasCommFault || hasBatteryFault
        ? ['Traveling-wave tube amplifier constrained by power bus sag', 'Downlink packet retransmissions elevated']
        : ['Clear line of sight to Svalbard ground station'],
      predictedImpact: hasCommFault || hasBatteryFault
        ? 'Transmission throughput downgraded from 150 Mbps to 45 Mbps safe fallback.'
        : 'High-speed science dump achievable.',
      timeframe: hasCommFault || hasBatteryFault ? 'T+40m' : 'Nominal',
      confidence: 92,
      x: 70,
      y: 25,
    },
    {
      id: 'payload',
      name: 'Multispectral Scientific Payload',
      category: 'payload',
      status: subsystems.payload.status,
      health: subsystems.payload.healthScore,
      evidence: `Detector throughput: ${subsystems.payload.sensorThroughput} MB/s. Onboard solid-state buffer: ${subsystems.payload.bufferFill}%.`,
      contributingFactors: hasBatteryFault || hasCommFault
        ? ['Buffer accumulation due to throttled downlink', 'Load-shedding command impending']
        : ['Continuous multispectral earth imaging active'],
      predictedImpact: hasBatteryFault || hasCommFault
        ? 'Buffer overflow risk at T+52m; science acquisition will be suspended.'
        : 'All 8 spectral bands streaming at 100% nominal resolution.',
      timeframe: hasBatteryFault || hasCommFault ? 'T+52m' : 'Nominal',
      confidence: 89,
      x: 90,
      y: 45,
    },
  ];

  // Dependency Edges (from -> to)
  const edges = [
    { from: 'solar', to: 'battery', label: 'Charge Current' },
    { from: 'battery', to: 'power_bus', label: 'Discharge Rail' },
    { from: 'battery', to: 'thermal_loop', label: 'Joule Dissipation' },
    { from: 'power_bus', to: 'downlink', label: 'RF Amplifier Power' },
    { from: 'power_bus', to: 'payload', label: 'Sensor Power Rail' },
    { from: 'thermal_loop', to: 'payload', label: 'Detector Cooling' },
    { from: 'aocs', to: 'downlink', label: 'Dish Gimbal Vector' },
    { from: 'downlink', to: 'payload', label: 'Data Dump Backpressure' },
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[1];

  const getStatusColor = (status: SubsystemStatus) => {
    if (status === 'CRITICAL') return { stroke: '#EF4444', fill: 'rgba(239, 68, 68, 0.2)', text: 'text-rose-400' };
    if (status === 'WARNING') return { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.2)', text: 'text-amber-400' };
    return { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.2)', text: 'text-emerald-400' };
  };

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Cascading Failure Visualization
          </span>
          <h2 className="font-tech text-xl font-bold uppercase text-white mt-0.5">
            Cross-Subsystem Dependency Graph
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Inspect real-time failure propagation across coupled electrical, thermal, RF, and mission layers.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Nominal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Degraded Cascade</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Critical Propagated</span>
          </div>
        </div>
      </div>

      {/* Causal Chain Waterfall — shows actual model state deltas */}
      {hasBatteryFault && (() => {
        // Nominal baselines (sunlit, no fault)
        const nomBusV = 29.8 * 0.98;
        const nomBattTemp = 31.0;
        const nomLinkMargin = 6.8;
        const nomThroughput = 180.0;

        const curBusV = subsystems.power.busVoltage;
        const curBattTemp = subsystems.thermal.batteryCellTemp;
        const curLinkMargin = subsystems.communication.linkMargin;
        const curThroughput = subsystems.payload.sensorThroughput;

        const deltaVolt = curBusV - nomBusV;
        const deltaTemp = curBattTemp - nomBattTemp;
        const deltaMargin = curLinkMargin - nomLinkMargin;
        const throughputPct = Math.round(((curThroughput - nomThroughput) / nomThroughput) * 100);

        const activeFaultSev = activeFaults.find(f => f.type === 'battery_degradation')?.severity ?? 0;

        const chainSteps = [
          {
            label: 'Battery Degradation',
            value: `+${activeFaultSev}% Cell Impedance`,
            delta: null,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10 border-rose-500/30',
            explanation: 'Internal resistance rises → higher I²R losses under same discharge current.',
            icon: '⚡',
          },
          {
            label: 'Bus Voltage',
            value: `${curBusV.toFixed(1)}V`,
            delta: `${deltaVolt >= 0 ? '+' : ''}${deltaVolt.toFixed(1)}V`,
            color: deltaVolt < -1 ? 'text-rose-400' : deltaVolt < 0 ? 'text-amber-400' : 'text-emerald-400',
            bg: 'bg-amber-500/10 border-amber-500/30',
            explanation: 'Bus voltage = battery terminal voltage × 0.98. Cell impedance voltage drop depresses available bus rail.',
            icon: '🔋',
          },
          {
            label: 'Battery Temperature',
            value: `${curBattTemp.toFixed(1)}°C`,
            delta: `${deltaTemp >= 0 ? '+' : ''}${deltaTemp.toFixed(1)}°C`,
            color: deltaTemp > 8 ? 'text-rose-400' : deltaTemp > 4 ? 'text-amber-400' : 'text-emerald-400',
            bg: 'bg-orange-500/10 border-orange-500/30',
            explanation: 'I²R = I² × R. Higher internal resistance at same discharge current → increased Joule heat generation.',
            icon: '🌡',
          },
          {
            label: 'RF Link Margin',
            value: `${curLinkMargin.toFixed(1)} dB`,
            delta: `${deltaMargin >= 0 ? '+' : ''}${deltaMargin.toFixed(1)} dB`,
            color: deltaMargin < -2 ? 'text-rose-400' : deltaMargin < 0 ? 'text-amber-400' : 'text-emerald-400',
            bg: 'bg-yellow-500/10 border-yellow-500/30',
            explanation: 'RF amplifier (TWTA) power budget constrained by bus voltage sag → reduced transmit power → lower link margin.',
            icon: '📡',
          },
          {
            label: 'Payload Throughput',
            value: `${curThroughput.toFixed(0)} MB/s`,
            delta: `${throughputPct >= 0 ? '+' : ''}${throughputPct}%`,
            color: throughputPct < -50 ? 'text-rose-400' : throughputPct < -20 ? 'text-amber-400' : 'text-emerald-400',
            bg: 'bg-purple-500/10 border-purple-500/30',
            explanation: 'Reduced power bus limits detector array clock rate. Reduced downlink margin forces duty-cycle reduction.',
            icon: '🛰',
          },
        ];

        return (
          <div className="bg-[#07090F] border border-cyan-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Live Causal Chain — Actual Model State
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 overflow-x-auto">
              {chainSteps.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className={`flex-shrink-0 p-3 rounded-xl border ${step.bg} min-w-[130px]`}>
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-wide">{step.icon} {step.label}</div>
                    <div className={`text-lg font-bold tabular-nums font-tech ${step.color}`}>{step.value}</div>
                    {step.delta !== null && (
                      <div className={`text-xs font-mono font-semibold ${step.color}`}>{step.delta} vs nominal</div>
                    )}
                    <div className="text-[10px] font-mono text-slate-500 mt-1 leading-relaxed max-w-[140px]">{step.explanation}</div>
                  </div>
                  {i < chainSteps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-cyan-500/60 flex-shrink-0 hidden sm:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main Graph Canvas and Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Dependency Canvas */}
        <div className="lg:col-span-8 bg-[#070A11] border border-white/10 rounded-xl p-4 relative min-h-[380px]">
          <svg viewBox="0 0 1000 500" className="w-full h-auto select-none">
            <defs>
              <linearGradient id="edgeGradientNominal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="edgeGradientWarning" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Dependency Connecting Lines */}
            {edges.map((edge, idx) => {
              const fromNode = nodes.find(n => n.id === edge.from)!;
              const toNode = nodes.find(n => n.id === edge.to)!;

              const x1 = fromNode.x * 10;
              const y1 = fromNode.y * 5;
              const x2 = toNode.x * 10;
              const y2 = toNode.y * 5;

              const isDegraded = fromNode.status !== 'NOMINAL' || toNode.status !== 'NOMINAL';

              return (
                <g key={idx}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isDegraded ? 'url(#edgeGradientWarning)' : 'url(#edgeGradientNominal)'}
                    strokeWidth={isDegraded ? '2.5' : '1.8'}
                    strokeDasharray={isDegraded ? '6 4' : 'none'}
                    className={isDegraded ? 'animate-pulse' : ''}
                  />
                  {/* Midpoint Label */}
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px] font-mono select-none"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const x = node.x * 10;
              const y = node.y * 5;
              const isSelected = selectedNodeId === node.id;
              const colors = getStatusColor(node.status);

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer transition-all hover:scale-105"
                  style={{ transformOrigin: `${x}px ${y}px` }}
                >
                  {/* Outer Glow Halo if selected */}
                  {isSelected && (
                    <circle cx={x} cy={y} r="36" fill="rgba(6, 182, 212, 0.15)" stroke="#06B6D4" strokeWidth="1.5" />
                  )}

                  {/* Main Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r="28"
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? '3' : '2'}
                  />

                  {/* Health number */}
                  <text
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    className="fill-white font-mono font-bold text-xs pointer-events-none tabular-nums"
                  >
                    {node.health}%
                  </text>

                  {/* Node Label Below */}
                  <text
                    x={x}
                    y={y + 44}
                    textAnchor="middle"
                    className="fill-slate-300 font-tech font-semibold text-xs pointer-events-none"
                  >
                    {node.name}
                  </text>
                  <text
                    x={x}
                    y={y + 58}
                    textAnchor="middle"
                    className={`font-mono text-[10px] uppercase pointer-events-none ${colors.text}`}
                  >
                    ● {node.status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Diagnostic Inspector Panel */}
        <div className="lg:col-span-4 bg-[#070A11] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400">Node Deep-Dive Telemetry</span>
              <h3 className="font-tech text-lg font-bold text-white uppercase mt-0.5">{selectedNode.name}</h3>
            </div>
            <div className="text-right">
              <span className={`text-xs font-mono font-bold ${getStatusColor(selectedNode.status).text}`}>
                ● {selectedNode.status}
              </span>
              <div className="text-xs font-mono text-slate-400 tabular-nums">Health: {selectedNode.health}%</div>
            </div>
          </div>

          {/* Hard Telemetry Evidence */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400">Observed Telemetry Evidence</span>
            <div className="p-2.5 rounded bg-white/5 border border-white/5 text-xs font-mono text-slate-200">
              {selectedNode.evidence}
            </div>
          </div>

          {/* Contributing Upstream Factors */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Contributing Upstream Factors</span>
            <ul className="space-y-1 text-xs font-mono text-slate-300">
              {selectedNode.contributingFactors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Predicted Failure Impact */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-mono uppercase text-amber-400">Predicted Downstream Impact</span>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">{selectedNode.predictedImpact}</p>
          </div>

          {/* Timeframe & Confidence */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Failure Horizon</span>
              <span className="text-cyan-300 font-semibold">{selectedNode.timeframe}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Confidence</span>
              <span className="text-emerald-400 font-semibold">{selectedNode.confidence}% Physics Match</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
