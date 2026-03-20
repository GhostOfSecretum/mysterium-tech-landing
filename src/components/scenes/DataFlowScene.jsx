import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const STREAM_COUNT = 24;
const PARTICLES_PER_STREAM = 40;
const TOTAL_PARTICLES = STREAM_COUNT * PARTICLES_PER_STREAM;
const NODE_COUNT = 280;
const EDGE_LIMIT = 800;
const JUNCTION_PULSE_COUNT = 60;

const NAVY_DEEP = new THREE.Color("#010c1a");
const BLUE_MID = new THREE.Color("#0c3a5e");
const TEAL = new THREE.Color("#14829a");
const CYAN = new THREE.Color("#3dd8d8");
const WARM_ACCENT = new THREE.Color("#c8a84a");
const WHITE_GLOW = new THREE.Color("#d8f0ff");

function generateStreams() {
  const streams = [];
  for (let s = 0; s < STREAM_COUNT; s++) {
    const points = [];
    const segments = 6 + Math.floor(Math.random() * 4);
    let x = (Math.random() - 0.5) * 16;
    let y = (Math.random() - 0.5) * 8 - 2;
    let z = (Math.random() - 0.5) * 16 - 4;

    for (let i = 0; i < segments; i++) {
      points.push(new THREE.Vector3(x, y, z));
      x += (Math.random() - 0.5) * 4;
      y += (Math.random() - 0.5) * 2.5;
      z += (Math.random() - 0.5) * 4;
    }

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    streams.push({
      curve,
      speed: 0.08 + Math.random() * 0.2,
      width: 0.3 + Math.random() * 0.5,
      colorType: Math.random(),
    });
  }
  return streams;
}

function StreamLines({ streams }) {
  const groupRef = useRef();
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const lineData = useMemo(() =>
    streams.map((s) => {
      const pts = s.curve.getPoints(80);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return { geometry: geo, stream: s };
    }), [streams]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const pulse = 0.08 + Math.sin(t * 1.5 + i * 0.7) * 0.04;
      child.material.opacity = pulse;
    });
  });

  return (
    <group ref={groupRef}>
      {lineData.map((ld, i) => (
        <line key={i} geometry={ld.geometry}>
          <lineBasicMaterial
            color={ld.stream.colorType > 0.7 ? "#c8a84a" : ld.stream.colorType > 0.3 ? "#14829a" : "#0c3a5e"}
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}

function StreamParticles({ streams }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);

  const particleData = useMemo(() => {
    const data = [];
    for (let s = 0; s < STREAM_COUNT; s++) {
      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        data.push({
          streamIdx: s,
          offset: p / PARTICLES_PER_STREAM,
          speed: streams[s].speed * (0.7 + Math.random() * 0.6),
          lateralOffset: (Math.random() - 0.5) * streams[s].width * 0.3,
          size: 0.015 + Math.random() * 0.035,
        });
      }
    }
    return data;
  }, [streams]);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const pd = particleData[i];
      const stream = streams[pd.streamIdx];
      const progress = (pd.offset + t * pd.speed) % 1;

      stream.curve.getPointAt(progress, tmpVec);
      tmpVec.x += pd.lateralOffset;
      tmpVec.y += Math.sin(t * 2 + i * 0.3) * 0.03;

      const tailGlow = Math.sin(progress * Math.PI);
      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(pd.size * (0.5 + tailGlow * 0.5));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (stream.colorType > 0.7) {
        tmpColor.copy(WARM_ACCENT).lerp(WHITE_GLOW, tailGlow * 0.4);
      } else if (stream.colorType > 0.3) {
        tmpColor.copy(CYAN).lerp(WHITE_GLOW, tailGlow * 0.3);
      } else {
        tmpColor.copy(TEAL).lerp(WHITE_GLOW, tailGlow * 0.25);
      }
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, TOTAL_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.85}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function generateJunctionNetwork() {
  const positions = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    positions.push(new THREE.Vector3(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 10 - 1,
      (Math.random() - 0.5) * 18 - 4,
    ));
  }

  const edges = [];
  for (let i = 0; i < NODE_COUNT && edges.length < EDGE_LIMIT; i++) {
    const nearby = [];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const d = positions[i].distanceTo(positions[j]);
      if (d < 3.0) nearby.push({ j, d });
    }
    nearby.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(nearby.length, 4) && edges.length < EDGE_LIMIT; k++) {
      edges.push([i, nearby[k].j]);
    }
  }
  return { positions, edges };
}

function JunctionNodes({ network, glowRef }) {
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
      const scale = 0.02 + g * 0.1 + Math.sin(t * 1.5 + i * 0.4) * 0.008;

      dummy.position.set(
        p.x + Math.sin(t * 0.2 + i * 0.15) * 0.06,
        p.y + Math.sin(t * 0.3 + i * 0.12) * 0.08,
        p.z,
      );
      dummy.scale.setScalar(Math.max(0.01, scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(BLUE_MID).lerp(CYAN, g * 0.7 + 0.1);
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
        opacity={0.8}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function JunctionEdges({ network, glowRef }) {
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

      posArr[base] = pa.x + Math.sin(t * 0.2 + a * 0.15) * 0.06;
      posArr[base + 1] = pa.y + Math.sin(t * 0.3 + a * 0.12) * 0.08;
      posArr[base + 2] = pa.z;
      posArr[base + 3] = pb.x + Math.sin(t * 0.2 + b * 0.15) * 0.06;
      posArr[base + 4] = pb.y + Math.sin(t * 0.3 + b * 0.12) * 0.08;
      posArr[base + 5] = pb.z;

      const glow = Math.max(glowRef.current[a], glowRef.current[b]);
      tmpColor.copy(NAVY_DEEP).lerp(TEAL, glow * 0.5 + 0.06);
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
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function JunctionPulses({ network, glowRef }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);

  const pulseData = useMemo(() =>
    Array.from({ length: JUNCTION_PULSE_COUNT }, () => ({
      edgeIdx: Math.floor(Math.random() * network.edges.length),
      t: Math.random(),
      speed: 0.3 + Math.random() * 0.8,
      forward: Math.random() > 0.5,
    })), [network]);

  useFrame(({ clock }) => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dt = Math.min(clock.getDelta(), 0.05);

    for (let i = 0; i < JUNCTION_PULSE_COUNT; i++) {
      const pd = pulseData[i];
      pd.t += dt * pd.speed * (pd.forward ? 1 : -1);

      if (pd.t > 1 || pd.t < 0) {
        const dest = pd.forward ? network.edges[pd.edgeIdx][1] : network.edges[pd.edgeIdx][0];
        glowRef.current[dest] = 1.0;
        pd.edgeIdx = Math.floor(Math.random() * network.edges.length);
        pd.t = pd.forward ? 0 : 1;
        pd.forward = Math.random() > 0.5;
      }

      const [a, b] = network.edges[pd.edgeIdx];
      const pa = network.positions[a], pb = network.positions[b];
      tmpVec.lerpVectors(pa, pb, pd.t);

      dummy.position.copy(tmpVec);
      dummy.scale.setScalar(0.03 + Math.sin(pd.t * Math.PI) * 0.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, JUNCTION_PULSE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#3dd8d8"
        transparent
        opacity={0.9}
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
      glowRef.current[i] = Math.max(0, glowRef.current[i] - dt * 1.4);
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
      if (dist < 2.2) {
        glowRef.current[i] = Math.min(1, glowRef.current[i] + 0.12);
      }
    }
  });

  return null;
}

function CameraController({ scrollProgress }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const z = 12 + scrollProgress.current * 10;
    camera.position.x += (Math.sin(t * 0.06) * 2 - camera.position.x) * 0.01;
    camera.position.y += (1 + Math.sin(t * 0.1) * 0.5 - camera.position.y) * 0.012;
    camera.position.z += (z - camera.position.z) * 0.02;
    camera.lookAt(0, -1, -3);
  });
  return null;
}

export default function DataFlowScene() {
  const scrollProgress = useRef(0);
  const glowRef = useRef(new Float32Array(NODE_COUNT));
  const streams = useMemo(() => generateStreams(), []);
  const network = useMemo(() => generateJunctionNetwork(), []);

  useFrame(() => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
  });

  return (
    <>
      <fog attach="fog" args={["#010810", 8, 35]} />
      <ambientLight intensity={0.03} color="#0a1830" />

      <pointLight position={[5, 3, 2]} intensity={0.5} color="#14829a" distance={20} decay={2} />
      <pointLight position={[-4, 2, -3]} intensity={0.4} color="#3dd8d8" distance={18} decay={2} />
      <pointLight position={[0, -2, 5]} intensity={0.3} color="#0c3a5e" distance={22} decay={2} />
      <pointLight position={[3, 5, -6]} intensity={0.2} color="#c8a84a" distance={15} decay={2} />

      <CameraController scrollProgress={scrollProgress} />
      <GlowUpdater glowRef={glowRef} />
      <MouseInteraction network={network} glowRef={glowRef} />

      <StreamLines streams={streams} />
      <StreamParticles streams={streams} />

      <JunctionNodes network={network} glowRef={glowRef} />
      <JunctionEdges network={network} glowRef={glowRef} />
      <JunctionPulses network={network} glowRef={glowRef} />

      <Sparkles count={500} scale={28} size={1.2} speed={0.06} opacity={0.2} color="#14829a" />
      <Sparkles count={200} scale={20} size={0.5} speed={0.04} opacity={0.12} color="#c8a84a" />
    </>
  );
}
