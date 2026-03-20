import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { Sparkles, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 450;
const EDGE_LIMIT = 1400;
const PULSE_COUNT = 250;
const BOKEH_COUNT = 120;

const DEEP_NAVY = new THREE.Color("#020a18");
const OCEAN_BLUE = new THREE.Color("#0a3d6b");
const TEAL_GLOW = new THREE.Color("#1a8fa8");
const CYAN_BRIGHT = new THREE.Color("#4dd8e8");
const WARM_GOLD = new THREE.Color("#d4a843");
const WHITE_HOT = new THREE.Color("#e8f0ff");
const ICE_BLUE = new THREE.Color("#7ec8e3");

function fbm(x, y, octaves) {
  let val = 0, amp = 1, freq = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * (Math.sin(x * freq * 1.7 + y * freq * 0.9) * 0.5 +
      Math.cos(x * freq * 0.8 - y * freq * 1.3) * 0.3 +
      Math.sin((x + y) * freq * 2.1) * 0.2);
    total += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return val / total;
}

function generateTerrain(w, h, spacing) {
  const geo = new THREE.PlaneGeometry(w * spacing, h * spacing, w - 1, h - 1);
  geo.rotateX(-Math.PI * 0.48);
  const pos = geo.attributes.position.array;
  const base = new Float32Array(pos.length);

  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], z = pos[i + 2];
    const n = fbm(x * 0.08, z * 0.08, 5) * 3.5;
    pos[i + 1] += n;
    base[i] = pos[i];
    base[i + 1] = pos[i + 1];
    base[i + 2] = pos[i + 2];
  }
  geo.computeVertexNormals();

  const colors = new Float32Array((pos.length / 3) * 3);
  const tmpC = new THREE.Color();
  for (let i = 0; i < pos.length / 3; i++) {
    const y = pos[i * 3 + 1];
    const t = THREE.MathUtils.clamp((y + 3) / 6, 0, 1);
    tmpC.copy(DEEP_NAVY).lerp(OCEAN_BLUE, t * 0.4);
    colors[i * 3] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return { geometry: geo, basePositions: base };
}

function TerrainSolid({ scrollProgress }) {
  const meshRef = useRef();
  const { geometry, basePositions } = useMemo(() => generateTerrain(100, 100, 0.35), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pos = meshRef.current.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const bx = basePositions[i], bz = basePositions[i + 2];
      pos[i + 1] = basePositions[i + 1] +
        Math.sin(bx * 0.1 + t * 0.25) * 0.2 +
        Math.cos(bz * 0.08 + t * 0.2) * 0.18;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -4, -6]}>
      <meshPhysicalMaterial
        vertexColors
        transparent
        opacity={0.55}
        roughness={0.85}
        metalness={0.15}
        emissive="#041828"
        emissiveIntensity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function TerrainWireframe({ scrollProgress }) {
  const meshRef = useRef();
  const { geometry, basePositions } = useMemo(() => generateTerrain(100, 100, 0.35), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pos = meshRef.current.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const bx = basePositions[i], bz = basePositions[i + 2];
      pos[i + 1] = basePositions[i + 1] +
        Math.sin(bx * 0.1 + t * 0.25) * 0.2 +
        Math.cos(bz * 0.08 + t * 0.2) * 0.18;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -3.99, -6]}>
      <meshBasicMaterial
        color="#0d4a7a"
        wireframe
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function generateNetwork() {
  const positions = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const spread = 18;
    const x = (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * spread - 3;
    const baseY = fbm(x * 0.08, z * 0.08, 5) * 3.5;
    const y = baseY - 3.5 + (Math.random() - 0.3) * 1.2;
    positions.push(new THREE.Vector3(x, y, z));
  }

  const edges = [];
  for (let i = 0; i < NODE_COUNT && edges.length < EDGE_LIMIT; i++) {
    const nearby = [];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const d = positions[i].distanceTo(positions[j]);
      if (d < 2.5) nearby.push({ j, d });
    }
    nearby.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(nearby.length, 5) && edges.length < EDGE_LIMIT; k++) {
      edges.push([i, nearby[k].j]);
    }
  }
  return { positions, edges };
}

function NetworkNodes({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const nodeTypes = useMemo(() =>
    Array.from({ length: NODE_COUNT }, () => Math.random()), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const pulse = Math.sin(t * 1.8 + i * 0.5) * 0.015;
      const baseSize = nodeTypes[i] > 0.85 ? 0.09 : 0.035;
      const scale = baseSize + g * 0.18 + pulse;

      dummy.position.set(
        p.x + Math.sin(t * 0.3 + i * 0.2) * 0.05,
        p.y + Math.sin(t * 0.4 + i * 0.15) * 0.12,
        p.z + Math.cos(t * 0.25 + i * 0.18) * 0.04,
      );
      dummy.scale.setScalar(Math.max(0.015, scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (nodeTypes[i] > 0.85) {
        tmpColor.copy(WARM_GOLD).lerp(WHITE_HOT, g * 0.8);
      } else if (nodeTypes[i] > 0.5) {
        tmpColor.copy(CYAN_BRIGHT).lerp(WHITE_HOT, g * 0.7);
      } else {
        tmpColor.copy(ICE_BLUE).lerp(WHITE_HOT, g * 0.5);
      }
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        transparent
        opacity={0.95}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function NodeHalos({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const nodeTypes = useMemo(() =>
    Array.from({ length: NODE_COUNT }, () => Math.random()), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const isLarge = nodeTypes[i] > 0.85;
      if (!isLarge && g < 0.3) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const haloSize = isLarge ? 0.35 + g * 0.5 : g * 0.4;
      dummy.position.set(
        p.x + Math.sin(t * 0.3 + i * 0.2) * 0.05,
        p.y + Math.sin(t * 0.4 + i * 0.15) * 0.12,
        p.z + Math.cos(t * 0.25 + i * 0.18) * 0.04,
      );
      dummy.scale.setScalar(haloSize);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const alpha = isLarge ? 0.12 + g * 0.15 : g * 0.1;
      tmpColor.set(isLarge ? "#d4a843" : "#4dd8e8");
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.12}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function NetworkEdges({ network, glowRef }) {
  const lineRef = useRef();
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const geometry = useMemo(() => {
    const count = network.edges.length;
    const pos = new Float32Array(count * 6);
    const col = new Float32Array(count * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, [network]);

  useFrame(({ clock }) => {
    const geo = lineRef.current?.geometry;
    if (!geo) return;
    const posArr = geo.attributes.position.array;
    const colArr = geo.attributes.color.array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < network.edges.length; i++) {
      const [a, b] = network.edges[i];
      const pa = network.positions[a];
      const pb = network.positions[b];
      const base = i * 6;

      const fA = Math.sin(t * 0.4 + a * 0.15) * 0.12;
      const fB = Math.sin(t * 0.4 + b * 0.15) * 0.12;

      posArr[base] = pa.x + Math.sin(t * 0.3 + a * 0.2) * 0.05;
      posArr[base + 1] = pa.y + fA;
      posArr[base + 2] = pa.z;
      posArr[base + 3] = pb.x + Math.sin(t * 0.3 + b * 0.2) * 0.05;
      posArr[base + 4] = pb.y + fB;
      posArr[base + 5] = pb.z;

      const glow = Math.max(glowRef.current[a], glowRef.current[b]);
      const dist = pa.distanceTo(pb);
      const fadeByDist = THREE.MathUtils.clamp(1 - dist / 2.5, 0.1, 1);

      tmpColor.copy(OCEAN_BLUE).lerp(CYAN_BRIGHT, glow * 0.6 + 0.08);
      const brightness = fadeByDist * (0.4 + glow * 0.6);
      colArr[base] = tmpColor.r * brightness;
      colArr[base + 1] = tmpColor.g * brightness;
      colArr[base + 2] = tmpColor.b * brightness;
      colArr[base + 3] = tmpColor.r * brightness;
      colArr[base + 4] = tmpColor.g * brightness;
      colArr[base + 5] = tmpColor.b * brightness;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function Pulses({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const pulseData = useMemo(() =>
    Array.from({ length: PULSE_COUNT }, () => ({
      edgeIdx: Math.floor(Math.random() * network.edges.length),
      t: Math.random(),
      speed: 0.15 + Math.random() * 0.6,
      forward: Math.random() > 0.5,
      colorType: Math.random(),
    })), [network]);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    for (let i = 0; i < PULSE_COUNT; i++) {
      const pd = pulseData[i];
      pd.t += dt * pd.speed * (pd.forward ? 1 : -1);

      if (pd.t > 1 || pd.t < 0) {
        const dest = pd.forward ? network.edges[pd.edgeIdx][1] : network.edges[pd.edgeIdx][0];
        glowRef.current[dest] = 1.0;
        pd.edgeIdx = Math.floor(Math.random() * network.edges.length);
        pd.t = pd.forward ? 0 : 1;
        pd.forward = Math.random() > 0.5;
        pd.colorType = Math.random();
      }

      const [a, b] = network.edges[pd.edgeIdx];
      const pa = network.positions[a], pb = network.positions[b];
      const fA = Math.sin(time * 0.4 + a * 0.15) * 0.12;
      const fB = Math.sin(time * 0.4 + b * 0.15) * 0.12;

      tmpVec.set(
        pa.x + (pb.x - pa.x) * pd.t,
        pa.y + fA + (pb.y + fB - pa.y - fA) * pd.t,
        pa.z + (pb.z - pa.z) * pd.t,
      );

      const arcGlow = Math.sin(pd.t * Math.PI);
      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(0.025 + arcGlow * 0.03);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (pd.colorType > 0.7) {
        tmpColor.copy(WARM_GOLD).lerp(WHITE_HOT, arcGlow * 0.5);
      } else {
        tmpColor.copy(CYAN_BRIGHT).lerp(WHITE_HOT, arcGlow * 0.4);
      }
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, PULSE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        transparent
        opacity={0.9}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function BokehParticles() {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const particles = useMemo(() =>
    Array.from({ length: BOKEH_COUNT }, () => ({
      x: (Math.random() - 0.5) * 25,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 25 - 5,
      size: 0.06 + Math.random() * 0.25,
      speed: 0.05 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      colorType: Math.random(),
    })), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < BOKEH_COUNT; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.8,
        p.y + Math.cos(t * p.speed * 0.6 + p.phase) * 0.5,
        p.z + Math.sin(t * p.speed * 0.4 + p.phase * 1.5) * 0.6,
      );
      const flicker = 0.4 + Math.sin(t * 1.5 + p.phase) * 0.3 + Math.sin(t * 3.7 + p.phase * 2) * 0.15;
      dummy.scale.setScalar(p.size * Math.max(0.1, flicker));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (p.colorType > 0.75) {
        tmpColor.copy(WARM_GOLD);
      } else if (p.colorType > 0.4) {
        tmpColor.copy(CYAN_BRIGHT);
      } else {
        tmpColor.copy(ICE_BLUE);
      }
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, BOKEH_COUNT]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial
        transparent
        opacity={0.08}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

function AtmosphericDust() {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 350;

  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 15,
      z: (Math.random() - 0.5) * 30,
      speed: 0.02 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      size: 0.005 + Math.random() * 0.015,
    })), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 1.5,
        p.y + Math.cos(t * p.speed * 0.5 + p.phase) * 0.8 + t * 0.01,
        p.z + Math.sin(t * p.speed * 0.3 + p.phase * 2) * 1.2,
      );
      const flicker = 0.3 + Math.sin(t * 2 + p.phase) * 0.4;
      dummy.scale.setScalar(p.size * Math.max(0.1, flicker));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color="#5ab8d4"
        transparent
        opacity={0.35}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function GlowUpdater({ glowRef }) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < NODE_COUNT; i++) {
      glowRef.current[i] = Math.max(0, glowRef.current[i] - dt * 1.2);
    }
  });
  return null;
}

function MouseInteraction({ network, glowRef }) {
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseNDC = useRef(new THREE.Vector2(0, 0));

  const onPointerMove = useCallback((e) => {
    mouseNDC.current.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
  }, []);

  useMemo(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
  }, [onPointerMove]);

  useFrame(() => {
    raycaster.setFromCamera(mouseNDC.current, camera);
    const ray = raycaster.ray;
    for (let i = 0; i < NODE_COUNT; i++) {
      const dist = ray.distanceToPoint(network.positions[i]);
      if (dist < 2.0) {
        const strength = 1 - dist / 2.0;
        glowRef.current[i] = Math.min(1, glowRef.current[i] + strength * 0.2);
      }
    }
  });

  return null;
}

function CameraController({ scrollProgress }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const z = 8 + scrollProgress.current * 10;
    const breatheY = Math.sin(t * 0.12) * 0.4;
    const breatheX = Math.sin(t * 0.07) * 0.8;
    const driftZ = Math.cos(t * 0.05) * 0.3;

    camera.position.x += (breatheX - camera.position.x) * 0.012;
    camera.position.y += (0.8 + breatheY - camera.position.y) * 0.015;
    camera.position.z += (z + driftZ - camera.position.z) * 0.025;
    camera.lookAt(0, -2.5, -4);
  });
  return null;
}

function VolumetricShafts() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      child.material.opacity = 0.015 + Math.sin(t * 0.3 + i * 0.8) * 0.01;
      child.rotation.z = (i - 3) * 0.12 + Math.sin(t * 0.1 + i) * 0.02;
    });
  });

  const shafts = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      position: [(i - 3) * 2.5, 5, -10],
      scale: [0.08 + Math.random() * 0.04, 18, 1],
    })), []);

  return (
    <group ref={groupRef}>
      {shafts.map((s, i) => (
        <mesh key={i} position={s.position} scale={s.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#1a6080"
            transparent
            opacity={0.02}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function DeepOceanMeshScene() {
  const scrollProgress = useRef(0);
  const glowRef = useRef(new Float32Array(NODE_COUNT));
  const network = useMemo(() => generateNetwork(), []);

  useFrame(() => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
  });

  return (
    <>
      <fog attach="fog" args={["#010810", 6, 30]} />
      <ambientLight intensity={0.04} color="#0a2040" />

      <pointLight position={[5, 4, 3]} intensity={0.6} color="#1a8fa8" distance={22} decay={2} />
      <pointLight position={[-4, 2, 1]} intensity={0.45} color="#4dd8e8" distance={18} decay={2} />
      <pointLight position={[2, -3, -5]} intensity={0.35} color="#0a3d6b" distance={20} decay={2} />
      <pointLight position={[-2, 6, -3]} intensity={0.25} color="#d4a843" distance={16} decay={2} />
      <pointLight position={[0, 1, 5]} intensity={0.2} color="#7ec8e3" distance={14} decay={2} />
      <pointLight position={[6, -1, -8]} intensity={0.15} color="#1a6080" distance={25} decay={2} />

      <CameraController scrollProgress={scrollProgress} />
      <GlowUpdater glowRef={glowRef} />
      <MouseInteraction network={network} glowRef={glowRef} />

      <TerrainSolid scrollProgress={scrollProgress} />
      <TerrainWireframe scrollProgress={scrollProgress} />

      <NetworkNodes network={network} glowRef={glowRef} />
      <NodeHalos network={network} glowRef={glowRef} />
      <NetworkEdges network={network} glowRef={glowRef} />
      <Pulses network={network} glowRef={glowRef} />

      <BokehParticles />
      <AtmosphericDust />
      <VolumetricShafts />

      <Sparkles count={600} scale={30} size={1.5} speed={0.08} opacity={0.25} color="#1a8fa8" />
      <Sparkles count={300} scale={22} size={0.6} speed={0.05} opacity={0.15} color="#d4a843" />
    </>
  );
}
