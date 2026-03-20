import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 200;
const EDGE_LIMIT = 600;
const PULSE_COUNT = 120;
const BASE_COLOR = new THREE.Color("#3d6bff");
const GLOW_COLOR = new THREE.Color("#00e59e");

function generateNetwork() {
  const positions = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 2.5 + Math.pow(Math.random(), 0.55) * 6.5;
    positions.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ),
    );
  }

  const edges = [];
  for (let i = 0; i < NODE_COUNT && edges.length < EDGE_LIMIT; i++) {
    const nearby = [];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const d = positions[i].distanceTo(positions[j]);
      if (d < 4.2) nearby.push({ j, d });
    }
    nearby.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(nearby.length, 4) && edges.length < EDGE_LIMIT; k++) {
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
    const spread = 1 + scrollProgress.current * 2.5;

    for (let i = 0; i < NODE_COUNT; i++) {
      const p = network.positions[i];
      const g = glowRef.current[i];
      const scale = 0.08 + g * 0.22;

      dummy.position.set(p.x, p.y / spread, p.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(BASE_COLOR).lerp(GLOW_COLOR, g);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 10, 10]} />
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

function NetworkEdges({ network, glowRef, scrollProgress }) {
  const lineRef = useRef();
  const positionsAttr = useRef();
  const colorsAttr = useRef();
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const { geometry } = useMemo(() => {
    const count = network.edges.length;
    const pos = new Float32Array(count * 6);
    const col = new Float32Array(count * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { geometry: geo, posArr: pos, colArr: col };
  }, [network]);

  useFrame(() => {
    const geo = lineRef.current?.geometry;
    if (!geo) return;
    const posArr = geo.attributes.position.array;
    const colArr = geo.attributes.color.array;
    const spread = 1 + scrollProgress.current * 2.5;

    for (let i = 0; i < network.edges.length; i++) {
      const [a, b] = network.edges[i];
      const pa = network.positions[a];
      const pb = network.positions[b];
      const base = i * 6;

      posArr[base] = pa.x;
      posArr[base + 1] = pa.y / spread;
      posArr[base + 2] = pa.z;
      posArr[base + 3] = pb.x;
      posArr[base + 4] = pb.y / spread;
      posArr[base + 5] = pb.z;

      const glow = Math.max(glowRef.current[a], glowRef.current[b]);
      tmpColor.copy(BASE_COLOR).lerp(GLOW_COLOR, glow);
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
        opacity={0.4}
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

  const pulseData = useMemo(() => {
    return Array.from({ length: PULSE_COUNT }, () => ({
      edgeIdx: Math.floor(Math.random() * network.edges.length),
      t: Math.random(),
      speed: 0.3 + Math.random() * 0.8,
      forward: Math.random() > 0.5,
    }));
  }, [network]);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const spread = 1 + scrollProgress.current * 2.5;

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
      }

      const [a, b] = network.edges[pd.edgeIdx];
      const pa = network.positions[a];
      const pb = network.positions[b];
      tmpVec.lerpVectors(pa, pb, pd.t);
      tmpVec.y /= spread;

      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(0.05);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, PULSE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#00e59e"
        transparent
        opacity={0.95}
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
      glowRef.current[i] = Math.max(0, glowRef.current[i] - dt * 1.8);
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

  useFrame(() => {
    raycaster.setFromCamera(mouseNDC.current, camera);
    const ray = raycaster.ray;
    for (let i = 0; i < NODE_COUNT; i++) {
      const dist = ray.distanceToPoint(network.positions[i]);
      if (dist < 2.2) {
        glowRef.current[i] = Math.min(1, glowRef.current[i] + 0.12);
      }
    }
  });

  if (typeof window !== "undefined") {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  return null;
}

function RotatingGroup({ children, scrollProgress }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.04;
    groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.1;
  });

  return <group ref={groupRef}>{children}</group>;
}

function CameraController({ scrollProgress }) {
  useFrame(({ camera }) => {
    const z = 14 + scrollProgress.current * 14;
    camera.position.z += (z - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function NeuralPulseScene() {
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
      <fog attach="fog" args={["#05050a", 15, 55]} />
      <ambientLight intensity={0.08} />
      <pointLight position={[10, 6, 10]} intensity={0.5} color="#00e59e" />
      <pointLight position={[-8, -5, 6]} intensity={0.35} color="#3d6bff" />
      <pointLight position={[0, 8, -5]} intensity={0.2} color="#a29bfe" />

      <CameraController scrollProgress={scrollProgress} />
      <GlowUpdater glowRef={glowRef} />
      <MouseInteraction network={network} glowRef={glowRef} />

      <RotatingGroup scrollProgress={scrollProgress}>
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
      </RotatingGroup>

      <Sparkles
        count={400}
        scale={30}
        size={1.2}
        speed={0.15}
        opacity={0.25}
        color="#3d6bff"
      />
    </>
  );
}
