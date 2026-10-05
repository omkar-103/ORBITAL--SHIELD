import React from 'react';
import { SubsystemMap, SubsystemId, SubsystemStatus } from '../types/spacecraft';
import { Zap, Thermometer, Radio, Activity, Database, ChevronRight } from 'lucide-react';

interface SubsystemPanelProps {
  subsystems: SubsystemMap;
  selectedSubsystem: SubsystemId | null;
  onSelectSubsystem: (id: SubsystemId) => void;
}

export const SubsystemPanel: React.FC<SubsystemPanelProps> = ({
  subsystems,
  selectedSubsystem,
  onSelectSubsystem,
}) => {
  const getStatusBadge = (status: SubsystemStatus) => {
    if (status === 'CRITICAL') {
      return {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-500',
        text: '✖ CRITICAL',
      };
    }
    if (status === 'WARNING') {
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-500',
        text: '▲ DEGRADED',
      };
    }
    return {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      text: '● NOMINAL',
    };
  };

  const cards = [
    {
      id: 'power' as SubsystemId,
      name: 'Power & Energy Storage',
      icon: Zap,
      data: subsystems.power,
      metrics: [
        { label: 'Battery Bus', value: `${subsystems.power.batteryVoltage} V` },
        { label: 'Cell Temp', value: `${subsystems.power.batteryTemp} °C` },
        { label: 'SoC', value: `${subsystems.power.stateOfCharge} %` },
        { label: 'Solar Gen', value: `${subsystems.power.solarGeneration} W` },
      ],
    },
    {
      id: 'thermal' as SubsystemId,
      name: 'Thermal Control Loop',
      icon: Thermometer,
      data: subsystems.thermal,
      metrics: [
        { label: 'Core Cell', value: `${subsystems.thermal.batteryCellTemp} °C` },
        { label: 'Avionics', value: `${subsystems.thermal.avionicsTemp} °C` },
        { label: 'Radiator', value: `${subsystems.thermal.radiatorTemp} °C` },
        { label: 'Flux', value: `${subsystems.thermal.heatPipeFlux} W/m²` },
      ],
    },
    {
      id: 'communication' as SubsystemId,
      name: 'RF Communications',
      icon: Radio,
      data: subsystems.communication,
      metrics: [
        { label: 'SNR', value: `${subsystems.communication.snr} dB` },
        { label: 'Margin', value: `${subsystems.communication.linkMargin} dB` },
        { label: 'Loss', value: `${subsystems.communication.packetLoss} %` },
        { label: 'Downlink', value: `${subsystems.communication.downlinkBandwidth} Mbps` },
      ],
    },
    {
      id: 'aocs' as SubsystemId,
      name: 'AOCS & Guidance',
      icon: Activity,
      data: subsystems.aocs,
      metrics: [
        { label: 'Wheels', value: `${subsystems.aocs.reactionWheelRpm} RPM` },
        { label: 'Attitude Err', value: `${subsystems.aocs.attitudeError}"` },
        { label: 'Star Tracker', value: `${subsystems.aocs.starTrackerFidelity} %` },
        { label: 'Gyro Drift', value: `${subsystems.aocs.gyroDrift} °/hr` },
      ],
    },
    {
      id: 'payload' as SubsystemId,
      name: 'Scientific Imager',
      icon: Database,
      data: subsystems.payload,
      metrics: [
        { label: 'Throughput', value: `${subsystems.payload.sensorThroughput} MB/s` },
        { label: 'Buffer', value: `${subsystems.payload.bufferFill} %` },
        { label: 'Detector', value: `${subsystems.payload.detectorCalibration} %` },
        { label: 'Duty Cycle', value: '100 %' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map(card => {
        const isSelected = selectedSubsystem === card.id;
        const statusMeta = getStatusBadge(card.data.status);
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            onClick={() => onSelectSubsystem(card.id)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              isSelected
                ? 'bg-cyan-500/15 border-cyan-500 shadow-md shadow-cyan-500/10'
                : 'bg-[#0B0F19] border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-tech text-xs font-semibold uppercase">{card.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-tech font-bold text-white tabular-nums">
                    {card.data.healthScore}%
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${statusMeta.badge}`}>
                  {statusMeta.text}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              {card.metrics.map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-slate-500">{m.label}:</span>
                  <span className="text-slate-200 tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
