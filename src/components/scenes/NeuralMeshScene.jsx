import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const GRID_W = 80;
const GRID_H = 80;
const SPACING = 0.38;
const NODE_COUNT = 320;
const EDGE_LIMIT = 900;
const PULSE_COUNT = 180;

const VIOLET_DEEP = new THREE.Color("#2a0845");
const VIOLET_MID = new THREE.Color("#6b21a8");
const VIOLET_BRIGHT = new THREE.Color("#a855f7");
const VIOLET_GLOW = new THREE.Color("#c084fc");
const ELECTRIC_BLUE = new THREE.Color("#818cf8");
const WHITE_HOT = new THREE.Color("#e0d4ff");

function simplex2D(x, y) {
  const s = (x + y) * 0.3660254;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * 0.2113249;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  return Math.sin(x0 * 2.1 + y0 * 1.7) * 0.5 +
    Math.cos(x0 * 1.3 - y0 * 2.4) * 0.3 +
    Math.sin((x0 + y0) * 3.1) * 0.2;
}

function TerrainMesh({ scrollProgress }) {
  const meshRef = useRef();
  const positionsRef = useRef();

  const { geometry, basePositions } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      GRID_W * SPACING,
      GRID_H * SPACING,
      GRID_W - 1,
      GRID_H - 1,
    );
    geo.rotateX(-Math.PI * 0.55);
    const pos = geo.attributes.position.array;
    const base = new Float32Array(pos.length);

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i];
      const z = pos[i + 2];
      const noise = simplex2D(x * 0.12, z * 0.12) * 2.8 +
        simplex2D(x * 0.25, z * 0.25) * 1.2 +
        simplex2D(x * 0.5, z * 0.5) * 0.4;
      pos[i + 1] += noise;
      base[i] = pos[i];
      base[i + 1] = pos[i + 1];
      base[i + 2] = pos[i + 2];
    }

    geo.computeVertexNormals();
    return { geometry: geo, basePositions: base };
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pos = meshRef.current.geometry.attributes.position.array;

    for (let i = 0; i < pos.length; i += 3) {
      const bx = basePositions[i];
      const bz = basePositions[i + 2];
      const wave = Math.sin(bx * 0.15 + t * 0.4) * 0.3 +
        Math.cos(bz * 0.12 + t * 0.3) * 0.25;
      pos[i + 1] = basePositions[i + 1] + wave;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -3, -4]}>
      <meshStandardMaterial
        color="#1a0533"
        wireframe
        transparent
        opacity={0.18}
        emissive="#4c1d95"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function TerrainSolid({ scrollProgress }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      GRID_W * SPACING,
      GRID_H * SPACING,
      GRID_W - 1,
      GRID_H - 1,
    );
    geo.rotateX(-Math.PI * 0.55);
    const pos = geo.attributes.position.array;

    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i];
      const z = pos[i + 2];
      const noise = simplex2D(x * 0.12, z * 0.12) * 2.8 +
        simplex2D(x * 0.25, z * 0.25) * 1.2 +
        simplex2D(x * 0.5, z * 0.5) * 0.4;
      pos[i + 1] += noise;
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pos = meshRef.current.geometry.attributes.position.array;
    const baseGeo = geometry.attributes.position.array;

    for (let i = 0; i < pos.length; i += 3) {
      const bx = baseGeo[i];
      const bz = baseGeo[i + 2];
      const wave = Math.sin(bx * 0.15 + t * 0.4) * 0.3 +
        Math.cos(bz * 0.12 + t * 0.3) * 0.25;
      pos[i + 1] = baseGeo[i + 1] + wave;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry.clone()} position={[0, -3.01, -4]}>
      <meshPhysicalMaterial
        color="#0d001a"
        transparent
        opacity={0.45}
        roughness={0.7}
        metalness={0.3}
        emissive="#1a0533"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function generateNetwork() {
  const positions = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const spread = 14;
    const x = (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * spread - 2;
    const baseY = simplex2D(x * 0.12, z * 0.12) * 2.8 +
      simplex2D(x * 0.25, z * 0.25) * 1.2;
    const y = baseY - 2.5 + Math.random() * 0.6;
    positions.push(new THREE.Vector3(x, y, z));
  }

  const edges = [];
  for (let i = 0; i < NODE_COUNT && edges.length < EDGE_LIMIT; i++) {
    const nearby = [];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const d = positions[i].distanceTo(positions[j]);
      if (d < 2.8) nearby.push({ j, d });
    }
    nearby.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(nearby.length, 5) && edges.length < EDGE_LIMIT; k++) {
      edges.push([i, nearby[k].j]);
    }
  }

  return { positions, edges };
}

function NetworkNodes({ network, glowRef, scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const pulse = Math.sin(t * 2 + i * 0.3) * 0.02;
      const scale = 0.04 + g * 0.14 + pulse;

      dummy.position.set(
        p.x,
        p.y + Math.sin(t * 0.5 + i * 0.1) * 0.15,
        p.z,
      );
      dummy.scale.setScalar(Math.max(0.02, scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(VIOLET_MID).lerp(WHITE_HOT, g);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 12, 12]} />
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

function NetworkEdges({ network, glowRef, scrollProgress }) {
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

      const floatA = Math.sin(t * 0.5 + a * 0.1) * 0.15;
      const floatB = Math.sin(t * 0.5 + b * 0.1) * 0.15;

      posArr[base] = pa.x;
      posArr[base + 1] = pa.y + floatA;
      posArr[base + 2] = pa.z;
      posArr[base + 3] = pb.x;
      posArr[base + 4] = pb.y + floatB;
      posArr[base + 5] = pb.z;

      const glow = Math.max(glowRef.current[a], glowRef.current[b]);
      tmpColor.copy(VIOLET_DEEP).lerp(VIOLET_BRIGHT, glow * 0.7 + 0.15);
      colArr[base] = tmpColor.r;
      colArr[base + 1] = tmpColor.g;
      colArr[base + 2] = tmpColor.b;
      colArr[base + 3] = tmpColor.r;
      colArr[base + 4] = tmpColor.g;
      colArr[base + 5] = tmpColor.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function Pulses({ network, glowRef, scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const pulseData = useMemo(() => {
    return Array.from({ length: PULSE_COUNT }, () => ({
      edgeIdx: Math.floor(Math.random() * network.edges.length),
      t: Math.random(),
      speed: 0.2 + Math.random() * 0.7,
      forward: Math.random() > 0.5,
      colorMix: Math.random(),
    }));
  }, [network]);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    for (let i = 0; i < PULSE_COUNT; i++) {
      const pd = pulseData[i];
      pd.t += dt * pd.speed * (pd.forward ? 1 : -1);

      if (pd.t > 1 || pd.t < 0) {
        const destNode = pd.forward
          ? network.edges[pd.edgeIdx][1]
          : network.edges[pd.edgeIdx][0];
        glowRef.current[destNode] = 1.0;

        pd.edgeIdx = Math.floor(Math.random() * network.edges.length);
        pd.t = pd.forward ? 0 : 1;
        pd.forward = Math.random() > 0.5;
        pd.colorMix = Math.random();
      }

      const [a, b] = network.edges[pd.edgeIdx];
      const pa = network.positions[a];
      const pb = network.positions[b];
      const floatA = Math.sin(time * 0.5 + a * 0.1) * 0.15;
      const floatB = Math.sin(time * 0.5 + b * 0.1) * 0.15;

      tmpVec.set(
        pa.x + (pb.x - pa.x) * pd.t,
        pa.y + floatA + (pb.y + floatB - pa.y - floatA) * pd.t,
        pa.z + (pb.z - pa.z) * pd.t,
      );

      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(0.035 + Math.sin(pd.t * Math.PI) * 0.025);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(VIOLET_GLOW).lerp(WHITE_HOT, pd.colorMix * 0.6);
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
        opacity={0.95}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function FloatingParticles({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 200;

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: Math.random() * 8 - 4,
      z: (Math.random() - 0.5) * 20,
      speed: 0.1 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      size: 0.01 + Math.random() * 0.03,
    }));
  }, []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.8,
        p.z + Math.sin(t * p.speed * 0.5 + p.phase * 2) * 0.3,
      );
      const flicker = 0.5 + Math.sin(t * 3 + p.phase) * 0.5;
      dummy.scale.setScalar(p.size * flicker);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#c084fc"
        transparent
        opacity={0.6}
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
      glowRef.current[i] = Math.max(0, glowRef.current[i] - dt * 1.5);
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
      if (dist < 2.5) {
        glowRef.current[i] = Math.min(1, glowRef.current[i] + 0.15);
      }
    }
  });

  return null;
}

function CameraController({ scrollProgress }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const z = 10 + scrollProgress.current * 12;
    const breathe = Math.sin(t * 0.15) * 0.3;
    camera.position.z += (z - camera.position.z) * 0.03;
    camera.position.y += (1.5 + breathe - camera.position.y) * 0.02;
    camera.position.x += (Math.sin(t * 0.08) * 1.5 - camera.position.x) * 0.015;
    camera.lookAt(0, -1, -2);
  });
  return null;
}

function VolumetricRays() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      child.material.opacity = 0.03 + Math.sin(t * 0.5 + i * 1.2) * 0.02;
    });
  });

  const rays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      position: [(i - 2) * 3, 4, -8],
      rotation: [0, 0, (i - 2) * 0.15],
      scale: [0.02, 12, 1],
    }));
  }, []);

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh key={i} position={ray.position} rotation={ray.rotation} scale={ray.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#7c3aed"
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function NeuralMeshScene() {
  const scrollProgress = useRef(0);
  const glowRef = useRef(new Float32Array(NODE_COUNT));
  const network = useMemo(() => generateNetwork(), []);

  useFrame(() => {
    const t =
      (window.scrollY || 0) /
      (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;
  });

  return (
    <>
      <fog attach="fog" args={["#050010", 8, 35]} />
      <ambientLight intensity={0.06} color="#1a0533" />

      <pointLight position={[6, 5, 4]} intensity={0.7} color="#7c3aed" distance={25} />
      <pointLight position={[-5, 3, 2]} intensity={0.5} color="#a855f7" distance={20} />
      <pointLight position={[0, -2, -6]} intensity={0.4} color="#6366f1" distance={18} />
      <pointLight position={[3, 8, -3]} intensity={0.3} color="#c084fc" distance={22} />
      <pointLight position={[-4, -1, 8]} intensity={0.25} color="#818cf8" distance={15} />

      <CameraController scrollProgress={scrollProgress} />
      <GlowUpdater glowRef={glowRef} />
      <MouseInteraction network={network} glowRef={glowRef} />

      <TerrainSolid scrollProgress={scrollProgress} />
      <TerrainMesh scrollProgress={scrollProgress} />

      <NetworkNodes
        network={network}
        glowRef={glowRef}
        scrollProgress={scrollProgress}
      />
      <NetworkEdges
        network={network}
        glowRef={glowRef}
        scrollProgress={scrollProgress}
      />
      <Pulses
        network={network}
        glowRef={glowRef}
        scrollProgress={scrollProgress}
      />

      <FloatingParticles scrollProgress={scrollProgress} />
      <VolumetricRays />

      <Sparkles
        count={500}
        scale={28}
        size={1.8}
        speed={0.12}
        opacity={0.35}
        color="#a855f7"
      />
      <Sparkles
        count={200}
        scale={20}
        size={0.8}
        speed={0.08}
        opacity={0.2}
        color="#6366f1"
      />
    </>
  );
}
