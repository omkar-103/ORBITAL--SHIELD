import React, { useState, useEffect, useRef } from 'react';
import { Shield, FastForward, Play, CheckCircle2, Cpu, Radio, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const CLOUDINARY_VIDEO_URL =
  'https://res.cloudinary.com/dr59elrhw/video/upload/v1791275144/kamtw4fjoz0gpgi4mgiv.mp4';
const LOCAL_VIDEO_URL = '/loading-screen/video-refersh.mp4';

const BOOT_STEPS = [
  'INITIALIZING THREE.JS DIGITAL TWIN MATRIX',
  'SYNCHRONIZING PROGRAMME ERIZON HIGH-POLY GEOMETRY',
  'CALCULATING SUN-SYNCHRONOUS 540KM ORBITAL VECTORS',
  'ESTABLISHING SUPABASE TELEMETRY RESIDUAL STREAM',
  'LOADING NASA PCoE LITHIUM-ION IMPEDANCE MODELS',
  'ENGAGING GEMINI 3.8 FLASH GROUNDED REASONING',
  'ALL SUBSYSTEM SYSTEMS NOMINAL · READY FOR OPS',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fast, smooth loading progress bar
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4s fast boot sequence

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      const nextStep = Math.min(
        BOOT_STEPS.length - 1,
        Math.floor((elapsed / duration) * BOOT_STEPS.length)
      );
      setStepIndex(nextStep);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => handleFinish(), 350);
      }
    }, 35);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-[#040609] transition-opacity duration-700 ease-out select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Video Layer with Fast Cloudinary CDN + Local Fallback */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-90' : 'opacity-40'
          }`}
        >
          <source src={CLOUDINARY_VIDEO_URL} type="video/mp4" />
          <source src={LOCAL_VIDEO_URL} type="video/mp4" />
        </video>

        {/* Ambient aerospace gradient vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040609] via-[#040609]/40 to-[#040609]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.12)_0%,rgba(4,6,9,0.7)_80%)]" />

        {/* High-tech scanline texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
            backgroundSize: '100% 3px, 6px 100%',
          }}
        />
      </div>

      {/* Top HUD Bar */}
      <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tech text-base font-bold text-white tracking-widest uppercase">
                ORBITAL-SHIELD
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PROD · 2026.4
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Autonomous Spacecraft Digital Twin & Contingency Simulator
            </p>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleFinish}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-slate-950 text-white font-mono text-xs uppercase tracking-wider border border-white/20 hover:border-cyan-400 transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <span>Enter Mission Control</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Holographic Aerospace Emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-6">
          {/* Animated concentric radar rings */}
          <div className="w-32 h-32 rounded-full border border-cyan-500/20 animate-ping absolute inset-0" />
          <div className="w-32 h-32 rounded-full border border-cyan-400/30 animate-spin absolute inset-0 [animation-duration:8s]" />
          <div className="w-32 h-32 rounded-full border-t-2 border-cyan-400 animate-spin absolute inset-0 [animation-duration:2s]" />

          <div className="w-32 h-32 rounded-full bg-[#050B14]/80 border border-cyan-500/50 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] backdrop-blur-xl">
            <span className="font-tech text-3xl font-extrabold text-white tracking-tighter tabular-nums">
              {progress}%
            </span>
            <span className="text-[9px] font-mono uppercase text-cyan-300 tracking-widest mt-0.5">
              SYNCING
            </span>
          </div>
        </div>

        <h2 className="font-tech text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
          System Initializing
        </h2>
        <p className="text-xs sm:text-sm font-mono text-cyan-300/80 mt-1 max-w-md tracking-wider">
          Connecting to Flight Dynamics Engine & 3D Telemetry Matrix
        </p>
      </div>

      {/* Bottom Progress & Diagnostic Console */}
      <div className="relative z-10 p-6 sm:p-8 max-w-2xl w-full mx-auto space-y-4">
        {/* Terminal Boot Log */}
        <div className="bg-[#050B14]/90 border border-white/10 rounded-xl p-3.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-300 font-semibold uppercase">Flight Ops Boot Stream</span>
            </div>
            <span className="text-slate-500 tabular-nums">CHANNEL: 01 // LEO-PRIMARY</span>
          </div>

          <div className="pt-2 text-xs font-mono text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyan-400">›</span>
              <span className="truncate">{BOOT_STEPS[stepIndex]}</span>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
          </div>
        </div>

        {/* High-Tech Glowing Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-slate-900/90 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>MEM: 512 MB // WEBGPU ACTIVE</span>
            <span>CLOUDINARY FAST PIPELINE</span>
            <span className="text-cyan-400 tabular-nums">{progress}.0% COMPLETE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
