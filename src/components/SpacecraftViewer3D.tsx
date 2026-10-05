import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SubsystemMap, SubsystemId } from '../types/spacecraft';
import { Layers, RotateCcw, ZoomIn, ZoomOut, Eye, ShieldAlert, Cpu } from 'lucide-react';

interface SpacecraftViewer3DProps {
  subsystems: SubsystemMap;
  selectedSubsystem: SubsystemId | null;
  onSelectSubsystem: (subsystem: SubsystemId | null) => void;
  inEclipse: boolean;
  orbitProgress: number;
}

export const SpacecraftViewer3D: React.FC<SpacecraftViewer3DProps> = ({
  subsystems,
  selectedSubsystem,
  onSelectSubsystem,
  inEclipse,
  orbitProgress,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D_SCHEMATIC'>('3D');
  const [isRotating, setIsRotating] = useState(true);
  const [cameraZoomLevel, setCameraZoomLevel] = useState(1);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spacecraftGroupRef = useRef<THREE.Group | null>(null);
  const subsystemMeshesRef = useRef<Map<SubsystemId, THREE.Mesh[]>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Target camera position for smooth transition
  const targetCamPos = useRef(new THREE.Vector3(7, 4.5, 9));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Initialize Three.js scene
  useEffect(() => {
    if (viewMode !== '3D' || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Atmospheric deep space fog
    scene.fog = new THREE.FogExp2(0x05070b, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7, 4.5, 9);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.replaceChildren(renderer.domElement);

    // Subtle starfield
    const starsCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starCoords = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starCoords[i] = (Math.random() - 0.5) * 80;
      starCoords[i + 1] = (Math.random() - 0.5) * 80;
      starCoords[i + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.15, transparent: true, opacity: 0.6 });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Earth curvature limb in distance
    const earthGeo = new THREE.SphereGeometry(18, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0f2744,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x051329,
      emissiveIntensity: 0.2,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, -22, -15);
    scene.add(earth);

    // Atmospheric limb glow ring
    const atmosphereGeo = new THREE.RingGeometry(18, 18.6, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const atmosphereRing = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    atmosphereRing.position.set(0, -22, -14.9);
    scene.add(atmosphereRing);

    // Orbital trajectory ring
    const orbitRingGeo = new THREE.RingGeometry(11.8, 12.0, 96);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    scene.add(orbitRing);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a243b, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, inEclipse ? 0.2 : 3.8);
    sunLight.position.set(12, 10, 8);
    scene.add(sunLight);

    const earthAlbedoLight = new THREE.DirectionalLight(0x0ea5e9, 0.8);
    earthAlbedoLight.position.set(0, -8, -4);
    scene.add(earthAlbedoLight);

    // Build Detailed Spacecraft
    const craftGroup = new THREE.Group();
    spacecraftGroupRef.current = craftGroup;
    scene.add(craftGroup);

    const meshMap = new Map<SubsystemId, THREE.Mesh[]>();
    meshMap.set('power', []);
    meshMap.set('thermal', []);
    meshMap.set('communication', []);
    meshMap.set('aocs', []);
    meshMap.set('payload', []);

    // 1. Central Avionics Bus (Hexagonal Prism)
    const busGeo = new THREE.CylinderGeometry(1.4, 1.4, 3.2, 6);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Gold MLI Foil
      metalness: 0.85,
      roughness: 0.25,
      bumpScale: 0.05,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    busMesh.castShadow = true;
    busMesh.userData = { subsystem: 'aocs' };
    craftGroup.add(busMesh);
    meshMap.get('aocs')!.push(busMesh);

    // Carbon fiber equipment collars
    const collarGeo = new THREE.TorusGeometry(1.42, 0.06, 8, 24);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const collarTop = new THREE.Mesh(collarGeo, collarMat);
    collarTop.rotation.x = Math.PI / 2;
    collarTop.position.y = 1.1;
    craftGroup.add(collarTop);
    const collarBottom = new THREE.Mesh(collarGeo, collarMat);
    collarBottom.rotation.x = Math.PI / 2;
    collarBottom.position.y = -1.1;
    craftGroup.add(collarBottom);

    // 2. Solar Arrays (Left & Right Wings)
    const solarWingGeo = new THREE.BoxGeometry(4.2, 0.08, 1.6);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Photovoltaic silicon blue
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x0369a1,
      emissiveIntensity: 0.15,
    });

    const leftWing = new THREE.Mesh(solarWingGeo, solarMat);
    leftWing.position.set(-3.7, 0, 0);
    leftWing.userData = { subsystem: 'power' };
    craftGroup.add(leftWing);
    meshMap.get('power')!.push(leftWing);

    const rightWing = new THREE.Mesh(solarWingGeo, solarMat);
    rightWing.position.set(3.7, 0, 0);
    rightWing.userData = { subsystem: 'power' };
    craftGroup.add(rightWing);
    meshMap.get('power')!.push(rightWing);

    // Solar array booms & hinges
    const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const boomLeft = new THREE.Mesh(boomGeo, boomMat);
    boomLeft.rotation.z = Math.PI / 2;
    boomLeft.position.set(-1.6, 0, 0);
    craftGroup.add(boomLeft);
    const boomRight = new THREE.Mesh(boomGeo, boomMat);
    boomRight.rotation.z = Math.PI / 2;
    boomRight.position.set(1.6, 0, 0);
    craftGroup.add(boomRight);

    // 3. Battery Bay (Internal Core / Accent)
    const batteryGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const batteryMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
    });
    const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
    batteryMesh.position.set(0, -0.4, 0.8);
    batteryMesh.userData = { subsystem: 'power' };
    craftGroup.add(batteryMesh);
    meshMap.get('power')!.push(batteryMesh);

    // 4. Thermal Radiator Fins (Back Face)
    const radiatorGeo = new THREE.BoxGeometry(1.6, 2.2, 0.08);
    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.1,
    });
    const radiatorMesh = new THREE.Mesh(radiatorGeo, radiatorMat);
    radiatorMesh.position.set(0, 0, -1.45);
    radiatorMesh.userData = { subsystem: 'thermal' };
    craftGroup.add(radiatorMesh);
    meshMap.get('thermal')!.push(radiatorMesh);

    // 5. High-Gain Communications Dish Antenna
    const dishGeo = new THREE.CylinderGeometry(1.1, 0.2, 0.35, 24, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI / 3;
    dishMesh.position.set(0, 2.2, 0.4);
    dishMesh.userData = { subsystem: 'communication' };
    craftGroup.add(dishMesh);
    meshMap.get('communication')!.push(dishMesh);

    // Antenna feedhorn & boom
    const feedhornGeo = new THREE.ConeGeometry(0.12, 0.4, 12);
    const feedhornMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 });
    const feedhornMesh = new THREE.Mesh(feedhornGeo, feedhornMat);
    feedhornMesh.position.set(0, 2.45, 0.6);
    feedhornMesh.rotation.x = -Math.PI / 6;
    craftGroup.add(feedhornMesh);
    meshMap.get('communication')!.push(feedhornMesh);

    // 6. Scientific Earth Observation Optical Payload (Bottom aperture)
    const payloadBaffleGeo = new THREE.CylinderGeometry(0.65, 0.8, 1.4, 24);
    const payloadMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.9,
      roughness: 0.2,
    });
    const payloadMesh = new THREE.Mesh(payloadBaffleGeo, payloadMat);
    payloadMesh.position.set(0, -2.1, 0);
    payloadMesh.userData = { subsystem: 'payload' };
    craftGroup.add(payloadMesh);
    meshMap.get('payload')!.push(payloadMesh);

    // Payload optical glass lens
    const lensGeo = new THREE.CircleGeometry(0.6, 24);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      transmission: 0.9,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.rotation.x = Math.PI / 2;
    lensMesh.position.set(0, -2.81, 0);
    payloadMesh.add(lensMesh);
    meshMap.get('payload')!.push(lensMesh as unknown as THREE.Mesh);

    // 7. RCS Thruster Pods (4 corners)
    const rcsGeo = new THREE.ConeGeometry(0.08, 0.18, 8);
    const rcsMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const positions = [
      [1.1, 1.4, 1.1],
      [-1.1, 1.4, 1.1],
      [1.1, 1.4, -1.1],
      [-1.1, 1.4, -1.1],
    ];
    positions.forEach(pos => {
      const rcs = new THREE.Mesh(rcsGeo, rcsMat);
      rcs.position.set(pos[0], pos[1], pos[2]);
      rcs.rotation.x = Math.PI;
      craftGroup.add(rcs);
      meshMap.get('aocs')!.push(rcs);
    });

    subsystemMeshesRef.current = meshMap;

    // Handle mouse click / raycast on subsystems
    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(craftGroup.children, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && !current.userData?.subsystem && current.parent) {
          current = current.parent;
        }
        if (current && current.userData?.subsystem) {
          onSelectSubsystem(current.userData.subsystem as SubsystemId);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && craftGroup) {
        craftGroup.rotation.y += 0.0035;
      }

      // Smooth camera interpolation towards selected subsystem
      camera.position.lerp(targetCamPos.current, 0.05);
      camera.lookAt(targetLookAt.current);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      busGeo.dispose();
      solarWingGeo.dispose();
    };
  }, [viewMode, inEclipse]);

  // Update subsystem colors and emissive state based on live telemetry health
  useEffect(() => {
    if (!subsystemMeshesRef.current || viewMode !== '3D') return;

    const statusColors = {
      NOMINAL: 0x10b981,
      WARNING: 0xf59e0b,
      CRITICAL: 0xef4444,
    };

    (Object.keys(subsystems) as SubsystemId[]).forEach(id => {
      const sub = subsystems[id];
      const meshes = subsystemMeshesRef.current.get(id);
      if (!meshes) return;

      const color = statusColors[sub.status] || 0x10b981;
      const isSelected = selectedSubsystem === id;

      meshes.forEach(mesh => {
        if (mesh.material && 'emissive' in mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (sub.status === 'CRITICAL') {
            mat.emissive.setHex(0xef4444);
            mat.emissiveIntensity = 0.6;
          } else if (sub.status === 'WARNING') {
            mat.emissive.setHex(0xf59e0b);
            mat.emissiveIntensity = 0.4;
          } else if (isSelected) {
            mat.emissive.setHex(0x06b6d4);
            mat.emissiveIntensity = 0.5;
          } else {
            mat.emissive.setHex(color);
            mat.emissiveIntensity = 0.15;
          }
        }
      });
    });

    // Camera targeting based on selected subsystem
    if (selectedSubsystem === 'power') {
      targetCamPos.current.set(4.5, 2.0, 5.0);
      targetLookAt.current.set(1.5, 0, 0);
    } else if (selectedSubsystem === 'thermal') {
      targetCamPos.current.set(0.5, 2.5, -6.0);
      targetLookAt.current.set(0, 0, -1.0);
    } else if (selectedSubsystem === 'communication') {
      targetCamPos.current.set(2.5, 5.0, 4.0);
      targetLookAt.current.set(0, 2.2, 0.4);
    } else if (selectedSubsystem === 'payload') {
      targetCamPos.current.set(2.5, -4.0, 4.5);
      targetLookAt.current.set(0, -2.0, 0);
    } else if (selectedSubsystem === 'aocs') {
      targetCamPos.current.set(4.0, 1.5, 4.5);
      targetLookAt.current.set(0, 0, 0);
    } else {
      targetCamPos.current.set(7, 4.5, 9);
      targetLookAt.current.set(0, 0, 0);
    }
  }, [subsystems, selectedSubsystem, viewMode]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? 0.8 : 1.2;
    targetCamPos.current.multiplyScalar(factor);
    setCameraZoomLevel(prev => (direction === 'in' ? Math.min(3, prev + 0.25) : Math.max(0.5, prev - 0.25)));
  };

  const handleResetCamera = () => {
    onSelectSubsystem(null);
    targetCamPos.current.set(7, 4.5, 9);
    targetLookAt.current.set(0, 0, 0);
    setCameraZoomLevel(1);
  };

  return (
    <div className="relative w-full h-[480px] lg:h-[540px] bg-[#070A11] border border-white/10 rounded-xl overflow-hidden flex flex-col">
      {/* Top HUD Bar */}
      <div className="absolute top-0 inset-x-0 z-10 px-4 py-3 bg-gradient-to-b from-[#070A11]/90 via-[#070A11]/60 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-tech text-xs tracking-wider uppercase text-cyan-300 font-semibold">
              3D Spacecraft Digital Twin
            </span>
          </div>
          <span className="text-white/20">|</span>
          <span className="text-xs font-mono text-slate-400">
            {inEclipse ? 'Eclipse Shadow (Umbra)' : 'Sunlit Pass (Direct Solar)'} · Orbit {(orbitProgress * 100).toFixed(1)}%
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('3D')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === '3D' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="3D High-Fidelity Twin"
          >
            3D Spatial
          </button>
          <button
            onClick={() => setViewMode('2D_SCHEMATIC')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === '2D_SCHEMATIC' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="2D Engineering Schematic Fallback"
          >
            2D Schematic
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === '3D' ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative" />
      ) : (
        /* 2D Schematic Fallback View */
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

      {/* Interactive Subsystem Focus Toolbar */}
      <div className="absolute bottom-3 left-4 z-10 flex flex-wrap items-center gap-1.5 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1.5 backdrop-blur-md">
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

      {/* Floating Camera Control HUD */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1 bg-[#0B0F19]/90 border border-white/10 rounded-lg p-1 backdrop-blur-md">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-1.5 rounded transition-colors ${isRotating ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white'}`}
          title={isRotating ? 'Pause Orbital Rotation' : 'Resume Orbital Rotation'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom('in')}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetCamera}
          className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-white/10 rounded"
          title="Reset Camera View"
        >
          Reset View
        </button>
      </div>

      {/* Floating Subsystem Telemetry Card when focused */}
      {selectedSubsystem && (
        <div className="absolute top-14 left-4 z-10 w-72 bg-[#0B0F19]/95 border border-cyan-500/30 rounded-lg p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-200">
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
