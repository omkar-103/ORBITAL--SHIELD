import React, { useState } from 'react';
import { TelemetryPoint } from '../types/spacecraft';
import { Activity, Zap, Thermometer, Radio, Database, SlidersHorizontal } from 'lucide-react';

interface TelemetryChartsProps {
  history: TelemetryPoint[];
  current: TelemetryPoint;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history, current }) => {
  const [activeChannel, setActiveChannel] = useState<'power' | 'thermal' | 'comm' | 'payload'>('power');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If history is small, synthesize prior nominal points for smooth visualization
  const displayPoints = history.length > 5 ? history.slice(-40) : [current];

  // SVG Chart Dimensions
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Extract channels
  let primaryData: number[] = [];
  let secondaryData: number[] = [];
  let primaryLabel = '';
  let secondaryLabel = '';
  let primaryUnit = '';
  let secondaryUnit = '';
  let minVal = 0;
  let maxVal = 100;

  if (activeChannel === 'power') {
    primaryLabel = 'Battery Bus Voltage';
    primaryUnit = 'V';
    secondaryLabel = 'Battery Temperature';
    secondaryUnit = '°C';
    primaryData = displayPoints.map(p => p.subsystems.power.batteryVoltage);
    secondaryData = displayPoints.map(p => p.subsystems.power.batteryTemp);
    minVal = 20;
    maxVal = 45;
  } else if (activeChannel === 'thermal') {
    primaryLabel = 'Battery Cell Core Temp';
    primaryUnit = '°C';
    secondaryLabel = 'Radiator Face Temp';
    secondaryUnit = '°C';
    primaryData = displayPoints.map(p => p.subsystems.thermal.batteryCellTemp);
    secondaryData = displayPoints.map(p => p.subsystems.thermal.radiatorTemp);
    minVal = -20;
    maxVal = 55;
  } else if (activeChannel === 'comm') {
    primaryLabel = 'Signal-to-Noise Ratio (SNR)';
    primaryUnit = 'dB';
    secondaryLabel = 'Packet Loss Rate';
    secondaryUnit = '%';
    primaryData = displayPoints.map(p => p.subsystems.communication.snr);
    secondaryData = displayPoints.map(p => p.subsystems.communication.packetLoss);
    minVal = 0;
    maxVal = 25;
  } else {
    primaryLabel = 'Sensor Throughput';
    primaryUnit = 'MB/s';
    secondaryLabel = 'Buffer Fill';
    secondaryUnit = '%';
    primaryData = displayPoints.map(p => p.subsystems.payload.sensorThroughput);
    secondaryData = displayPoints.map(p => p.subsystems.payload.bufferFill);
    minVal = 0;
    maxVal = 220;
  }

  // Calculate SVG polyline path
  const getCoordinates = (val: number, index: number, total: number) => {
    const x = padding.left + (index / Math.max(1, total - 1)) * graphWidth;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const normalized = (clamped - minVal) / (maxVal - minVal);
    const y = padding.top + graphHeight - normalized * graphHeight;
    return { x, y };
  };

  const primaryPointsStr = primaryData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, primaryData.length);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const secondaryPointsStr = secondaryData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, secondaryData.length);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const hoveredPoint =
    hoveredIndex !== null && displayPoints[hoveredIndex] ? displayPoints[hoveredIndex] : current;

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-4">
      {/* Header and Channel Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Real-Time Multi-Channel Telemetry
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-tech text-base font-semibold text-white">
              {primaryLabel} vs {secondaryLabel}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              1.0 Hz Ingestion
            </span>
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveChannel('power')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeChannel === 'power' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power</span>
          </button>
          <button
            onClick={() => setActiveChannel('thermal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeChannel === 'thermal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Thermal</span>
          </button>
          <button
            onClick={() => setActiveChannel('comm')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeChannel === 'comm' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>RF Comm</span>
          </button>
          <button
            onClick={() => setActiveChannel('payload')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeChannel === 'payload' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Payload</span>
          </button>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + graphHeight * (1 - pct);
            const val = minVal + (maxVal - minVal) * pct;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Critical Threshold Warning Line (e.g. 24V or 35°C) */}
          {activeChannel === 'power' && (
            <g>
              <line
                x1={padding.left}
                y1={getCoordinates(24, 0, 1).y}
                x2={width - padding.right}
                y2={getCoordinates(24, 0, 1).y}
                stroke="rgba(239, 68, 68, 0.6)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text
                x={width - padding.right - 4}
                y={getCoordinates(24, 0, 1).y - 6}
                textAnchor="end"
                className="fill-rose-400 text-[9px] font-mono uppercase"
              >
                Critical Bus Floor (24.0V)
              </text>
            </g>
          )}

          {/* Primary Curve (Cyan Solid) */}
          <polyline
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPointsStr}
          />

          {/* Secondary Curve (Amber Dashed) */}
          <polyline
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={secondaryPointsStr}
          />

          {/* Interactive Mouse Hover Crosshair */}
          {hoveredIndex !== null && primaryData[hoveredIndex] !== undefined && (
            <g>
              <line
                x1={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length).x}
                y1={padding.top}
                x2={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length).x}
                y2={padding.top + graphHeight}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1"
              />
              <circle
                cx={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length).x}
                cy={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length).y}
                r="4.5"
                fill="#06B6D4"
                stroke="#fff"
                strokeWidth="1.5"
              />
              <circle
                cx={getCoordinates(secondaryData[hoveredIndex], hoveredIndex, secondaryData.length).x}
                cy={getCoordinates(secondaryData[hoveredIndex], hoveredIndex, secondaryData.length).y}
                r="4"
                fill="#F59E0B"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Hover Capture Slices */}
          {primaryData.map((_, idx) => {
            const step = graphWidth / Math.max(1, primaryData.length);
            const x = padding.left + (idx - 0.5) * step;
            return (
              <rect
                key={idx}
                x={x}
                y={padding.top}
                width={step}
                height={graphHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Numerical HUD Readout Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs font-mono">
        <div className="p-2.5 rounded bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[10px] uppercase">{primaryLabel}</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-cyan-300 tabular-nums">
              {activeChannel === 'power'
                ? hoveredPoint.subsystems.power.batteryVoltage
                : activeChannel === 'thermal'
                ? hoveredPoint.subsystems.thermal.batteryCellTemp
                : activeChannel === 'comm'
                ? hoveredPoint.subsystems.communication.snr
                : hoveredPoint.subsystems.payload.sensorThroughput}
            </span>
            <span className="text-slate-400 text-[10px]">{primaryUnit}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[10px] uppercase">{secondaryLabel}</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-amber-300 tabular-nums">
              {activeChannel === 'power'
                ? hoveredPoint.subsystems.power.batteryTemp
                : activeChannel === 'thermal'
                ? hoveredPoint.subsystems.thermal.radiatorTemp
                : activeChannel === 'comm'
                ? hoveredPoint.subsystems.communication.packetLoss
                : hoveredPoint.subsystems.payload.bufferFill}
            </span>
            <span className="text-slate-400 text-[10px]">{secondaryUnit}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[10px] uppercase">Solar Illumination</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold text-white tabular-nums">
              {hoveredPoint.subsystems.power.solarGeneration}
            </span>
            <span className="text-slate-400 text-[10px]">W ({hoveredPoint.inEclipse ? 'Eclipse' : 'Sun'})</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white/5 border border-white/5">
          <span className="text-slate-400 block text-[10px] uppercase">Telemetry Timestamp</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-semibold text-slate-300 tabular-nums">
              {new Date(hoveredPoint.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
