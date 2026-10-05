import React, { useState, useEffect, useRef } from 'react';
import {
  fetchCurrentTelemetry,
  injectFaultApi,
  clearFaultsApi,
  runSimulationApi,
  requestAIAnalysisApi,
  fetchIncidentsApi,
  fetchMissionsApi,
  selectMissionApi,
} from './services/api';
import {
  TelemetryPoint,
  SubsystemId,
  SimulationScenario,
  IncidentEvent,
  MissionProfile,
  AIAnalysisResult,
  ActiveFault,
} from './types/spacecraft';

// Components
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { SpacecraftViewer3D } from './components/SpacecraftViewer3D';
import { SubsystemPanel } from './components/SubsystemPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { FaultInjectionCenter } from './components/FaultInjectionCenter';
import { CascadingFailureGraph } from './components/CascadingFailureGraph';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { WhatIfSimulationLab } from './components/WhatIfSimulationLab';
import { IncidentHistoryView } from './components/IncidentHistoryView';
import { MissionCommandMode } from './components/MissionCommandMode';
import { DemoScenarioController } from './components/DemoScenarioController';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'fault_lab' | 'cascade' | 'simulation' | 'incidents'>('overview');
  const [isMissionCommand, setIsMissionCommand] = useState<boolean>(false);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);

  // Telemetry & Simulation state
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemId | null>(null);

  // Scenarios, AI & Incidents
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult>({
    observed: 'All telemetry channels streaming within nominal operational envelope.',
    predicted: 'Orbital power budget balanced. No critical failure vectors detected over 90-minute window.',
    recommended: 'Continue scheduled optical payload operations during current sunlit pass.',
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
  const [incidents, setIncidents] = useState<IncidentEvent[]>([]);
  const [missions, setMissions] = useState<MissionProfile[]>([]);
  const [activeMission, setActiveMission] = useState<MissionProfile>({
    id: 'OS-001',
    name: 'Sentinel LEO Observation',
    orbit: 'Sun-Synchronous 540km (92 min period)',
    inclination: '97.4°',
    launchDate: '2025-11-14',
    spacecraft: 'AeroSat-Twin Mk IV',
    target: 'Global Environmental & Multispectral Remote Sensing',
  });

  // Action states
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isExecutingStrategy, setIsExecutingStrategy] = useState<boolean>(false);
  const [executedScenarioId, setExecutedScenarioId] = useState<string | null>(null);

  // Polling loop for 1.0 Hz live telemetry
  useEffect(() => {
    let isMounted = true;

    const tick = async () => {
      try {
        const point = await fetchCurrentTelemetry();
        if (isMounted) {
          setCurrentTelemetry(point);
          setTelemetryHistory(prev => {
            const next = [...prev, point];
            return next.length > 50 ? next.slice(-50) : next;
          });
        }
      } catch (err) {
        console.error('Telemetry tick error:', err);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Initial load of missions, incidents, simulations
  useEffect(() => {
    async function initData() {
      try {
        const [missionData, incidentList, simData] = await Promise.all([
          fetchMissionsApi(),
          fetchIncidentsApi(),
          runSimulationApi('battery_degradation', 38),
        ]);

        if (missionData.missions.length > 0) {
          setMissions(missionData.missions);
          const current = missionData.missions.find(m => m.id === missionData.activeMissionId);
          if (current) setActiveMission(current);
        }

        setIncidents(incidentList);
        setScenarios(simData.scenarios);
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    }

    initData();
  }, []);

  // Fault Injection Handler
  const handleInjectFault = async (type: string, severity: number, duration: number, subsystem: string) => {
    setIsInjecting(true);
    try {
      await injectFaultApi(type, severity, duration, subsystem);
      // Trigger simulation run with updated severity
      const sim = await runSimulationApi(type, severity);
      setScenarios(sim.scenarios);
      setExecutedScenarioId(null);

      // Refresh incident list
      const incList = await fetchIncidentsApi();
      setIncidents(incList);

      // Re-trigger AI analysis
      if (currentTelemetry) {
        setIsAiLoading(true);
        const aiResult = await requestAIAnalysisApi(currentTelemetry, {
          id: 'new',
          type: type as ActiveFault['type'],
          subsystem: subsystem as ActiveFault['subsystem'],
          severity,
          startTime: currentTelemetry.missionTime,
          duration,
        });
        setAiAnalysis(aiResult);
        setIsAiLoading(false);
      }
    } catch (err) {
      console.error('Failed to inject fault:', err);
    } finally {
      setIsInjecting(false);
    }
  };

  // Reset Faults Handler
  const handleClearFaults = async () => {
    try {
      await clearFaultsApi();
      setExecutedScenarioId(null);
      const incList = await fetchIncidentsApi();
      setIncidents(incList);

      if (currentTelemetry) {
        const aiResult = await requestAIAnalysisApi(currentTelemetry);
        setAiAnalysis(aiResult);
      }
    } catch (err) {
      console.error('Failed to clear faults:', err);
    }
  };

  // AI Refresh Handler
  const handleRefreshAI = async () => {
    if (!currentTelemetry) return;
    setIsAiLoading(true);
    try {
      const activeFault = currentTelemetry.activeFaults[0];
      const result = await requestAIAnalysisApi(currentTelemetry, activeFault, selectedSubsystem || undefined);
      setAiAnalysis(result);
    } catch (err) {
      console.error('AI refresh error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Execute Recovery Strategy Handler
  const handleExecuteRecovery = async (scenario?: SimulationScenario) => {
    setIsExecutingStrategy(true);
    try {
      // Clear faults to stabilize spacecraft state
      await clearFaultsApi();
      const targetId = scenario?.id || 'scenario_a';
      setExecutedScenarioId(targetId);

      // Refresh telemetry & incidents
      const incList = await fetchIncidentsApi();
      setIncidents(incList);

      // Generate post-recovery AI explanation
      if (currentTelemetry) {
        setAiAnalysis({
          observed: `Safe Power Mode transition executed. Payload rail throttled from 340W to 125W. Solar array drive adjusted +12°. Bus voltage stabilized at 28.4V with battery core temperature settling to 24.8°C.`,
          predicted: `Spacecraft will transit upcoming eclipse with 82% battery reserve intact. Critical undervoltage trip risk mitigated to 0.0%.`,
          recommended: `Maintain Safe Power standby until next sunlit Svalbard ground station contact. Resume selective duty-cycled multispectral imaging post-pass.`,
          model: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error executing recovery:', err);
    } finally {
      setIsExecutingStrategy(false);
    }
  };

  if (!currentTelemetry) {
    return (
      <div className="min-h-screen bg-[#05070B] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div className="font-tech text-sm tracking-widest text-cyan-300 uppercase">
          Initializing ORBITAL-SHIELD Telemetry Feed...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070B] text-slate-100 flex flex-col">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMissionCommand={isMissionCommand}
        setIsMissionCommand={setIsMissionCommand}
        onStartDemo={() => setIsDemoActive(true)}
        activeMission={activeMission}
        missions={missions}
        onSelectMission={async m => {
          setActiveMission(m);
          await selectMissionApi(m.id);
          const incList = await fetchIncidentsApi();
          setIncidents(incList);
        }}
        missionTime={currentTelemetry.missionTime}
      />

      {/* Hero Landing Experience (Part 1 & 3) */}
      <HeroSection
        subsystems={currentTelemetry.subsystems}
        overallHealth={currentTelemetry.overallHealth}
        activeMission={activeMission}
        onOpenFaultLab={() => setActiveTab('fault_lab')}
        onOpenSimulationLab={() => setActiveTab('simulation')}
        onStartDemo={() => setIsDemoActive(true)}
        activeFaultCount={currentTelemetry.activeFaults.length}
      />

      {/* Main Workspace Content based on Active Tab */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Subsystem Metric Strip (Always visible for quick inspection) */}
        <SubsystemPanel
          subsystems={currentTelemetry.subsystems}
          selectedSubsystem={selectedSubsystem}
          onSelectSubsystem={id => setSelectedSubsystem(prev => (prev === id ? null : id))}
        />

        {/* Tab 1: Overview & Digital Twin */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 3D Digital Twin Viewer */}
            <SpacecraftViewer3D
              subsystems={currentTelemetry.subsystems}
              selectedSubsystem={selectedSubsystem}
              onSelectSubsystem={setSelectedSubsystem}
              inEclipse={currentTelemetry.inEclipse}
              orbitProgress={currentTelemetry.orbitProgress}
            />

            {/* Live Telemetry Time-Series Charts */}
            <TelemetryCharts history={telemetryHistory} current={currentTelemetry} />

            {/* Evidence-Grounded AI Analysis */}
            <AIAnalysisPanel
              analysis={aiAnalysis}
              onRefreshAI={handleRefreshAI}
              isLoading={isAiLoading}
            />
          </div>
        )}

        {/* Tab 2: Fault Lab */}
        {activeTab === 'fault_lab' && (
          <div className="space-y-6">
            <FaultInjectionCenter
              activeFaults={currentTelemetry.activeFaults}
              onInjectFault={handleInjectFault}
              onClearFaults={handleClearFaults}
              isInjecting={isInjecting}
            />

            {/* Telemetry charts showing active impact */}
            <TelemetryCharts history={telemetryHistory} current={currentTelemetry} />

            {/* 3D Model with fault highlights */}
            <SpacecraftViewer3D
              subsystems={currentTelemetry.subsystems}
              selectedSubsystem={selectedSubsystem}
              onSelectSubsystem={setSelectedSubsystem}
              inEclipse={currentTelemetry.inEclipse}
              orbitProgress={currentTelemetry.orbitProgress}
            />
          </div>
        )}

        {/* Tab 3: Cascading Failure Graph */}
        {activeTab === 'cascade' && (
          <div className="space-y-6">
            <CascadingFailureGraph
              subsystems={currentTelemetry.subsystems}
              activeFaults={currentTelemetry.activeFaults}
            />

            <AIAnalysisPanel
              analysis={aiAnalysis}
              onRefreshAI={handleRefreshAI}
              isLoading={isAiLoading}
            />
          </div>
        )}

        {/* Tab 4: What-If Simulation Lab */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <WhatIfSimulationLab
              scenarios={scenarios}
              activeFaultType={currentTelemetry.activeFaults[0]?.type || 'battery_degradation'}
              severity={currentTelemetry.activeFaults[0]?.severity || 38}
              onExecuteRecovery={handleExecuteRecovery}
              isExecuting={isExecutingStrategy}
              executedScenarioId={executedScenarioId}
            />

            <AIAnalysisPanel
              analysis={aiAnalysis}
              onRefreshAI={handleRefreshAI}
              isLoading={isAiLoading}
            />
          </div>
        )}

        {/* Tab 5: Incident Log */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <IncidentHistoryView incidents={incidents} />
          </div>
        )}
      </main>

      {/* Fullscreen Mission Command Cockpit Modal (Part 25) */}
      {isMissionCommand && (
        <MissionCommandMode
          onExit={() => setIsMissionCommand(false)}
          subsystems={currentTelemetry.subsystems}
          selectedSubsystem={selectedSubsystem}
          onSelectSubsystem={setSelectedSubsystem}
          inEclipse={currentTelemetry.inEclipse}
          orbitProgress={currentTelemetry.orbitProgress}
          overallHealth={currentTelemetry.overallHealth}
          activeFaults={currentTelemetry.activeFaults}
          onExecuteSafePower={() => handleExecuteRecovery()}
          isExecuting={isExecutingStrategy}
          executedScenarioId={executedScenarioId}
        />
      )}

      {/* Automated Demo Scenario Guided Controller (Part 26) */}
      {isDemoActive && (
        <DemoScenarioController
          onClose={() => setIsDemoActive(false)}
          onInjectBatteryFault={() => handleInjectFault('battery_degradation', 38, 60, 'power')}
          onTriggerAI={handleRefreshAI}
          onTriggerSimulation={async () => {
            const sim = await runSimulationApi('battery_degradation', 38);
            setScenarios(sim.scenarios);
          }}
          onExecuteRecovery={() => handleExecuteRecovery()}
          onResetNominal={handleClearFaults}
          subsystems={currentTelemetry.subsystems}
        />
      )}

      {/* Quiet Footer */}
      <footer className="mt-12 border-t border-white/10 bg-[#040609] py-6 px-4 lg:px-8 text-xs font-mono text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-tech font-bold text-slate-400 uppercase tracking-wider">ORBITAL-SHIELD</span>
            <span>·</span>
            <span>Autonomous Mission Resilience Platform</span>
          </div>
          <div>ST-09 Mission Digital Twin for Predictive Fault Simulation</div>
        </div>
      </footer>
    </div>
  );
}
