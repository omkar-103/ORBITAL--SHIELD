import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, X, CheckCircle, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SubsystemMap } from '../types/spacecraft';

interface DemoScenarioControllerProps {
  onClose: () => void;
  onInjectBatteryFault: () => Promise<void>;
  onTriggerAI: () => Promise<void>;
  onTriggerSimulation: () => Promise<void>;
  onExecuteRecovery: () => Promise<void>;
  onResetNominal: () => Promise<void>;
  subsystems: SubsystemMap;
}

export const DemoScenarioController: React.FC<DemoScenarioControllerProps> = ({
  onClose,
  onInjectBatteryFault,
  onTriggerAI,
  onTriggerSimulation,
  onExecuteRecovery,
  onResetNominal,
  subsystems,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const demoSteps = [
    {
      step: 1,
      title: 'Nominal Mission Cruise',
      subsystem: 'ALL',
      narration: 'Spacecraft OS-001 in Sun-Synchronous LEO. All subsystems (Power, Thermal, RF Comm, AOCS, Payload) operate within baseline tolerances.',
      actionLabel: 'Inject Battery Degradation',
      action: async () => {
        await onInjectBatteryFault();
      },
    },
    {
      step: 2,
      title: 'Subsystem Fault Injected',
      subsystem: 'POWER',
      narration: 'Operator triggers 38% battery cell impedance degradation. Digital twin mirrors physical internal resistance shift.',
      actionLabel: 'Observe Telemetry Divergence',
      action: async () => {},
    },
    {
      step: 3,
      title: 'Telemetry Divergence & Anomaly Alert',
      subsystem: 'POWER / THERMAL',
      narration: `Battery core temperature climbs (+${(subsystems.power.batteryTemp - 28).toFixed(1)}°C) and bus voltage sags to ${subsystems.power.batteryVoltage}V under mission load.`,
      actionLabel: 'Analyze Cascading Dynamics',
      action: async () => {},
    },
    {
      step: 4,
      title: 'Cascading Propagation Visualized',
      subsystem: 'CROSS-SUBSYSTEM',
      narration: 'Failure cascades along physical dependencies: Battery sag depresses Power Bus, elevating heat generation and constraining X-band downlink amplifiers.',
      actionLabel: 'Generate Grounded AI Explanation',
      action: async () => {
        await onTriggerAI();
      },
    },
    {
      step: 5,
      title: 'Evidence-Grounded AI Analysis',
      subsystem: 'SAFETY AI',
      narration: 'AI engine synthesizes telemetry into strictly separated OBSERVED facts, PREDICTED physical consequences, and RECOMMENDED actions without hallucination.',
      actionLabel: 'Run Multi-Scenario What-If',
      action: async () => {
        await onTriggerSimulation();
      },
    },
    {
      step: 6,
      title: 'What-If Simulation Comparison',
      subsystem: 'SIMULATION LAB',
      narration: 'Evaluating 4 parallel 90-minute operational branches. Baseline shows 42% survival risk; Safe Power Mode projects 98% survival probability.',
      actionLabel: 'Execute Safe Power Mode',
      action: async () => {
        await onExecuteRecovery();
      },
    },
    {
      step: 7,
      title: 'Recovery Strategy Applied & Stabilized',
      subsystem: 'MISSION RESILIENCE',
      narration: 'Payload transitioned to thermal standby, array sun-angle adjusted +12°. Battery reserve protected, spacecraft stabilized at nominal survival index.',
      actionLabel: 'Complete Demonstration',
      action: async () => {},
    },
  ];

  const activeStepMeta = demoSteps.find(s => s.step === currentStep) || demoSteps[0];

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(async () => {
      if (currentStep < demoSteps.length) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        await demoSteps[nextStep - 1].action();
      } else {
        setIsPlaying(false);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const handleNext = async () => {
    if (currentStep < demoSteps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await demoSteps[nextStep - 1].action();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    setCurrentStep(1);
    await onResetNominal();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] bg-[#0B0F19]/95 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-tech text-xs tracking-wider uppercase font-bold text-white">
            Demo Scenario Walkthrough
          </span>
          <span className="text-xs font-mono text-cyan-300">
            [{currentStep}/{demoSteps.length}]
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-1.5 py-3">
        {demoSteps.map(s => (
          <button
            key={s.step}
            onClick={async () => {
              setCurrentStep(s.step);
              await s.action();
            }}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              s.step === currentStep
                ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                : s.step < currentStep
                ? 'bg-emerald-400'
                : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Narration Content */}
      <div className="space-y-2 py-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-400 font-semibold uppercase">{activeStepMeta.title}</span>
          <span className="text-slate-500 text-[10px]">{activeStepMeta.subsystem}</span>
        </div>
        <p className="text-xs font-mono text-slate-300 leading-relaxed min-h-[54px]">
          {activeStepMeta.narration}
        </p>
      </div>

      {/* Controls Bar */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg text-xs font-mono transition-colors flex items-center gap-1 ${
              isPlaying ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            title={isPlaying ? 'Pause auto-advance' : 'Auto-advance demo sequence'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[10px]">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentStep === demoSteps.length}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-semibold rounded-lg transition-all shadow-md active:scale-95"
        >
          <span>{currentStep === demoSteps.length ? 'Finished' : activeStepMeta.actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
