import React, { useState, useEffect } from 'react';
import { fetchMlBenchmark, MlBenchmarkData } from '../services/api';
import { Cpu, RefreshCw, AlertTriangle, CheckCircle2, Database, HelpCircle, Layers, Activity } from 'lucide-react';

export const ModelLabView: React.FC = () => {
  const [data, setData] = useState<MlBenchmarkData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<string>('B0005');
  const [hoveredPoint, setHoveredPoint] = useState<{ cycle: number; trueSoh: number; predSoh: number } | null>(null);

  const loadBenchmark = async () => {
    setLoading(true);
    try {
      const res = await fetchMlBenchmark();
      setData(res);
      if (res?.batteryReplay) {
        const cells = Object.keys(res.batteryReplay);
        if (cells.length > 0 && !cells.includes(selectedCell)) {
          setSelectedCell(cells[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load ML benchmark:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBenchmark();
  }, []);

  const replayPoints = data?.batteryReplay?.[selectedCell] || [];
  const batteryMetrics = data?.battery;
  const opssatMetrics = data?.opssat;

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar */}
      <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Offline ML Training & Validation Benchmarks
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                PROVABLE SCIENCE
              </span>
            </div>
            <h2 className="font-tech text-xl font-bold uppercase text-white mt-1">
              MODEL LAB — PUBLIC DATASET PERFORMANCE
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-3xl">
              Evaluation results of machine learning models trained offline on verified public aerospace telemetry datasets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadBenchmark}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh Benchmark</span>
            </button>
          </div>
        </div>

        {/* Mandatory Aerospace Disclosure Notice */}
        <div className="mt-3.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs font-mono text-amber-200/90 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 uppercase tracking-wider">Mandatory Model Disclosure: </span>
            Trained on real public data (NASA PCoE, ESA OPS-SAT) from different hardware than the simulated spacecraft. Offline benchmark, not live truth.
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-12 text-center space-y-3">
          <div className="inline-block p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
          <div className="font-tech text-lg text-white uppercase">Querying Model Benchmark Registry...</div>
          <div className="text-xs font-mono text-slate-400">Loading offline metrics artifacts from /models/ directory</div>
        </div>
      )}

      {/* Empty State when Models Not Trained */}
      {!loading && (!data || !data.available || (!batteryMetrics && !opssatMetrics)) && (
        <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-8 lg:p-12 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Database className="w-7 h-7 text-cyan-400" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="font-tech text-xl font-bold uppercase text-white tracking-wide">
              Models not trained yet
            </h3>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Models not trained yet. Run <code className="text-cyan-300 bg-white/5 px-1.5 py-0.5 rounded">ml/train_battery.py</code> and <code className="text-cyan-300 bg-white/5 px-1.5 py-0.5 rounded">ml/train_opssat.py</code>.
            </p>
          </div>

          <div className="max-w-2xl mx-auto text-left bg-[#05070B] border border-white/10 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-3">
            <div className="text-slate-500 flex items-center justify-between border-b border-white/5 pb-2 text-[11px] uppercase tracking-wider">
              <span>Offline Training Instructions</span>
              <span>Python 3.10+</span>
            </div>
            <div className="space-y-1.5 text-cyan-300 text-[11px] select-all">
              <div className="text-slate-500"># 1. Install ML dependencies:</div>
              <div>pip install -r ml/requirements.txt</div>
              <div className="text-slate-500 mt-2"># 2. Train NASA PCoE battery SOH model (Leave-One-Battery-Out):</div>
              <div>python ml/train_battery.py</div>
              <div className="text-slate-500 mt-2"># 3. Train ESA OPSSAT-AD satellite anomaly detection benchmark:</div>
              <div>python ml/train_opssat.py</div>
            </div>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
              Trained metrics and replay traces will be saved into <code className="text-white">models/*.json</code> and rendered here automatically upon clicking Refresh.
            </p>
          </div>
        </div>
      )}

      {/* Render Benchmark Cards when data is present */}
      {!loading && data && (batteryMetrics || opssatMetrics) && (
        <div className="space-y-6">
          {/* CARD 1: NASA PCoE Battery SOH Regression */}
          {batteryMetrics ? (
            <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-5">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-base font-bold uppercase text-white">
                      1. NASA PCoE Li-Ion Battery Aging — State of Health (SOH)
                    </span>
                    {batteryMetrics.beats_dummy ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        ● BEATS BASELINE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        ▲ DOES NOT BEAT BASELINE
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Protocol: Leave-One-Battery-Out (LOBO) · Features from first 600s discharge: [v_mean_ratio, v_end_ratio, t_mean_delta]
                  </p>
                </div>

                {/* Held-out Cell Selector */}
                <div className="flex items-center gap-1.5 bg-[#05070B] border border-white/10 rounded-lg p-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 px-2">Hold-Out:</span>
                  {(['B0005', 'B0006', 'B0007', 'B0018'] as const).map(cell => (
                    <button
                      key={cell}
                      onClick={() => setSelectedCell(cell)}
                      className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                        selectedCell === cell
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cell}
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Line Chart: SOH True vs SOH Pred */}
              <div className="bg-[#05070B] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">
                      Cell <strong className="text-white">{selectedCell}</strong> Degradation Curve:
                    </span>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-3.5 h-0.5 bg-slate-200 inline-block" />
                        <span>True SOH (Discharge Capacity / 2.0 Ah)</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="w-3.5 h-0.5 border-t border-dashed border-cyan-400 inline-block" />
                        <span>Predicted SOH (GradientBoosting)</span>
                      </span>
                    </div>
                  </div>
                  {hoveredPoint && (
                    <div className="text-[11px] text-cyan-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 tabular-nums">
                      Cycle {hoveredPoint.cycle}: True {(hoveredPoint.trueSoh * 100).toFixed(1)}% | Pred {(hoveredPoint.predSoh * 100).toFixed(1)}% (Δ {Math.abs((hoveredPoint.predSoh - hoveredPoint.trueSoh) * 100).toFixed(2)}%)
                    </div>
                  )}
                </div>

                {replayPoints.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs font-mono text-slate-500">
                    No replay data available for cell {selectedCell}.
                  </div>
                ) : (
                  <div className="relative w-full h-64 select-none">
                    {/* SVG Chart */}
                    {(() => {
                      const width = 800;
                      const height = 240;
                      const padding = { top: 20, right: 30, bottom: 35, left: 55 };
                      const chartW = width - padding.left - padding.right;
                      const chartH = height - padding.top - padding.bottom;

                      const minCycle = 0;
                      const maxCycle = Math.max(...replayPoints.map(p => p.cycle), 1);
                      const minSoh = 0.55;
                      const maxSoh = 1.05;

                      const getX = (c: number) => padding.left + ((c - minCycle) / (maxCycle - minCycle)) * chartW;
                      const getY = (s: number) => padding.top + (1 - (s - minSoh) / (maxSoh - minSoh)) * chartH;

                      const truePath = replayPoints
                        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.cycle).toFixed(1)} ${getY(p.soh_true).toFixed(1)}`)
                        .join(' ');

                      const predPath = replayPoints
                        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.cycle).toFixed(1)} ${getY(p.soh_pred).toFixed(1)}`)
                        .join(' ');

                      // EOL threshold line (1.4 Ah / 2.0 Ah = 0.70)
                      const eolY = getY(0.70);

                      return (
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          className="w-full h-full overflow-visible font-mono text-[10px]"
                        >
                          {/* Grid Lines */}
                          {[0.6, 0.7, 0.8, 0.9, 1.0].map(s => {
                            const y = getY(s);
                            return (
                              <g key={s}>
                                <line
                                  x1={padding.left}
                                  y1={y}
                                  x2={width - padding.right}
                                  y2={y}
                                  stroke="rgba(255,255,255,0.06)"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={padding.left - 8}
                                  y={y + 3}
                                  textAnchor="end"
                                  fill="#64748b"
                                  className="tabular-nums"
                                >
                                  {(s * 100).toFixed(0)}%
                                </text>
                              </g>
                            );
                          })}

                          {/* Cycle markers */}
                          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                            const cycleVal = Math.round(minCycle + pct * (maxCycle - minCycle));
                            const x = getX(cycleVal);
                            return (
                              <g key={pct}>
                                <line
                                  x1={x}
                                  y1={padding.top}
                                  x2={x}
                                  y2={height - padding.bottom}
                                  stroke="rgba(255,255,255,0.04)"
                                />
                                <text
                                  x={x}
                                  y={height - padding.bottom + 16}
                                  textAnchor="middle"
                                  fill="#64748b"
                                  className="tabular-nums"
                                >
                                  Cyc {cycleVal}
                                </text>
                              </g>
                            );
                          })}

                          {/* EOL 70% Guideline */}
                          <line
                            x1={padding.left}
                            y1={eolY}
                            x2={width - padding.right}
                            y2={eolY}
                            stroke="rgba(239, 68, 68, 0.4)"
                            strokeWidth="1.2"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={width - padding.right - 4}
                            y={eolY - 5}
                            textAnchor="end"
                            fill="#ef4444"
                            className="text-[9px] font-semibold"
                          >
                            EOL THRESHOLD (70% SOH / 1.4 Ah)
                          </text>

                          {/* True SOH Path */}
                          <path
                            d={truePath}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />

                          {/* Predicted SOH Path */}
                          <path
                            d={predPath}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            strokeLinecap="round"
                          />

                          {/* Hover / Point targets */}
                          {replayPoints.map(p => {
                            const cx = getX(p.cycle);
                            const cy = getY(p.soh_pred);
                            return (
                              <circle
                                key={p.cycle}
                                cx={cx}
                                cy={cy}
                                r={hoveredPoint?.cycle === p.cycle ? 4 : 2}
                                fill={hoveredPoint?.cycle === p.cycle ? '#22d3ee' : '#06b6d4'}
                                className="cursor-pointer transition-all opacity-80 hover:opacity-100"
                                onMouseEnter={() =>
                                  setHoveredPoint({
                                    cycle: p.cycle,
                                    trueSoh: p.soh_true,
                                    predSoh: p.soh_pred,
                                  })
                                }
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Per-Cell MAE vs Dummy Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3">Held-Out Cell</th>
                      <th className="py-2 px-3 text-right">GBR Model MAE</th>
                      <th className="py-2 px-3 text-right">Dummy Baseline MAE</th>
                      <th className="py-2 px-3 text-right">Error Reduction</th>
                      <th className="py-2 px-3 text-right">RMSE</th>
                      <th className="py-2 px-3 text-right">Test Cycles</th>
                      <th className="py-2 px-3 text-right">EOL Cycle (&le;1.4Ah)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(batteryMetrics.per_cell || {}).map(([cellId, m]) => {
                      const diff = m.dummy_mae - m.mae;
                      const pctBetter = ((diff / m.dummy_mae) * 100).toFixed(1);
                      const isSelected = cellId === selectedCell;
                      const eolVal = batteryMetrics.eol_cycle_per_cell?.[cellId];

                      return (
                        <tr
                          key={cellId}
                          onClick={() => setSelectedCell(cellId)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-cyan-500/10 text-white' : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-cyan-300 flex items-center gap-1.5">
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                            {cellId}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-white font-bold">
                            {m.mae.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                            {m.dummy_mae.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <span className={diff > 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                              {diff > 0 ? `+${pctBetter}%` : `${pctBetter}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                            {m.rmse.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                            {m.n_test}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                            {eolVal !== undefined && eolVal !== -1 ? `Cycle ${eolVal}` : 'Never'}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary Row */}
                    <tr className="bg-white/5 border-t border-white/10 font-bold text-white">
                      <td className="py-2.5 px-3 uppercase tracking-wider text-cyan-300">
                        Overall LOBO Mean
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-cyan-400">
                        {batteryMetrics.mean_mae.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                        {batteryMetrics.mean_dummy_mae.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-400">
                        +{(
                          ((batteryMetrics.mean_dummy_mae - batteryMetrics.mean_mae) /
                            batteryMetrics.mean_dummy_mae) *
                          100
                        ).toFixed(1)}
                        %
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-tech text-base font-bold uppercase text-white">
                  1. NASA PCoE Li-Ion Battery Aging — State of Health (SOH)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10">
                  TRAINING PENDING
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                NASA Battery aging models have not been trained yet. Place <code className="text-cyan-300">B0005.mat, B0006.mat, B0007.mat, B0018.mat</code> into <code className="text-cyan-300">ml/data/nasa_battery/</code> and execute <code className="text-cyan-300">python ml/train_battery.py</code> to unlock LOBO SOH degradation curves.
              </p>
            </div>
          )}


          {/* CARD 2: ESA OPSSAT-AD Telemetry Anomaly Benchmark */}
          {opssatMetrics && (
            <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-base font-bold uppercase text-white">
                      2. ESA OPSSAT-AD — Satellite Telemetry Anomaly Benchmark
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      REAL SATELLITE DATA
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Dataset: Zenodo 12588359 (Ruszczak et al. arXiv 2407.04730) · Split: Train (N={opssatMetrics.n_train}), Test (N={opssatMetrics.n_test}) · Anomaly Rate: {(opssatMetrics.anomaly_rate_test * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Metrics Table: Model vs Dummy Baseline */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center justify-between">
                    <span>Performance Comparison on Test Set</span>
                    <span className="text-[11px] text-slate-500 lowercase">anomalies are rare; F1 & ROC-AUC primary</span>
                  </div>

                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3 text-right">Random Forest (Balanced)</th>
                        <th className="py-2 px-3 text-right">Dummy Baseline (Most Frequent)</th>
                        <th className="py-2 px-3 text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { key: 'f1', label: 'F1 Score (Harmonic Mean)' },
                        { key: 'roc_auc', label: 'ROC-AUC (Discrimination)' },
                        { key: 'precision', label: 'Precision (True Alarms)' },
                        { key: 'recall', label: 'Recall (Detection Rate)' },
                        { key: 'balanced_accuracy', label: 'Balanced Accuracy' },
                        { key: 'accuracy', label: 'Raw Accuracy (Secondary)' },
                      ].map(({ key, label }) => {
                        const mVal = (opssatMetrics.model as any)?.[key] ?? 0;
                        const dVal = (opssatMetrics.dummy_most_frequent as any)?.[key] ?? 0;
                        const delta = mVal - dVal;

                        return (
                          <tr key={key} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3 text-slate-300 font-medium">{label}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-cyan-300 font-bold">
                              {(mVal * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                              {(dVal * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">
                              <span
                                className={
                                  delta > 0
                                    ? 'text-emerald-400 font-bold'
                                    : delta < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }
                              >
                                {delta > 0 ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2x2 Confusion Matrix */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-semibold uppercase text-slate-300">
                    2x2 Confusion Matrix
                  </div>

                  {(() => {
                    const cm = opssatMetrics.model?.confusion_matrix || [[0, 0], [0, 0]];
                    const tn = cm[0]?.[0] ?? 0;
                    const fp = cm[0]?.[1] ?? 0;
                    const fn = cm[1]?.[0] ?? 0;
                    const tp = cm[1]?.[1] ?? 0;
                    const total = tn + fp + fn + tp || 1;

                    return (
                      <div className="bg-[#05070B] border border-white/10 rounded-xl p-3.5 space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {/* TN */}
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-[10px] text-emerald-400 font-semibold uppercase">True Negative (TN)</div>
                            <div className="text-lg font-tech font-bold text-white tabular-nums mt-1">{tn}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {((tn / total) * 100).toFixed(1)}% (Nominal)
                            </div>
                          </div>

                          {/* FP */}
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="text-[10px] text-amber-400 font-semibold uppercase">False Positive (FP)</div>
                            <div className="text-lg font-tech font-bold text-white tabular-nums mt-1">{fp}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {((fp / total) * 100).toFixed(1)}% (False Alarm)
                            </div>
                          </div>

                          {/* FN */}
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            <div className="text-[10px] text-rose-400 font-semibold uppercase">False Negative (FN)</div>
                            <div className="text-lg font-tech font-bold text-white tabular-nums mt-1">{fn}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {((fn / total) * 100).toFixed(1)}% (Missed)
                            </div>
                          </div>

                          {/* TP */}
                          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <div className="text-[10px] text-cyan-300 font-semibold uppercase">True Positive (TP)</div>
                            <div className="text-lg font-tech font-bold text-white tabular-nums mt-1">{tp}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {((tp / total) * 100).toFixed(1)}% (Detected)
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 border-t border-white/5 pt-2 text-center">
                          Total Test Points: <strong className="text-white tabular-nums">{total}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Top Predictive Features */}
              {opssatMetrics.top_features && opssatMetrics.top_features.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="text-xs font-mono font-semibold uppercase text-slate-400">
                    Key Informative Telemetry Features (Random Forest Gini Importance)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {opssatMetrics.top_features.slice(0, 6).map((feat, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded bg-[#05070B] border border-white/10 text-xs font-mono flex items-center gap-2"
                      >
                        <span className="text-slate-300 font-tech">{feat.feature}</span>
                        <span className="text-cyan-400 tabular-nums text-[11px] font-bold">
                          {(feat.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
