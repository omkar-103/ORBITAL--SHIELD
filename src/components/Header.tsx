import React from 'react';
import { Shield, Play, Terminal, Orbit, Clock } from 'lucide-react';
import { MissionProfile } from '../types/spacecraft';

interface HeaderProps {
  activeTab: 'overview' | 'fault_lab' | 'cascade' | 'simulation' | 'incidents';
  setActiveTab: (tab: 'overview' | 'fault_lab' | 'cascade' | 'simulation' | 'incidents') => void;
  isMissionCommand: boolean;
  setIsMissionCommand: (val: boolean) => void;
  onStartDemo: () => void;
  activeMission: MissionProfile;
  missions: MissionProfile[];
  onSelectMission: (mission: MissionProfile) => void;
  missionTime: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMissionCommand,
  setIsMissionCommand,
  onStartDemo,
  activeMission,
  missions,
  onSelectMission,
  missionTime,
}) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `T+${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#05070B]/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Single text element with clean styling) */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={e => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="flex items-center gap-2 text-lg font-tech font-bold tracking-wider text-white uppercase hover:text-cyan-300 transition-colors shrink-0"
          >
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>ORBITAL-SHIELD</span>
          </a>

          {/* Mission Indicator Tag */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
            <select
              value={activeMission.id}
              onChange={e => {
                const found = missions.find(m => m.id === e.target.value);
                if (found) onSelectMission(found);
              }}
              className="bg-[#0B0F19] text-xs font-mono text-cyan-300 border border-white/10 rounded px-2 py-1 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {missions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} · {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Text with active underlines) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-slate-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`transition-colors py-1 relative ${
              activeTab === 'overview' ? 'text-cyan-300 font-semibold' : 'hover:text-white'
            }`}
          >
            Digital Twin
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('fault_lab')}
            className={`transition-colors py-1 relative ${
              activeTab === 'fault_lab' ? 'text-cyan-300 font-semibold' : 'hover:text-white'
            }`}
          >
            Fault Lab
            {activeTab === 'fault_lab' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('cascade')}
            className={`transition-colors py-1 relative ${
              activeTab === 'cascade' ? 'text-cyan-300 font-semibold' : 'hover:text-white'
            }`}
          >
            Cascade Graph
            {activeTab === 'cascade' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className={`transition-colors py-1 relative ${
              activeTab === 'simulation' ? 'text-cyan-300 font-semibold' : 'hover:text-white'
            }`}
          >
            What-If Lab
            {activeTab === 'simulation' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`transition-colors py-1 relative ${
              activeTab === 'incidents' ? 'text-cyan-300 font-semibold' : 'hover:text-white'
            }`}
          >
            Incident Log
            {activeTab === 'incidents' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Mission Command & Demo Mode) */}
        <div className="flex items-center gap-2.5">
          {/* Mission Elapsed Time */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="tabular-nums">{formatTime(missionTime)}</span>
          </div>

          {/* Demo Scenario Button */}
          <button
            onClick={onStartDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all whitespace-nowrap active:scale-95"
            title="Start automated 7-step guided demo scenario"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-300" />
            <span>Demo Scenario</span>
          </button>

          {/* Mission Command Mode Toggle */}
          <button
            onClick={() => setIsMissionCommand(!isMissionCommand)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap active:scale-95 ${
              isMissionCommand
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
            }`}
            title="Toggle Focused Mission Command Cockpit"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mission Command</span>
          </button>
        </div>
      </div>
    </header>
  );
};
