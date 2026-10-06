import React, { useState } from 'react';
import { TelemetryPoint } from '../types/spacecraft';
import { DetectorResult, calculateResidualPoint, calculateNominalPrediction } from '../services/twinModel';
import { Activity, Zap, Thermometer, Radio, Database, GitCompare, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TelemetryChartsProps {
  history: TelemetryPoint[];
  current: TelemetryPoint;
  detectorResult?: DetectorResult;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history, current, detectorResult }) => {
  const [viewMode, setViewMode] = useState<'standard' | 'residual'>('residual');
  const [activeChannel, setActiveChannel] = useState<'power' | 'thermal' | 'comm' | 'payload'>('power');
  const [residualChannel, setResidualChannel] = useState<'busVoltage' | 'batteryTemp'>('busVoltage');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If history is small, synthesize prior nominal points for smooth visualization
  const displayPoints = history.length > 5 ? history.slice(-40) : [current];

  // SVG Chart Dimensions
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Residual Strip Dimensions
  const stripHeight = 90;
  const stripPadding = { top: 10, right: 30, bottom: 25, left: 55 };
  const stripGraphHeight = stripHeight - stripPadding.top - stripPadding.bottom;

  // Extract standard channels
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

  // Calculate Residual series (F1)
  const residualPoints = displayPoints.map(calculateResidualPoint);

  const measuredResidualData =
    residualChannel === 'busVoltage'
      ? residualPoints.map(r => r.measuredBusVoltage)
      : residualPoints.map(r => r.measuredBatteryTemp);

  const predictedResidualData =
    residualChannel === 'busVoltage'
      ? residualPoints.map(r => r.predictedBusVoltage)
      : residualPoints.map(r => r.predictedBatteryTemp);

  const residualDeltaData =
    residualChannel === 'busVoltage'
      ? residualPoints.map(r => r.residualBusVoltage)
      : residualPoints.map(r => r.residualBatteryTemp);

  const residualUnit = residualChannel === 'busVoltage' ? 'V' : '°C';
  const residualMin = residualChannel === 'busVoltage' ? 18 : 10;
  const residualMax = residualChannel === 'busVoltage' ? 32 : 45;

  // Strip min/max (centered around zero)
  const stripAbsMax = residualChannel === 'busVoltage' ? 6.0 : 12.0;
  const stripMin = -stripAbsMax;
  const stripMax = stripAbsMax;

  // Thresholds for residual strip
  const watchThresh = residualChannel === 'busVoltage' ? 0.5 : 1.2;
  const anomalyThresh = residualChannel === 'busVoltage' ? 1.6 : 2.8;

  // Coordinate helper
  const getCoordinates = (val: number, index: number, total: number, cMin: number, cMax: number) => {
    const x = padding.left + (index / Math.max(1, total - 1)) * graphWidth;
    const clamped = Math.max(cMin, Math.min(cMax, val));
    const normalized = (clamped - cMin) / (cMax - cMin);
    const y = padding.top + graphHeight - normalized * graphHeight;
    return { x, y };
  };

  const getStripCoordinates = (val: number, index: number, total: number) => {
    const x = stripPadding.left + (index / Math.max(1, total - 1)) * graphWidth;
    const clamped = Math.max(stripMin, Math.min(stripMax, val));
    const normalized = (clamped - stripMin) / (stripMax - stripMin);
    const y = stripPadding.top + stripGraphHeight - normalized * stripGraphHeight;
    return { x, y };
  };

  const primaryPointsStr = primaryData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, primaryData.length, minVal, maxVal);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const secondaryPointsStr = secondaryData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, secondaryData.length, minVal, maxVal);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const residualMeasuredStr = measuredResidualData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, measuredResidualData.length, residualMin, residualMax);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const residualPredictedStr = predictedResidualData
    .map((val, idx) => {
      const { x, y } = getCoordinates(val, idx, predictedResidualData.length, residualMin, residualMax);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const residualDeltaStr = residualDeltaData
    .map((val, idx) => {
      const { x, y } = getStripCoordinates(val, idx, residualDeltaData.length);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const hoveredPoint =
    hoveredIndex !== null && displayPoints[hoveredIndex] ? displayPoints[hoveredIndex] : current;

  const hoveredResidual =
    hoveredIndex !== null && residualPoints[hoveredIndex]
      ? residualPoints[hoveredIndex]
      : residualPoints[residualPoints.length - 1];

  const currentDetState = detectorResult?.state || 'NOMINAL';

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-4">
      {/* Header and View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Spacecraft Telemetry & Residual Divergence
            </span>
            {detectorResult && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1 ${
                  currentDetState === 'ANOMALY'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : currentDetState === 'WATCH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {currentDetState === 'ANOMALY' && <AlertTriangle className="w-3 h-3" />}
                {currentDetState === 'WATCH' && <AlertTriangle className="w-3 h-3" />}
                {currentDetState === 'NOMINAL' && <ShieldCheck className="w-3 h-3" />}
                <span>DETECTOR: {currentDetState}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-tech text-base font-semibold text-white">
              {viewMode === 'residual'
                ? `F1: Twin vs Reality Residual — ${residualChannel === 'busVoltage' ? 'Main Bus Voltage' : 'Battery Core Temp'}`
                : `${primaryLabel} vs ${secondaryLabel}`}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              1.0 Hz Ingestion
            </span>
          </div>
        </div>

        {/* View Mode Toggle & Subsystem Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* F1 Residual Mode Button */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setViewMode('residual')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === 'residual'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Twin Residual (F1)</span>
            </button>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === 'standard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetry Feeds</span>
            </button>
          </div>

          {/* Sub-channel picker */}
          {viewMode === 'residual' ? (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setResidualChannel('busVoltage')}
                className={`px-2 py-1 rounded transition-colors ${
                  residualChannel === 'busVoltage'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bus Voltage
              </button>
              <button
                onClick={() => setResidualChannel('batteryTemp')}
                className={`px-2 py-1 rounded transition-colors ${
                  residualChannel === 'batteryTemp'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Battery Temp
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveChannel('power')}
                className={`px-2 py-1 rounded ${activeChannel === 'power' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Power
              </button>
              <button
                onClick={() => setActiveChannel('thermal')}
                className={`px-2 py-1 rounded ${activeChannel === 'thermal' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Thermal
              </button>
              <button
                onClick={() => setActiveChannel('comm')}
                className={`px-2 py-1 rounded ${activeChannel === 'comm' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Comm
              </button>
              <button
                onClick={() => setActiveChannel('payload')}
                className={`px-2 py-1 rounded ${activeChannel === 'payload' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Payload
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main SVG Chart */}
      <div className="relative w-full overflow-hidden space-y-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + graphHeight * (1 - pct);
            const val =
              viewMode === 'residual'
                ? residualMin + (residualMax - residualMin) * pct
                : minVal + (maxVal - minVal) * pct;
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

          {/* Critical Threshold Warning Line in standard power mode */}
          {viewMode === 'standard' && activeChannel === 'power' && (
            <g>
              <line
                x1={padding.left}
                y1={getCoordinates(24, 0, 1, minVal, maxVal).y}
                x2={width - padding.right}
                y2={getCoordinates(24, 0, 1, minVal, maxVal).y}
                stroke="rgba(239, 68, 68, 0.6)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text
                x={width - padding.right - 4}
                y={getCoordinates(24, 0, 1, minVal, maxVal).y - 6}
                textAnchor="end"
                className="fill-rose-400 text-[9px] font-mono uppercase"
              >
                Critical Bus Floor (24.0V)
              </text>
            </g>
          )}

          {/* Curves based on Mode */}
          {viewMode === 'residual' ? (
            <>
              {/* Nominal Twin Prediction (Dashed Yellow/Amber) */}
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={residualPredictedStr}
              />

              {/* Measured Reality (Solid Cyan) */}
              <polyline
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={residualMeasuredStr}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          {/* Interactive Mouse Hover Crosshair */}
          {hoveredIndex !== null && (
            <g>
              {viewMode === 'residual' ? (
                <>
                  <line
                    x1={
                      getCoordinates(
                        measuredResidualData[hoveredIndex],
                        hoveredIndex,
                        measuredResidualData.length,
                        residualMin,
                        residualMax
                      ).x
                    }
                    y1={padding.top}
                    x2={
                      getCoordinates(
                        measuredResidualData[hoveredIndex],
                        hoveredIndex,
                        measuredResidualData.length,
                        residualMin,
                        residualMax
                      ).x
                    }
                    y2={padding.top + graphHeight}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={
                      getCoordinates(
                        measuredResidualData[hoveredIndex],
                        hoveredIndex,
                        measuredResidualData.length,
                        residualMin,
                        residualMax
                      ).x
                    }
                    cy={
                      getCoordinates(
                        measuredResidualData[hoveredIndex],
                        hoveredIndex,
                        measuredResidualData.length,
                        residualMin,
                        residualMax
                      ).y
                    }
                    r="4.5"
                    fill="#06B6D4"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={
                      getCoordinates(
                        predictedResidualData[hoveredIndex],
                        hoveredIndex,
                        predictedResidualData.length,
                        residualMin,
                        residualMax
                      ).x
                    }
                    cy={
                      getCoordinates(
                        predictedResidualData[hoveredIndex],
                        hoveredIndex,
                        predictedResidualData.length,
                        residualMin,
                        residualMax
                      ).y
                    }
                    r="4"
                    fill="#F59E0B"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                </>
              ) : (
                <>
                  <line
                    x1={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length, minVal, maxVal).x}
                    y1={padding.top}
                    x2={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length, minVal, maxVal).x}
                    y2={padding.top + graphHeight}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length, minVal, maxVal).x}
                    cy={getCoordinates(primaryData[hoveredIndex], hoveredIndex, primaryData.length, minVal, maxVal).y}
                    r="4.5"
                    fill="#06B6D4"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={getCoordinates(secondaryData[hoveredIndex], hoveredIndex, secondaryData.length, minVal, maxVal).x}
                    cy={getCoordinates(secondaryData[hoveredIndex], hoveredIndex, secondaryData.length, minVal, maxVal).y}
                    r="4"
                    fill="#F59E0B"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}

          {/* Hover Capture Slices */}
          {displayPoints.map((_, idx) => {
            const step = graphWidth / Math.max(1, displayPoints.length);
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

        {/* Legend for Main Chart */}
        <div className="flex items-center justify-between text-xs font-mono px-2 pt-1">
          {viewMode === 'residual' ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400" />
                <span className="text-slate-300">Measured Telemetry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
                <span className="text-slate-300">Twin Nominal Prediction</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400" />
                <span className="text-slate-300">{primaryLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
                <span className="text-slate-300">{secondaryLabel}</span>
              </div>
            </div>
          )}

          <span className="text-[11px] text-slate-500 font-mono">
            {hoveredResidual ? `T+${Math.floor(hoveredResidual.missionTime / 3600).toString().padStart(2, '0')}:${Math.floor((hoveredResidual.missionTime % 3600) / 60).toString().padStart(2, '0')}:${(hoveredResidual.missionTime % 60).toString().padStart(2, '0')}` : ''}
          </span>
        </div>

        {/* Residual Strip Chart (Under main chart in Residual Mode — Section 8) */}
        {viewMode === 'residual' && (
          <div className="mt-3 p-3 rounded-lg bg-[#070A11] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="uppercase text-slate-400 font-semibold">
                  Residual Strip (Measured − Twin Prediction)
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  Thresholds: Watch ±{watchThresh}{residualUnit} | Anomaly ±{anomalyThresh}{residualUnit}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-400">Current Delta:</span>
                <span
                  className={`font-bold tabular-nums ${
                    Math.abs(residualDeltaData[residualDeltaData.length - 1] || 0) >= anomalyThresh
                      ? 'text-rose-400'
                      : Math.abs(residualDeltaData[residualDeltaData.length - 1] || 0) >= watchThresh
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {(residualDeltaData[residualDeltaData.length - 1] || 0) > 0 ? '+' : ''}
                  {(residualDeltaData[residualDeltaData.length - 1] || 0).toFixed(2)} {residualUnit}
                </span>
              </div>
            </div>

            <svg viewBox={`0 0 ${width} ${stripHeight}`} className="w-full h-auto select-none">
              {/* Shaded Threshold Bands */}
              {/* Anomaly Upper Band */}
              <rect
                x={stripPadding.left}
                y={stripPadding.top}
                width={graphWidth}
                height={Math.max(0, getStripCoordinates(anomalyThresh, 0, 1).y - stripPadding.top)}
                fill="rgba(239, 68, 68, 0.08)"
              />
              {/* Anomaly Lower Band */}
              <rect
                x={stripPadding.left}
                y={getStripCoordinates(-anomalyThresh, 0, 1).y}
                width={graphWidth}
                height={Math.max(0, stripPadding.top + stripGraphHeight - getStripCoordinates(-anomalyThresh, 0, 1).y)}
                fill="rgba(239, 68, 68, 0.08)"
              />

              {/* Watch Upper Band */}
              <rect
                x={stripPadding.left}
                y={getStripCoordinates(anomalyThresh, 0, 1).y}
                width={graphWidth}
                height={Math.max(0, getStripCoordinates(watchThresh, 0, 1).y - getStripCoordinates(anomalyThresh, 0, 1).y)}
                fill="rgba(245, 158, 11, 0.08)"
              />
              {/* Watch Lower Band */}
              <rect
                x={stripPadding.left}
                y={getStripCoordinates(-watchThresh, 0, 1).y}
                width={graphWidth}
                height={Math.max(0, getStripCoordinates(-anomalyThresh, 0, 1).y - getStripCoordinates(-watchThresh, 0, 1).y)}
                fill="rgba(245, 158, 11, 0.08)"
              />

              {/* Safe Band (between -watch and +watch) */}
              <rect
                x={stripPadding.left}
                y={getStripCoordinates(watchThresh, 0, 1).y}
                width={graphWidth}
                height={Math.max(0, getStripCoordinates(-watchThresh, 0, 1).y - getStripCoordinates(watchThresh, 0, 1).y)}
                fill="rgba(16, 185, 129, 0.05)"
              />

              {/* Zero Line (Nominal agreement) */}
              <line
                x1={stripPadding.left}
                y1={getStripCoordinates(0, 0, 1).y}
                x2={width - stripPadding.right}
                y2={getStripCoordinates(0, 0, 1).y}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="2 2"
                strokeWidth="1.2"
              />
              <text
                x={stripPadding.left - 6}
                y={getStripCoordinates(0, 0, 1).y + 3}
                textAnchor="end"
                className="fill-slate-400 text-[9px] font-mono"
              >
                0.0
              </text>

              {/* Threshold Lines */}
              <line
                x1={stripPadding.left}
                y1={getStripCoordinates(watchThresh, 0, 1).y}
                x2={width - stripPadding.right}
                y2={getStripCoordinates(watchThresh, 0, 1).y}
                stroke="rgba(245, 158, 11, 0.4)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={stripPadding.left}
                y1={getStripCoordinates(-watchThresh, 0, 1).y}
                x2={width - stripPadding.right}
                y2={getStripCoordinates(-watchThresh, 0, 1).y}
                stroke="rgba(245, 158, 11, 0.4)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              <line
                x1={stripPadding.left}
                y1={getStripCoordinates(anomalyThresh, 0, 1).y}
                x2={width - stripPadding.right}
                y2={getStripCoordinates(anomalyThresh, 0, 1).y}
                stroke="rgba(239, 68, 68, 0.5)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={stripPadding.left}
                y1={getStripCoordinates(-anomalyThresh, 0, 1).y}
                x2={width - stripPadding.right}
                y2={getStripCoordinates(-anomalyThresh, 0, 1).y}
                stroke="rgba(239, 68, 68, 0.5)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Residual Polyline (F1) */}
              <polyline
                fill="none"
                stroke={
                  Math.abs(residualDeltaData[residualDeltaData.length - 1] || 0) >= anomalyThresh
                    ? '#EF4444'
                    : Math.abs(residualDeltaData[residualDeltaData.length - 1] || 0) >= watchThresh
                    ? '#F59E0B'
                    : '#06B6D4'
                }
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={residualDeltaStr}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Numerical HUD Readout Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs font-mono">
        {viewMode === 'residual' ? (
          <>
            <div className="p-2.5 rounded bg-white/5 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase">Measured Reality</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-cyan-300 tabular-nums">
                  {residualChannel === 'busVoltage'
                    ? hoveredResidual.measuredBusVoltage
                    : hoveredResidual.measuredBatteryTemp}
                </span>
                <span className="text-slate-400 text-[10px]">{residualUnit}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/5 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase">Twin Nominal Pred</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold text-amber-300 tabular-nums">
                  {residualChannel === 'busVoltage'
                    ? hoveredResidual.predictedBusVoltage
                    : hoveredResidual.predictedBatteryTemp}
                </span>
                <span className="text-slate-400 text-[10px]">{residualUnit}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/5 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase">Residual Divergence</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-lg font-bold tabular-nums ${
                    Math.abs(residualChannel === 'busVoltage' ? hoveredResidual.residualBusVoltage : hoveredResidual.residualBatteryTemp) >= anomalyThresh
                      ? 'text-rose-400'
                      : Math.abs(residualChannel === 'busVoltage' ? hoveredResidual.residualBusVoltage : hoveredResidual.residualBatteryTemp) >= watchThresh
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {(residualChannel === 'busVoltage' ? hoveredResidual.residualBusVoltage : hoveredResidual.residualBatteryTemp) > 0 ? '+' : ''}
                  {residualChannel === 'busVoltage' ? hoveredResidual.residualBusVoltage : hoveredResidual.residualBatteryTemp}
                </span>
                <span className="text-slate-400 text-[10px]">{residualUnit}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/5 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase">Detector State</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-sm font-bold uppercase ${
                    currentDetState === 'ANOMALY'
                      ? 'text-rose-400'
                      : currentDetState === 'WATCH'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  ● {currentDetState}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">
                  (EWMA: {detectorResult?.ewmaBusVoltage ? `${detectorResult.ewmaBusVoltage}V` : '0V'})
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
