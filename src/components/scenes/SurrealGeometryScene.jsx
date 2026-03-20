import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function PenroseTriangle({ position, scale, speed, scrollProgress }) {
  const groupRef = useRef();

  const segments = useMemo(() => {
    const segs = [];
    const size = 2;
    const thickness = 0.3;
    const vertices = [
      [0, size * 1.15, 0],
      [-size, -size * 0.6, 0],
      [size, -size * 0.6, 0],
    ];

    for (let i = 0; i < 3; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % 3];
      segs.push({ start, end, index: i });
    }
    return segs;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * speed;
      groupRef.current.rotation.x = Math.sin(t * speed * 0.5) * 0.15;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.4) * 0.3;
    }
  });

  const colors = ["#e8ddd0", "#d0c4b8", "#c0b4a8"];

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {segments.map((seg, i) => {
        const start = new THREE.Vector3(...seg.start);
        const end = new THREE.Vector3(...seg.end);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();
        const angle = Math.atan2(dir.y, dir.x);

        return (
          <group key={i}>
            <mesh position={[mid.x, mid.y, mid.z]} rotation={[0, 0, angle]}>
              <boxGeometry args={[len, 0.35, 0.35]} />
              <meshPhysicalMaterial
                color={colors[i]}
                metalness={0.15}
                roughness={0.6}
                envMapIntensity={0.8}
              />
            </mesh>
            <mesh position={[mid.x, mid.y, mid.z]} rotation={[0, 0, angle]}>
              <boxGeometry args={[len + 0.02, 0.37, 0.37]} />
              <meshBasicMaterial
                color={colors[i]}
                wireframe
                transparent
                opacity={0.08}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function MoebiusStrip({ position, scale, speed }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const segments = 200;
    const width = 0.4;
    const radius = 2;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      for (let j = 0; j <= 1; j++) {
        const s = (j - 0.5) * width;
        const halfTwist = t / 2;

        const x = (radius + s * Math.cos(halfTwist)) * Math.cos(t);
        const y = (radius + s * Math.cos(halfTwist)) * Math.sin(t);
        const z = s * Math.sin(halfTwist);

        positions.push(x, y, z);
        normals.push(
          Math.cos(t) * Math.cos(halfTwist),
          Math.sin(t) * Math.cos(halfTwist),
          Math.sin(halfTwist),
        );
        uvs.push(i / segments, j);
      }
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * speed;
      meshRef.current.rotation.z = t * speed * 0.3;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef} geometry={geometry} castShadow>
        <meshPhysicalMaterial
          color="#c8beb4"
          metalness={0.3}
          roughness={0.4}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function ImpossibleStaircase({ position, scale, scrollProgress }) {
  const groupRef = useRef();
  const stepCount = 16;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.06;
    }
  });

  const steps = useMemo(() => {
    const s = [];
    for (let i = 0; i < stepCount; i++) {
      const angle = (i / stepCount) * Math.PI * 2;
      const r = 2.5;
      const height = (i / stepCount) * 3;
      const loopHeight = height % 3;
      s.push({
        pos: [Math.cos(angle) * r, loopHeight - 1.5, Math.sin(angle) * r],
        rot: [0, -angle, 0],
      });
    }
    return s;
  }, []);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {steps.map((step, i) => (
        <mesh key={i} position={step.pos} rotation={step.rot} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.15, 0.6]} />
          <meshPhysicalMaterial
            color={i % 2 === 0 ? "#d8d0c4" : "#c0b8ac"}
            metalness={0.1}
            roughness={0.7}
            envMapIntensity={0.6}
          />
        </mesh>
      ))}
      {steps.map((step, i) => {
        const next = steps[(i + 1) % stepCount];
        return (
          <mesh
            key={`rail-${i}`}
            position={[
              (step.pos[0] + next.pos[0]) / 2,
              (step.pos[1] + next.pos[1]) / 2 + 0.5,
              (step.pos[2] + next.pos[2]) / 2,
            ]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
            <meshPhysicalMaterial color="#a09888" metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloatingArch({ position, rotation, scale, speed }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * speed) * 0.4;
      meshRef.current.rotation.y = rotation[1] + t * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale} castShadow>
      <torusGeometry args={[1.5, 0.15, 16, 32, Math.PI]} />
      <meshPhysicalMaterial
        color="#d4ccc0"
        metalness={0.2}
        roughness={0.5}
        envMapIntensity={1}
      />
    </mesh>
  );
}

function ParadoxCube({ position, scale, speed }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.x = t * speed;
      groupRef.current.rotation.y = t * speed * 0.7;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.3;
    }
  });

  const edges = useMemo(() => {
    const e = [];
    const s = 1;
    const vertices = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
      [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
    ];
    const edgeIndices = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    edgeIndices.forEach(([a, b]) => {
      const start = new THREE.Vector3(...vertices[a]);
      const end = new THREE.Vector3(...vertices[b]);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      e.push({ mid, len, dir: dir.normalize() });
    });
    return e;
  }, []);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {edges.map((edge, i) => {
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), edge.dir);
        return (
          <mesh key={i} position={edge.mid} quaternion={quaternion}>
            <cylinderGeometry args={[0.04, 0.04, edge.len, 8]} />
            <meshPhysicalMaterial
              color="#b8b0a4"
              metalness={0.4}
              roughness={0.3}
              envMapIntensity={1.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function AmbientMotes() {
  const pointsRef = useRef();
  const count = 250;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.1) * 0.002;
      arr[i * 3] += Math.cos(t * 0.15 + i * 0.05) * 0.001;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#d0c8b8"
        size={0.035}
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function SurrealGeometryScene() {
  const scrollProgress = useRef(0);

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
  });

  return (
    <>
      <Environment preset="dawn" />
      <fog attach="fog" args={["#e8e0d4", 10, 40]} />

      <ambientLight intensity={0.3} color="#f0e8dc" />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.8}
        color="#fff5e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.001}
      />
      <pointLight position={[-5, 4, 3]} intensity={0.4} color="#e0d0c0" distance={18} />

      <PenroseTriangle position={[0, 1, 0]} scale={1.3} speed={0.08} scrollProgress={scrollProgress} />
      <MoebiusStrip position={[-4, 0, -2]} scale={0.7} speed={0.06} />
      <ImpossibleStaircase position={[4, -1, -1]} scale={0.6} scrollProgress={scrollProgress} />

      <FloatingArch position={[-2, 3, -3]} rotation={[0, 0.5, 0]} scale={0.8} speed={0.4} />
      <FloatingArch position={[3, 2.5, -4]} rotation={[0.3, -0.3, 0]} scale={0.6} speed={0.5} />

      <ParadoxCube position={[-5, 2, 1]} scale={0.7} speed={0.05} />
      <ParadoxCube position={[5, -1, -3]} scale={0.5} speed={0.07} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.9} metalness={0} />
      </mesh>

      <AmbientMotes />
    </>
  );
}
