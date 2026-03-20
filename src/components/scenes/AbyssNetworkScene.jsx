import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 500;
const EDGE_LIMIT = 1600;
const PULSE_COUNT = 300;
const CLUSTER_COUNT = 8;

const ABYSS = new THREE.Color("#010610");
const DEEP_BLUE = new THREE.Color("#082848");
const BIO_TEAL = new THREE.Color("#0d8090");
const BIO_CYAN = new THREE.Color("#40e0d0");
const BIO_GOLD = new THREE.Color("#d4a030");
const PALE_BLUE = new THREE.Color("#a0d8e8");
const WHITE_CORE = new THREE.Color("#e0f4ff");

function fbm3(x, y, z) {
  let v = 0, a = 1, f = 1;
  for (let i = 0; i < 4; i++) {
    v += a * (Math.sin(x * f * 1.3 + z * f * 0.7) * 0.4 +
      Math.cos(y * f * 1.1 - x * f * 0.9) * 0.35 +
      Math.sin((x + y + z) * f * 0.8) * 0.25);
    a *= 0.5;
    f *= 2.0;
  }
  return v;
}

function generateClusters() {
  const clusters = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    clusters.push({
      center: new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 14 - 4,
      ),
      radius: 2 + Math.random() * 3,
      density: 0.6 + Math.random() * 0.4,
    });
  }
  return clusters;
}

function generateNetwork(clusters) {
  const positions = [];

  for (let c = 0; c < clusters.length; c++) {
    const cl = clusters[c];
    const nodesInCluster = Math.floor(NODE_COUNT / CLUSTER_COUNT * cl.density);
    for (let i = 0; i < nodesInCluster && positions.length < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = Math.pow(Math.random(), 0.6) * cl.radius;
      const x = cl.center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = cl.center.y + r * Math.sin(phi) * Math.sin(theta);
      const z = cl.center.z + r * Math.cos(phi);
      positions.push(new THREE.Vector3(x, y, z));
    }
  }

  while (positions.length < NODE_COUNT) {
    positions.push(new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 20 - 4,
    ));
  }

  const edges = [];
  for (let i = 0; i < NODE_COUNT && edges.length < EDGE_LIMIT; i++) {
    const nearby = [];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const d = positions[i].distanceTo(positions[j]);
      if (d < 3.2) nearby.push({ j, d });
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

  const nodeData = useMemo(() =>
    Array.from({ length: NODE_COUNT }, () => ({
      type: Math.random(),
      breathePhase: Math.random() * Math.PI * 2,
      breatheSpeed: 0.8 + Math.random() * 1.5,
    })), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const nd = nodeData[i];
      const breathe = Math.sin(t * nd.breatheSpeed + nd.breathePhase);
      const isHub = nd.type > 0.9;
      const baseSize = isHub ? 0.08 : 0.025;
      const scale = baseSize + g * 0.15 + breathe * 0.01;

      dummy.position.set(
        p.x + Math.sin(t * 0.15 + i * 0.1) * 0.04,
        p.y + breathe * 0.08,
        p.z + Math.cos(t * 0.12 + i * 0.08) * 0.03,
      );
      dummy.scale.setScalar(Math.max(0.01, scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (isHub) {
        tmpColor.copy(BIO_GOLD).lerp(WHITE_CORE, g * 0.6 + breathe * 0.1);
      } else if (nd.type > 0.6) {
        tmpColor.copy(BIO_CYAN).lerp(WHITE_CORE, g * 0.5);
      } else if (nd.type > 0.3) {
        tmpColor.copy(BIO_TEAL).lerp(PALE_BLUE, g * 0.6);
      } else {
        tmpColor.copy(DEEP_BLUE).lerp(BIO_TEAL, g * 0.8 + 0.15);
      }
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 14, 14]} />
      <meshBasicMaterial
        transparent
        opacity={0.92}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function NodeGlowRings({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const nodeData = useMemo(() =>
    Array.from({ length: NODE_COUNT }, () => ({
      type: Math.random(),
    })), []);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const isHub = nodeData[i].type > 0.9;

      if (g < 0.2 && !isHub) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const ringSize = isHub ? 0.3 + Math.sin(t * 2 + i) * 0.08 : g * 0.35;
      dummy.position.set(
        p.x + Math.sin(t * 0.15 + i * 0.1) * 0.04,
        p.y + Math.sin(t * (0.8 + nodeData[i].type) + nodeData[i].type * 3) * 0.08,
        p.z + Math.cos(t * 0.12 + i * 0.08) * 0.03,
      );
      dummy.scale.setScalar(ringSize);
      dummy.rotation.set(
        Math.sin(t * 0.5 + i) * 0.5,
        t * 0.3 + i,
        Math.cos(t * 0.4 + i) * 0.3,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.set(isHub ? "#d4a030" : "#40e0d0");
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <torusGeometry args={[1, 0.02, 8, 32]} />
      <meshBasicMaterial
        transparent
        opacity={0.15}
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
      const pa = network.positions[a], pb = network.positions[b];
      const base = i * 6;

      const fA = Math.sin(t * (0.8 + (a % 5) * 0.1) + a * 0.1) * 0.08;
      const fB = Math.sin(t * (0.8 + (b % 5) * 0.1) + b * 0.1) * 0.08;

      posArr[base] = pa.x + Math.sin(t * 0.15 + a * 0.1) * 0.04;
      posArr[base + 1] = pa.y + fA;
      posArr[base + 2] = pa.z;
      posArr[base + 3] = pb.x + Math.sin(t * 0.15 + b * 0.1) * 0.04;
      posArr[base + 4] = pb.y + fB;
      posArr[base + 5] = pb.z;

      const glow = Math.max(glowRef.current[a], glowRef.current[b]);
      const dist = pa.distanceTo(pb);
      const fade = THREE.MathUtils.clamp(1 - dist / 3.2, 0.05, 1);

      tmpColor.copy(ABYSS).lerp(BIO_TEAL, glow * 0.5 + fade * 0.12);
      const b2 = fade * (0.3 + glow * 0.7);
      colArr[base] = tmpColor.r * b2;
      colArr[base + 1] = tmpColor.g * b2;
      colArr[base + 2] = tmpColor.b * b2;
      colArr[base + 3] = tmpColor.r * b2;
      colArr[base + 4] = tmpColor.g * b2;
      colArr[base + 5] = tmpColor.b * b2;
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

function Pulses({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const pulseData = useMemo(() =>
    Array.from({ length: PULSE_COUNT }, () => ({
      edgeIdx: Math.floor(Math.random() * network.edges.length),
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.5,
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
      tmpVec.lerpVectors(pa, pb, pd.t);
      tmpVec.y += Math.sin(time * 0.8 + i * 0.2) * 0.05;

      const arc = Math.sin(pd.t * Math.PI);
      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(0.018 + arc * 0.022);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (pd.colorType > 0.8) {
        tmpColor.copy(BIO_GOLD).lerp(WHITE_CORE, arc * 0.5);
      } else if (pd.colorType > 0.4) {
        tmpColor.copy(BIO_CYAN).lerp(WHITE_CORE, arc * 0.4);
      } else {
        tmpColor.copy(PALE_BLUE).lerp(WHITE_CORE, arc * 0.3);
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
        opacity={0.88}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function LightShafts() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      child.material.opacity = 0.012 + Math.sin(t * 0.2 + i * 1.1) * 0.008;
      child.position.y = 6 + Math.sin(t * 0.15 + i * 0.5) * 0.5;
    });
  });

  const shafts = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      x: (i - 4) * 2.2 + (Math.random() - 0.5) * 1.5,
      z: -8 + Math.random() * 4,
      width: 0.04 + Math.random() * 0.06,
      height: 20 + Math.random() * 8,
      color: Math.random() > 0.7 ? "#d4a030" : "#0d8090",
    })), []);

  return (
    <group ref={groupRef}>
      {shafts.map((s, i) => (
        <mesh key={i} position={[s.x, 6, s.z]} scale={[s.width, s.height, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={s.color}
            transparent
            opacity={0.015}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function DeepFog() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.material.opacity = 0.06 + Math.sin(t * 0.15) * 0.02;
    meshRef.current.position.y = -5 + Math.sin(t * 0.1) * 0.5;
  });

  return (
    <mesh ref={meshRef} position={[0, -5, -6]} rotation={[-Math.PI * 0.5, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial
        color="#082848"
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GlowUpdater({ glowRef }) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < NODE_COUNT; i++) {
      glowRef.current[i] = Math.max(0, glowRef.current[i] - dt * 1.1);
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
        const strength = 1 - dist / 2.5;
        glowRef.current[i] = Math.min(1, glowRef.current[i] + strength * 0.18);
      }
    }
  });

  return null;
}

function CameraController({ scrollProgress }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const z = 11 + scrollProgress.current * 12;

    const orbitX = Math.sin(t * 0.04) * 2.5;
    const orbitY = 0.5 + Math.sin(t * 0.06) * 1.2;
    const driftZ = Math.cos(t * 0.03) * 0.8;

    camera.position.x += (orbitX - camera.position.x) * 0.008;
    camera.position.y += (orbitY - camera.position.y) * 0.01;
    camera.position.z += (z + driftZ - camera.position.z) * 0.02;
    camera.lookAt(0, -0.5, -3);
  });
  return null;
}

export default function AbyssNetworkScene() {
  const scrollProgress = useRef(0);
  const glowRef = useRef(new Float32Array(NODE_COUNT));
  const clusters = useMemo(() => generateClusters(), []);
  const network = useMemo(() => generateNetwork(clusters), [clusters]);

  useFrame(() => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
  });

  return (
    <>
      <fog attach="fog" args={["#010610", 5, 28]} />
      <ambientLight intensity={0.025} color="#061830" />

      <pointLight position={[4, 3, 2]} intensity={0.55} color="#0d8090" distance={20} decay={2} />
      <pointLight position={[-3, 1, -2]} intensity={0.4} color="#40e0d0" distance={16} decay={2} />
      <pointLight position={[1, -3, -6]} intensity={0.35} color="#082848" distance={22} decay={2} />
      <pointLight position={[-2, 5, 0]} intensity={0.25} color="#d4a030" distance={14} decay={2} />
      <pointLight position={[5, -1, 5]} intensity={0.2} color="#a0d8e8" distance={18} decay={2} />
      <pointLight position={[0, 0, -10]} intensity={0.3} color="#0d8090" distance={25} decay={2} />

      <CameraController scrollProgress={scrollProgress} />
      <GlowUpdater glowRef={glowRef} />
      <MouseInteraction network={network} glowRef={glowRef} />

      <NetworkNodes network={network} glowRef={glowRef} />
      <NodeGlowRings network={network} glowRef={glowRef} />
      <NetworkEdges network={network} glowRef={glowRef} />
      <Pulses network={network} glowRef={glowRef} />

      <LightShafts />
      <DeepFog />

      <Sparkles count={700} scale={30} size={1.2} speed={0.06} opacity={0.2} color="#0d8090" />
      <Sparkles count={300} scale={24} size={0.5} speed={0.04} opacity={0.1} color="#d4a030" />
      <Sparkles count={200} scale={18} size={2.0} speed={0.03} opacity={0.08} color="#40e0d0" />
    </>
  );
}
