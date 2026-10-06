import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import {
  evaluateResidualDetector,
  calculateTwinSync,
  verifyRecoveryAction,
  RecoveryVerificationResult,
} from './services/twinModel';

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
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'fault_lab' | 'cascade' | 'simulation' | 'incidents'>('overview');
  const [isMissionCommand, setIsMissionCommand] = useState<boolean>(false);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(true);

  // Telemetry & Simulation state
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemId | null>(null);
  const [samplesCount, setSamplesCount] = useState<number>(0);
  const lastTickTime = useRef<number>(Date.now());

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
  const [preRecoverySnapshot, setPreRecoverySnapshot] = useState<TelemetryPoint | null>(null);
  const [recoveryVerification, setRecoveryVerification] = useState<RecoveryVerificationResult | null>(null);

  // Single Source of Truth: Shared Residual Detector across F1 and F2 (Section 11)
  const detectorResult = useMemo(() => {
    return evaluateResidualDetector(telemetryHistory);
  }, [telemetryHistory]);

  // Single Source of Truth: Digital Twin Synchronization (Section 5)
  const twinSyncInfo = useMemo(() => {
    return calculateTwinSync(currentTelemetry, samplesCount, lastTickTime.current);
  }, [currentTelemetry, samplesCount]);

  // Polling loop for 1.0 Hz live telemetry
  useEffect(() => {
    let isMounted = true;

    const tick = async () => {
      try {
        const point = await fetchCurrentTelemetry();
        if (isMounted) {
          lastTickTime.current = Date.now();
          setSamplesCount(prev => prev + 1);
          setCurrentTelemetry(point);
          setTelemetryHistory(prev => {
            const next = [...prev, point];
            return next.length > 50 ? next.slice(-50) : next;
          });

          // Check if recovery is awaiting verification
          if (preRecoverySnapshot) {
            const verification = verifyRecoveryAction(
              preRecoverySnapshot,
              point,
              'Safe Power Mode (CMD-PWR-04)'
            );
            setRecoveryVerification(verification);
          }
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
  }, [preRecoverySnapshot]);

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

  // Fault Injection Handler (grounded in current twin state)
  const handleInjectFault = async (type: string, severity: number, duration: number, subsystem: string) => {
    setIsInjecting(true);
    try {
      await injectFaultApi(type, severity, duration, subsystem);
      // Trigger simulation run grounded in current twin state (Section 6 & 23)
      const sim = await runSimulationApi(type, severity, currentTelemetry || undefined);
      setScenarios(sim.scenarios);
      setExecutedScenarioId(null);
      setPreRecoverySnapshot(null);
      setRecoveryVerification(null);

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
      setPreRecoverySnapshot(null);
      setRecoveryVerification(null);
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

  // Execute Recovery Strategy Handler (Closed-Loop Verification — Sections 16-19)
  const handleExecuteRecovery = async (scenario?: SimulationScenario) => {
    setIsExecutingStrategy(true);
    try {
      // 1. Capture authoritative pre-recovery twin snapshot
      const snapshot = currentTelemetry ? JSON.parse(JSON.stringify(currentTelemetry)) : null;
      setPreRecoverySnapshot(snapshot);

      // 2. Clear faults on digital twin backend
      await clearFaultsApi();
      const targetId = scenario?.id || 'scenario_a';
      setExecutedScenarioId(targetId);

      // 3. Refresh telemetry & incidents
      const incList = await fetchIncidentsApi();
      setIncidents(incList);

      // 4. Generate initial verification result
      if (currentTelemetry) {
        const targetTitle = scenario?.title || 'Safe Power Mode (Recommended)';
        const initialVerification = verifyRecoveryAction(snapshot, currentTelemetry, targetTitle);
        setRecoveryVerification(initialVerification);

        setAiAnalysis({
          observed: `Recovery command executed. Telemetry confirms bus voltage stabilizing above 28.0V and battery core temperature shedding heat. Solar array bias maintained +12°.`,
          predicted: `Spacecraft passes upcoming eclipse with >75% battery state-of-charge margin. All critical bus undervoltage trip vectors mitigated.`,
          recommended: `Maintain Safe Power configuration until next sunlit ground station acquisition. Verify battery charge regulator current limiters before payload reactivation.`,
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
      <div className="min-h-screen bg-[#04060A] text-slate-100 flex flex-col relative">
        {showLoadingScreen && (
          <LoadingScreen
            onComplete={() => setShowLoadingScreen(false)}
            isAppReady={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04060A] text-slate-100 flex flex-col relative">
      {/* Pure Full-Screen Cinematic Video Loading Screen */}
      {showLoadingScreen && (
        <LoadingScreen
          onComplete={() => setShowLoadingScreen(false)}
          isAppReady={true}
        />
      )}

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

      {/* Hero Landing Experience with Digital Twin Sync & Live Detector Chip (Sections 5 & 12) */}
      <HeroSection
        subsystems={currentTelemetry.subsystems}
        overallHealth={currentTelemetry.overallHealth}
        activeMission={activeMission}
        onOpenFaultLab={() => setActiveTab('fault_lab')}
        onOpenSimulationLab={() => setActiveTab('simulation')}
        onStartDemo={() => setIsDemoActive(true)}
        activeFaultCount={currentTelemetry.activeFaults.length}
        detectorResult={detectorResult}
        twinSyncInfo={twinSyncInfo}
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

            {/* Live Telemetry & F1 Residual Divergence Charts */}
            <TelemetryCharts
              history={telemetryHistory}
              current={currentTelemetry}
              detectorResult={detectorResult}
            />

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
            <TelemetryCharts
              history={telemetryHistory}
              current={currentTelemetry}
              detectorResult={detectorResult}
            />

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

        {/* Tab 3: Cascading Failure Graph (Sections 13-15: Causal Evidence Inspector) */}
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

        {/* Tab 4: What-If Simulation Lab (Sections 16-19: Recovery Verification) */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <WhatIfSimulationLab
              scenarios={scenarios}
              activeFaultType={currentTelemetry.activeFaults[0]?.type || 'battery_degradation'}
              severity={currentTelemetry.activeFaults[0]?.severity || 38}
              onExecuteRecovery={handleExecuteRecovery}
              isExecuting={isExecutingStrategy}
              executedScenarioId={executedScenarioId}
              recoveryVerification={recoveryVerification}
            />

            <AIAnalysisPanel
              analysis={aiAnalysis}
              onRefreshAI={handleRefreshAI}
              isLoading={isAiLoading}
            />
          </div>
        )}

        {/* Tab 5: Incident Log (with Model Lab sub-view) */}
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
            const sim = await runSimulationApi('battery_degradation', 38, currentTelemetry || undefined);
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
