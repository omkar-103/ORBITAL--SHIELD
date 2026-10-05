import React, { useState } from 'react';
import { IncidentEvent } from '../types/spacecraft';
import { History, Search, Cpu } from 'lucide-react';
import { ModelLabView } from './ModelLabView';

interface IncidentHistoryViewProps {
  incidents: IncidentEvent[];
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({ incidents }) => {
  const [subView, setSubView] = useState<'incidents' | 'model_lab'>('incidents');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = incidents.filter(inc => {
    const matchesSev = filterSeverity === 'ALL' || inc.severity === filterSeverity;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSev && matchesSearch;
  });

  const getSeverityBadge = (sev: 'CRITICAL' | 'WARNING' | 'INFO') => {
    if (sev === 'CRITICAL') return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (sev === 'WARNING') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Sub-View Navigation Pill Switcher */}
      <div className="flex items-center gap-2 p-1 bg-[#0B0F19] border border-white/10 rounded-xl w-fit">
        <button
          onClick={() => setSubView('incidents')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
            subView === 'incidents'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Incident Audit Trail ({incidents.length})</span>
        </button>
        <button
          onClick={() => setSubView('model_lab')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
            subView === 'model_lab'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Model Lab (Offline ML Benchmark)</span>
        </button>
      </div>

      {/* View 1: Incident Log */}
      {subView === 'incidents' ? (
        <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Mission Operations Log
              </span>
              <h2 className="font-tech text-xl font-bold uppercase text-white mt-0.5">
                Real-Time Incident & Anomaly Archive
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Immutable chronological telemetry event audit trail with subsystem classification.
              </p>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-[#070A11] text-xs font-mono text-white pl-8 pr-3 py-1.5 rounded-lg border border-white/10 outline-none focus:border-cyan-500 placeholder:text-slate-600 w-44"
                />
              </div>

              {/* Severity Filters */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      filterSeverity === sev ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident List */}
          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                No incident events matching current filter criteria.
              </div>
            ) : (
              filtered.map(inc => (
                <div
                  key={inc.id}
                  className="p-3.5 rounded-xl bg-[#070A11] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded border uppercase text-[10px] font-semibold ${getSeverityBadge(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className="font-tech text-sm font-semibold text-white uppercase">{inc.title}</span>
                      <span className="text-slate-500 text-[10px] uppercase">[{inc.subsystem}]</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{inc.details}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                    <span className="text-cyan-400 font-bold tabular-nums">{inc.missionTimeStr}</span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(inc.timestamp).toLocaleTimeString()} UTC
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* View 2: Model Lab */
        <ModelLabView />
      )}
    </div>
  );
};
