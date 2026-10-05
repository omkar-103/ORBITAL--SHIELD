import React from 'react';
import { AIAnalysisResult } from '../types/spacecraft';
import { Brain, CheckCircle, AlertTriangle, ArrowRightCircle, Sparkles, RefreshCw } from 'lucide-react';

interface AIAnalysisPanelProps {
  analysis: AIAnalysisResult;
  onRefreshAI: () => Promise<void>;
  isLoading: boolean;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  analysis,
  onRefreshAI,
  isLoading,
}) => {
  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Evidence-Grounded AI Safety Analysis
            </span>
          </div>
          <h2 className="font-tech text-xl font-bold uppercase text-white mt-0.5">
            Digital Twin Anomaly & Prognostics Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Strictly grounded in physical digital twin telemetry. Zero speculative hallucinations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Model: <span className="text-cyan-300 font-semibold">{analysis.model}</span>
          </span>

          <button
            onClick={onRefreshAI}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Re-Evaluate Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* 3 Strict Category Panels: OBSERVED / PREDICTED / RECOMMENDED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. OBSERVED (Facts & Sensor Readings) */}
        <div className="bg-[#070A11] border border-cyan-500/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="font-tech text-sm font-bold uppercase tracking-wider text-cyan-300">
                1. Observed
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Hard Evidence</span>
          </div>

          <p className="text-xs font-mono text-slate-300 leading-relaxed min-h-[90px]">
            {analysis.observed}
          </p>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Source: Spacecraft Bus Telemetry</span>
            <span className="text-cyan-400">Verified</span>
          </div>
        </div>

        {/* 2. PREDICTED (Physical Extrapolation) */}
        <div className="bg-[#070A11] border border-amber-500/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="font-tech text-sm font-bold uppercase tracking-wider text-amber-300">
                2. Predicted
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Physics Extrapolation</span>
          </div>

          <p className="text-xs font-mono text-slate-300 leading-relaxed min-h-[90px]">
            {analysis.predicted}
          </p>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Horizon: 15 to 90 min window</span>
            <span className="text-amber-400">High Risk</span>
          </div>
        </div>

        {/* 3. RECOMMENDED (Operational Commands) */}
        <div className="bg-[#070A11] border border-emerald-500/20 rounded-xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowRightCircle className="w-4 h-4" />
              </div>
              <span className="font-tech text-sm font-bold uppercase tracking-wider text-emerald-300">
                3. Recommended
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase text-slate-500">Operator Decision</span>
          </div>

          <p className="text-xs font-mono text-slate-300 leading-relaxed min-h-[90px]">
            {analysis.recommended}
          </p>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Action: Flight Director Approval Required</span>
            <span className="text-emerald-400">Actionable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
