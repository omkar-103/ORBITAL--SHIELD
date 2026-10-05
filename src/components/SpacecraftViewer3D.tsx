import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SubsystemMap, SubsystemId } from '../types/spacecraft';
import { Layers, RotateCcw, ZoomIn, ZoomOut, Cpu, ExternalLink, AlertTriangle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpacecraftViewer3DProps {
  subsystems: SubsystemMap;
  selectedSubsystem: SubsystemId | null;
  onSelectSubsystem: (subsystem: SubsystemId | null) => void;
  inEclipse: boolean;
  orbitProgress: number;
}

/** Sketchfab Viewer API injected by the iframe */
declare global {
  interface Window {
    SketchfabAPIToken?: string;
  }
}

// Sketchfab Viewer API type (minimal surface we use)
interface SketchfabAPI {
  addEventListener: (event: string, cb: (...args: unknown[]) => void) => void;
  removeEventListener: (event: string, cb: (...args: unknown[]) => void) => void;
  start: () => void;
  stop: () => void;
  getNodeMap: (cb: (err: unknown, nodes: Record<string, SketchfabNode>) => void) => void;
  setMaterial: (material: unknown, cb: () => void) => void;
  getMaterialList: (cb: (err: unknown, materials: SketchfabMaterial[]) => void) => void;
  setCameraLookAt: (position: number[], target: number[], duration: number, cb?: () => void) => void;
  setCameraLookAtEndAnimationCallback: (cb: () => void) => void;
  recenterCamera: (cb?: () => void) => void;
  getSceneGraph: (cb: (err: unknown, result: { children: SketchfabNode[] }) => void) => void;
  setBackground: (opts: { color: number[] } | { uid: string }, cb?: () => void) => void;
  getTextureList: (cb: (err: unknown, textures: unknown[]) => void) => void;
}

interface SketchfabNode {
  instanceID: number;
  name: string;
  type: string;
  children?: SketchfabNode[];
  materialID?: number;
}

interface SketchfabMaterial {
  id: string;
  name: string;
  channels: Record<string, { enable: boolean; factor?: number; color?: number[] }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_UID = '1dfbae39ee674334848da02301b77d68';

/**
 * Subsystem color map — matches existing ORBITAL-SHIELD status palette
 * NOMINAL: #10B981 | WARNING: #F59E0B | CRITICAL: #EF4444 | SELECTED: #06B6D4
 */
const STATUS_EMISSIVE: Record<string, [number, number, number]> = {
  NOMINAL: [0.065, 0.725, 0.506],   // #10B981
  WARNING: [0.961, 0.62, 0.043],    // #F59E0B
  CRITICAL: [0.937, 0.267, 0.267],  // #EF4444
  SELECTED: [0.024, 0.714, 0.831],  // #06B6D4
};

/**
 * Camera presets for each subsystem focus — tuned for Programme ERIZON geometry.
 * Format: [eye_x, eye_y, eye_z], [target_x, target_y, target_z], duration_ms
 */
const SUBSYSTEM_CAMERA: Record<SubsystemId | 'default', { eye: number[]; target: number[]; duration: number }> = {
  default:        { eye: [0, 10, 30],    target: [0, 0, 0],     duration: 1500 },
  power:          { eye: [30, 5, 10],    target: [0, 0, 0],     duration: 1200 },
  thermal:        { eye: [0, 15, -25],   target: [0, 0, -5],    duration: 1200 },
  communication:  { eye: [5, 20, 15],    target: [0, 5, 0],     duration: 1200 },
  aocs:           { eye: [15, 8, 20],    target: [0, 0, 0],     duration: 1200 },
  payload:        { eye: [0, -20, 15],   target: [0, -5, 0],    duration: 1200 },
};

/**
 * Name-fragment → SubsystemId mapping for mesh click detection.
 * When Programme ERIZON's node names are resolved, we map them here.
 * These patterns are matched case-insensitively against node names.
 */
const MESH_TO_SUBSYSTEM: Array<{ pattern: RegExp; subsystem: SubsystemId }> = [
  { pattern: /solar|panel|wing|cell|array|photovolt|pv/i,          subsystem: 'power' },
  { pattern: /battery|power|bus|eps|pcdu/i,                         subsystem: 'power' },
  { pattern: /radiator|thermal|heat|pipe|mlí|mli|foil|blanket/i,   subsystem: 'thermal' },
  { pattern: /antenna|dish|comm|rf|tx|rx|transponder|hga|lga/i,    subsystem: 'communication' },
  { pattern: /aocs|rcs|thruster|wheel|gyro|star|tracker|imu|str/i, subsystem: 'aocs' },
  { pattern: /payload|sensor|camera|optic|instrument|aperture|lens/i, subsystem: 'payload' },
  // Generic / body fallbacks
  { pattern: /body|bus|structure|frame|core/i,                      subsystem: 'aocs' },
  { pattern: /engine|nozzle|nuclear|reactor|exhaust/i,              subsystem: 'power' },
];

// ─── Orbital Environment (Three.js — background layer) ────────────────────────

/**
 * Renders the starfield, Earth, atmospheric limb, and orbital ring
 * as a lightweight Three.js scene overlaid behind the Sketchfab iframe.
 * The spacecraft itself comes from Sketchfab; this provides the space environment.
 */
function useOrbitalEnvironment(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  inEclipse: boolean,
  orbitProgress: number,
  active: boolean,
) {
  const envStateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    sun: THREE.DirectionalLight;
    dot: THREE.Mesh;
    render: () => void;
  } | null>(null);

  // Initialize environment scene and geometries once (cached, on-demand render, no idle loop)
  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.018);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 2, 10);

    // Starfield (cached buffer geometry)
    const starsCount = 500;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starPositions[i]     = (Math.random() - 0.5) * 120;
      starPositions[i + 1] = (Math.random() - 0.5) * 120;
      starPositions[i + 2] = (Math.random() - 0.5) * 120;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.14, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Earth
    const earthGeo = new THREE.SphereGeometry(16, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0f2744, roughness: 0.8, metalness: 0.1,
      emissive: 0x051329, emissiveIntensity: 0.25,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, -20, -14);
    scene.add(earth);

    // Atmosphere limb
    const atmGeo = new THREE.RingGeometry(16, 16.7, 64);
    const atmMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.22 });
    const atm = new THREE.Mesh(atmGeo, atmMat);
    atm.position.set(0, -20, -13.9);
    scene.add(atm);

    // Orbital ring
    const orbitGeo = new THREE.RingGeometry(10.8, 11.0, 96);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.1 });
    const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    scene.add(orbitRing);

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a243b, 1.2));
    const sun = new THREE.DirectionalLight(0xfffbeb, inEclipse ? 0.15 : 2.5);
    sun.position.set(10, 8, 6);
    scene.add(sun);
    const albedo = new THREE.DirectionalLight(0x0ea5e9, 0.6);
    albedo.position.set(0, -6, -4);
    scene.add(albedo);

    // Orbital progress marker — faint glowing dot
    const dotGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(dot);

    const render = () => {
      renderer.render(scene, camera);
    };

    envStateRef.current = { renderer, scene, camera, sun, dot, render };

    // Initial on-demand render
    render();

    const onResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      render();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      envStateRef.current = null;
      starGeo.dispose(); starMat.dispose();
      earthGeo.dispose(); earthMat.dispose();
      atmGeo.dispose(); atmMat.dispose();
      orbitGeo.dispose(); orbitMat.dispose();
      dotGeo.dispose(); dotMat.dispose();
      renderer.dispose();
    };
  }, [active, canvasRef]);

  // Update orbit marker and sun lighting on-demand when telemetry values change (no continuous loop)
  useEffect(() => {
    const env = envStateRef.current;
    if (!env) return;

    const angle = orbitProgress * Math.PI * 2;
    env.dot.position.set(Math.cos(angle) * 10.9, Math.sin(angle) * 4, 0);
    env.sun.intensity = inEclipse ? 0.15 : 2.5;
    env.render();
  }, [inEclipse, orbitProgress]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SpacecraftViewer3D: React.FC<SpacecraftViewer3DProps> = ({
  subsystems,
  selectedSubsystem,
  onSelectSubsystem,
  inEclipse,
  orbitProgress,
}) => {
  const [viewMode, setViewMode] = useState<'3D' | '2D_SCHEMATIC'>('3D');
  const [isRotating, setIsRotating] = useState(false);

  // Sketchfab API state
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const apiRef = useRef<SketchfabAPI | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadStage, setLoadStage] = useState<'loading' | 'ready' | 'error'>('loading');

  // Mesh maps resolved from getNodeMap
  const subsystemMeshIds = useRef<Map<SubsystemId, number[]>>(new Map());
  const materialMap = useRef<Map<string, SketchfabMaterial>>(new Map());
  const prevTelemetryStatusRef = useRef<string>('');

  // Orbital environment canvas (background layer behind iframe)
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useOrbitalEnvironment(bgCanvasRef, inEclipse, orbitProgress, viewMode === '3D');

  // ── Sketchfab Viewer API Initialization ────────────────────────────────────

  const initSketchfabAPI = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // The official Sketchfab Viewer API is loaded via the iframe URL.
    // We communicate via postMessage. The SDK exposes a global `Sketchfab` class.
    // Load the SDK script dynamically (per official docs).
    const existingScript = document.getElementById('sketchfab-api-sdk');
    if (existingScript) {
      bootstrapClient(iframe);
      return;
    }

    const script = document.createElement('script');
    script.id = 'sketchfab-api-sdk';
    script.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
    script.onload = () => bootstrapClient(iframe);
    script.onerror = () => {
      console.warn('[ORBITAL-SHIELD] Sketchfab SDK failed to load — using fallback embed');
      setLoadStage('ready'); // iframe still shows the model
      setApiReady(false);
    };
    document.head.appendChild(script);
  }, []);

  const bootstrapClient = (iframe: HTMLIFrameElement) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SF = (window as any).Sketchfab;
      if (!SF) {
        setLoadStage('ready');
        return;
      }
      const client = new SF(iframe);
      client.init(MODEL_UID, {
        success: (api: SketchfabAPI) => {
          apiRef.current = api;
          api.start();
          api.addEventListener('viewerready', () => {
            setApiReady(true);
            setLoadStage('ready');
            resolveMeshMap(api);
            applyBackground(api);
          });
          // Subsystem click selection on 3D model
          api.addEventListener('click', (info: unknown) => {
            const clickInfo = info as { instanceID?: number } | undefined;
            if (!clickInfo || typeof clickInfo.instanceID !== 'number') return;
            for (const [subId, ids] of subsystemMeshIds.current.entries()) {
              if (ids.includes(clickInfo.instanceID)) {
                onSelectSubsystem(subId);
                break;
              }
            }
          });
        },
        error: () => {
          console.warn('[ORBITAL-SHIELD] Sketchfab API init error — falling back to iframe-only mode');
          setLoadStage('ready');
        },
        // Viewer UI options — stationary by default, maximum visual fidelity
        autostart: 1,
        autospin: 0,
        ui_controls: 0,
        ui_infos: 0,
        ui_inspector: 0,
        ui_watermark: 0,
        ui_stop: 0,
        ui_ar: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_vr: 0,
        ui_fullscreen: 0,
        ui_annotations: 0,
        ui_theme: 'dark',
        transparent: 0,
        camera: 0,
        preload: 1,
        dof_circle: 0,
        tone_mapping: 3, // ACES Filmic
        exposure: 1.1,
        shadow_enabled: 1,
        ambient_color: [0x1a / 255, 0x24 / 255, 0x3b / 255],
        double_click: 0,
      });
    } catch (err) {
      console.warn('[ORBITAL-SHIELD] Sketchfab client error:', err);
      setLoadStage('ready');
    }
  };

  /** Build subsystem → instanceID[] map from the node hierarchy */
  const resolveMeshMap = (api: SketchfabAPI) => {
    api.getNodeMap((err, nodes) => {
      if (err || !nodes) return;

      const map = new Map<SubsystemId, number[]>();
      (['power', 'thermal', 'communication', 'aocs', 'payload'] as SubsystemId[]).forEach(id =>
        map.set(id, []),
      );

      // Assign each mesh node to a subsystem based on name patterns
      Object.values(nodes).forEach(node => {
        if (node.type !== 'MatrixTransform' && node.type !== 'Geometry') return;
        const name = node.name || '';
        for (const { pattern, subsystem } of MESH_TO_SUBSYSTEM) {
          if (pattern.test(name)) {
            map.get(subsystem)!.push(node.instanceID);
            break; // first match wins
          }
        }
      });

      // Fallback: if a subsystem got zero meshes assigned (model uses unnamed nodes),
      // we distribute the top-level children evenly as a best-effort visual mapping.
      let anyEmpty = false;
      map.forEach(ids => { if (ids.length === 0) anyEmpty = true; });

      if (anyEmpty) {
        const allIds = Object.values(nodes)
          .filter(n => n.type === 'MatrixTransform')
          .map(n => n.instanceID);

        const chunkSize = Math.max(1, Math.floor(allIds.length / 5));
        const subsystems: SubsystemId[] = ['power', 'thermal', 'communication', 'aocs', 'payload'];
        subsystems.forEach((sub, i) => {
          const existing = map.get(sub)!;
          if (existing.length === 0) {
            map.set(sub, allIds.slice(i * chunkSize, (i + 1) * chunkSize));
          }
        });
      }

      subsystemMeshIds.current = map;
      console.log('[ORBITAL-SHIELD] Subsystem→mesh map resolved:', Object.fromEntries(map));
    });

    // Also cache material list for later color manipulation
    api.getMaterialList((err, materials) => {
      if (err || !materials) return;
      materials.forEach(mat => materialMap.current.set(mat.id, mat));
    });
  };

  /** Set dark space background so only the spacecraft shows */
  const applyBackground = (api: SketchfabAPI) => {
    api.setBackground({ color: [0.028, 0.043, 0.067] }); // #070A11
  };

  // ── Iframe onLoad fallback (no SDK) ───────────────────────────────────────

  const handleIframeLoad = useCallback(() => {
    // If SDK hasn't initialised the API by now, treat as ready (iframe-only mode)
    if (loadStage === 'loading') {
      setTimeout(() => {
        if (loadStage === 'loading') {
          setLoadStage('ready');
        }
      }, 3000);
    }
  }, [loadStage]);

  // ── Effect: boot API when in 3D view ──────────────────────────────────────

  useEffect(() => {
    if (viewMode !== '3D') return;
    // Small delay to allow iframe to paint before injecting SDK
    const timer = setTimeout(initSketchfabAPI, 800);
    return () => clearTimeout(timer);
  }, [viewMode, initSketchfabAPI]);

  // ── Effect: telemetry-driven emissive material updates ────────────────────

  useEffect(() => {
    if (!apiReady || !apiRef.current) return;

    // Do not continuously recalculate materials when telemetry state has not changed
    const currentStatusSignature = (['power', 'thermal', 'communication', 'aocs', 'payload'] as SubsystemId[])
      .map(id => `${id}:${subsystems[id]?.status}:${subsystems[id]?.healthScore}`)
      .join('|') + `|selected:${selectedSubsystem}`;

    if (prevTelemetryStatusRef.current === currentStatusSignature) {
      return;
    }
    prevTelemetryStatusRef.current = currentStatusSignature;

    const api = apiRef.current;

    api.getMaterialList((err, materials) => {
      if (err || !materials) return;

      // Build a color override per subsystem based on health status
      const subsystemColors: Record<SubsystemId, [number, number, number]> = {
        power:         getEmissiveColor('power'),
        thermal:       getEmissiveColor('thermal'),
        communication: getEmissiveColor('communication'),
        aocs:          getEmissiveColor('aocs'),
        payload:       getEmissiveColor('payload'),
      };

      // Apply emissive overrides to materials whose names match a subsystem
      materials.forEach(mat => {
        let targetColor: [number, number, number] | null = null;

        for (const { pattern, subsystem } of MESH_TO_SUBSYSTEM) {
          if (pattern.test(mat.name)) {
            targetColor = subsystemColors[subsystem];
            break;
          }
        }

        if (!targetColor) {
          // Apply aocs color to unmatched materials (body/structure)
          targetColor = subsystemColors.aocs;
        }

        const updated = { ...mat };
        if (updated.channels.EmitColor) {
          updated.channels.EmitColor = {
            ...updated.channels.EmitColor,
            enable: true,
            color: targetColor,
            factor: getEmissiveFactor(mat.name),
          };
        }

        api.setMaterial(updated, () => {});
      });
    });
  }, [apiReady, subsystems, selectedSubsystem]);

  /** Determine emissive color for a subsystem based on its health + selection */
  const getEmissiveColor = (id: SubsystemId): [number, number, number] => {
    const sub = subsystems[id];
    if (selectedSubsystem === id) return STATUS_EMISSIVE.SELECTED;
    return STATUS_EMISSIVE[sub.status] ?? STATUS_EMISSIVE.NOMINAL;
  };

  /** Emissive intensity varies by status — CRITICAL pulses higher */
  const getEmissiveFactor = (matName: string): number => {
    for (const { pattern, subsystem } of MESH_TO_SUBSYSTEM) {
      if (pattern.test(matName)) {
        const sub = subsystems[subsystem];
        if (selectedSubsystem === subsystem) return 0.55;
        if (sub.status === 'CRITICAL') return 0.65;
        if (sub.status === 'WARNING') return 0.42;
        return 0.12;
      }
    }
    return 0.08;
  };

  // ── Effect: camera focus when subsystem selected ───────────────────────────

  useEffect(() => {
    if (!apiReady || !apiRef.current) return;
    const preset = SUBSYSTEM_CAMERA[selectedSubsystem ?? 'default'];
    apiRef.current.setCameraLookAt(
      preset.eye,
      preset.target,
      preset.duration / 1000, // Sketchfab uses seconds
    );
  }, [apiReady, selectedSubsystem]);

  // ── Camera controls ────────────────────────────────────────────────────────

  const handleResetCamera = () => {
    onSelectSubsystem(null);
    if (apiReady && apiRef.current) {
      apiRef.current.recenterCamera();
    }
  };

  // ── Embed URL ──────────────────────────────────────────────────────────────

  const embedUrl = [
    `https://sketchfab.com/models/${MODEL_UID}/embed`,
    `?autostart=1`,
    `&ui_controls=0`,
    `&ui_infos=0`,
    `&ui_inspector=0`,
    `&ui_watermark=0`,
    `&ui_stop=0`,
    `&ui_ar=0`,
    `&ui_help=0`,
    `&ui_settings=0`,
    `&ui_vr=0`,
    `&ui_fullscreen=0`,
    `&ui_annotations=0`,
    `&ui_theme=dark`,
    `&autospin=0`,
    `&preload=1`,
    `&camera=0`,
    `&transparent=0`,
  ].join('');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-[480px] lg:h-[540px] bg-[#070A11] border border-white/10 rounded-xl overflow-hidden flex flex-col">

      {/* ── Top HUD Bar ── */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 py-3 bg-gradient-to-b from-[#070A11]/90 via-[#070A11]/60 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-tech text-xs tracking-wider uppercase text-cyan-300 font-semibold">
              Programme ERIZON · Digital Twin
            </span>
          </div>
          <span className="text-white/20">|</span>
          <span className="text-xs font-mono text-slate-400">
            {inEclipse ? 'Eclipse Shadow (Umbra)' : 'Sunlit Pass (Direct Solar)'} · Orbit {(orbitProgress * 100).toFixed(1)}%
          </span>
          {apiReady && (
            <span className="text-[10px] font-mono text-emerald-400/70 hidden sm:inline">
              · Sketchfab API Active
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('3D')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === '3D'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Programme ERIZON 3D Model"
          >
            3D Spatial
          </button>
          <button
            onClick={() => setViewMode('2D_SCHEMATIC')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === '2D_SCHEMATIC'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="2D Engineering Schematic Fallback"
          >
            2D Schematic
          </button>
        </div>
      </div>

      {/* ── Main View ── */}
      {viewMode === '3D' ? (
        <div className="relative w-full h-full">

          {/* Orbital Environment Background (Three.js canvas) */}
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.85 }}
          />

          {/* Loading State */}
          {loadStage === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070A11]/95 gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-cyan-500/30 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-3 w-10 h-10 border border-cyan-400/20 rounded-full animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-tech text-sm text-cyan-300 tracking-widest uppercase animate-pulse">
                  Loading Programme ERIZON
                </p>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Initializing Sketchfab Viewer · UID {MODEL_UID.slice(0, 8)}…
                </p>
              </div>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sketchfab Iframe — exact Programme ERIZON model */}
          <iframe
            ref={iframeRef}
            id="programme-erizon-viewer"
            title="Programme ERIZON — ORBITAL-SHIELD Digital Twin"
            src={embedUrl}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            onLoad={handleIframeLoad}
            className="absolute inset-0 w-full h-full z-5 border-0"
            style={{
              opacity: loadStage === 'ready' ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
              background: 'transparent',
            }}
          />

          {/* Subsystem status overlay — fault glow badges */}
          {loadStage === 'ready' && (
            <div className="absolute top-14 right-4 z-20 flex flex-col gap-1.5 pointer-events-none">
              {(['power', 'thermal', 'communication', 'aocs', 'payload'] as SubsystemId[]).map(id => {
                const sub = subsystems[id];
                const isCritical = sub.status === 'CRITICAL';
                const isWarning = sub.status === 'WARNING';
                if (!isCritical && !isWarning) return null;
                return (
                  <div
                    key={id}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase flex items-center gap-1.5 ${
                      isCritical
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                        : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    }`}
                    style={isCritical ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}}
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {id} · {sub.status}
                  </div>
                );
              })}
            </div>
          )}

          {/* Link to Sketchfab (attribution) */}
          {loadStage === 'ready' && (
            <a
              href={`https://sketchfab.com/3d-models/programme-erizon-${MODEL_UID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-14 right-4 z-20 flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
              title="View Programme ERIZON on Sketchfab"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Sketchfab · nejenabinupa
            </a>
          )}
        </div>
      ) : (
        /* ── 2D Schematic Fallback ── */
        <div className="w-full h-full relative flex items-center justify-center p-6 bg-[#060910]">
          <img
            src="/src/assets/images/satellite_schematic_cutaway_1790846219996.jpg"
            alt="Spacecraft Engineering Cutaway Schematic"
            className="max-h-full max-w-full object-contain opacity-75 filter drop-shadow-[0_0_25px_rgba(6,182,212,0.15)]"
          />
          {/* Subsystem Schematic Overlay Hotspots */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between">
              <div className="pointer-events-auto bg-[#0B0F19]/90 border border-emerald-500/30 p-2.5 rounded-lg text-xs font-mono">
                <span className="text-emerald-400 font-semibold">● POWER ARRAY</span>
                <p className="text-slate-400">Photovoltaic Gallium-Arsenide: {subsystems.power.solarGeneration}W</p>
              </div>
              <div className="pointer-events-auto bg-[#0B0F19]/90 border border-cyan-500/30 p-2.5 rounded-lg text-xs font-mono">
                <span className="text-cyan-400 font-semibold">● X-BAND ANTENNA</span>
                <p className="text-slate-400">High Gain Dish: {subsystems.communication.downlinkBandwidth} Mbps</p>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="pointer-events-auto bg-[#0B0F19]/90 border border-blue-500/30 p-2.5 rounded-lg text-xs font-mono">
                <span className="text-blue-400 font-semibold">● THERMAL RADIATOR</span>
                <p className="text-slate-400">Radiator Temp: {subsystems.thermal.radiatorTemp}°C</p>
              </div>
              <div className="pointer-events-auto bg-[#0B0F19]/90 border border-purple-500/30 p-2.5 rounded-lg text-xs font-mono">
                <span className="text-purple-400 font-semibold">● SCIENTIFIC PAYLOAD</span>
                <p className="text-slate-400">Multispectral Sensor: {subsystems.payload.sensorThroughput} MB/s</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Subsystem Focus Toolbar ── */}
      <div className="absolute bottom-3 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1.5 backdrop-blur-md">
        <span className="text-[11px] font-mono uppercase text-slate-400 px-2">Subsystem Focus:</span>
        {(['power', 'thermal', 'communication', 'aocs', 'payload'] as SubsystemId[]).map(id => {
          const sub = subsystems[id];
          const isSelected = selectedSubsystem === id;
          const statusBullet = sub.status === 'CRITICAL' ? '✖' : sub.status === 'WARNING' ? '▲' : '●';
          const statusColor =
            sub.status === 'CRITICAL'
              ? 'text-rose-400'
              : sub.status === 'WARNING'
              ? 'text-amber-400'
              : 'text-emerald-400';

          return (
            <button
              key={id}
              id={`subsystem-focus-${id}`}
              onClick={() => onSelectSubsystem(isSelected ? null : id)}
              className={`px-2.5 py-1 text-xs font-mono uppercase rounded transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              <span className={statusColor}>{statusBullet}</span>
              <span>{id}</span>
              <span className="text-[10px] text-slate-400">{sub.healthScore}%</span>
            </button>
          );
        })}
      </div>

      {/* ── Floating Camera Control HUD ── */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1 backdrop-blur-md">
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded transition-colors text-slate-400 hover:text-white"
          title="Reset Camera Orientation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetCamera}
          className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/10 rounded"
          title="Reset Camera View"
        >
          Reset View
        </button>
      </div>

      {/* ── Floating Subsystem Telemetry Card ── */}
      {selectedSubsystem && (
        <div className="absolute top-14 left-4 z-20 w-72 bg-[#0B0F19]/95 border border-cyan-500/30 rounded-lg p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-tech text-xs tracking-wider uppercase font-semibold text-white">
                {selectedSubsystem.toUpperCase()} SUBSYSTEM
              </span>
            </div>
            <span
              className={`text-[11px] font-mono font-semibold ${
                subsystems[selectedSubsystem].status === 'CRITICAL'
                  ? 'text-rose-400'
                  : subsystems[selectedSubsystem].status === 'WARNING'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {subsystems[selectedSubsystem].status}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Health Index:</span>
              <span className="font-semibold text-white tabular-nums">{subsystems[selectedSubsystem].healthScore}%</span>
            </div>

            {selectedSubsystem === 'power' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Battery Voltage:</span>
                  <span className="text-white tabular-nums">{subsystems.power.batteryVoltage} V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cell Temperature:</span>
                  <span className="text-white tabular-nums">{subsystems.power.batteryTemp} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">State of Charge:</span>
                  <span className="text-white tabular-nums">{subsystems.power.stateOfCharge} %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solar Generation:</span>
                  <span className="text-white tabular-nums">{subsystems.power.solarGeneration} W</span>
                </div>
              </>
            )}

            {selectedSubsystem === 'thermal' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Core Cell Temp:</span>
                  <span className="text-white tabular-nums">{subsystems.thermal.batteryCellTemp} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avionics Temp:</span>
                  <span className="text-white tabular-nums">{subsystems.thermal.avionicsTemp} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Radiator Face Temp:</span>
                  <span className="text-white tabular-nums">{subsystems.thermal.radiatorTemp} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heat Pipe Flux:</span>
                  <span className="text-white tabular-nums">{subsystems.thermal.heatPipeFlux} W/m²</span>
                </div>
              </>
            )}

            {selectedSubsystem === 'communication' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">SNR:</span>
                  <span className="text-white tabular-nums">{subsystems.communication.snr} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Link Margin:</span>
                  <span className="text-white tabular-nums">{subsystems.communication.linkMargin} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Downlink Bandwidth:</span>
                  <span className="text-white tabular-nums">{subsystems.communication.downlinkBandwidth} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Packet Loss:</span>
                  <span className="text-white tabular-nums">{subsystems.communication.packetLoss} %</span>
                </div>
              </>
            )}

            {selectedSubsystem === 'aocs' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reaction Wheels:</span>
                  <span className="text-white tabular-nums">{subsystems.aocs.reactionWheelRpm} RPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attitude Error:</span>
                  <span className="text-white tabular-nums">{subsystems.aocs.attitudeError} arcsec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Star Tracker Lock:</span>
                  <span className="text-white tabular-nums">{subsystems.aocs.starTrackerFidelity} %</span>
                </div>
              </>
            )}

            {selectedSubsystem === 'payload' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensor Throughput:</span>
                  <span className="text-white tabular-nums">{subsystems.payload.sensorThroughput} MB/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solid-State Buffer:</span>
                  <span className="text-white tabular-nums">{subsystems.payload.bufferFill} %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calibration State:</span>
                  <span className="text-white tabular-nums">{subsystems.payload.detectorCalibration} %</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between text-[11px]">
            <span className="text-slate-400">Cascade Dependency:</span>
            <span className="text-cyan-300 font-mono">Active Link</span>
          </div>
        </div>
      )}
    </div>
  );
};
