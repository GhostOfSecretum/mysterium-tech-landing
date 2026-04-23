import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const INNER_PETALS = 8;
const MID_PETALS = 12;
const OUTER_PETALS = 16;
const SPARKLE_COUNT = 100;
const ORBIT_PETAL_COUNT = 40;

function RoseBud({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const innerRefs = useRef([]);
  const midRefs = useRef([]);
  const outerRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.08 + mousePos.current.x * 0.4;
      groupRef.current.rotation.x = -0.2 + mousePos.current.y * 0.2;
      const s = 1 + scroll * 0.1;
      groupRef.current.scale.setScalar(s);
    }

    const bloom = 0.3 + scroll * 0.7 + Math.sin(t * 0.5) * 0.05;

    innerRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / INNER_PETALS) * Math.PI * 2;
      const openness = bloom * 0.4;
      mesh.rotation.set(openness + 0.1, angle, 0);
      mesh.position.set(
        Math.cos(angle) * 0.15 * bloom,
        0.2 - openness * 0.15,
        Math.sin(angle) * 0.15 * bloom,
      );
    });

    midRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / MID_PETALS) * Math.PI * 2 + 0.25;
      const openness = bloom * 0.7;
      mesh.rotation.set(openness + 0.3, angle, 0);
      mesh.position.set(
        Math.cos(angle) * 0.35 * bloom,
        -0.05 - openness * 0.12,
        Math.sin(angle) * 0.35 * bloom,
      );
    });

    outerRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const angle = (i / OUTER_PETALS) * Math.PI * 2 + 0.15;
      const openness = bloom * 1.1;
      mesh.rotation.set(openness + 0.6 + Math.sin(t * 0.8 + i) * 0.03, angle, 0);
      mesh.position.set(
        Math.cos(angle) * 0.6 * bloom,
        -0.25 - openness * 0.1,
        Math.sin(angle) * 0.6 * bloom,
      );
    });
  });

  const petalGeom = (sx, sy, sz) => [sx, sy, sz];

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshPhysicalMaterial color="#d4a030" roughness={0.55} metalness={0.1} />
      </mesh>

      {Array.from({ length: INNER_PETALS }, (_, i) => (
        <mesh
          key={`in-${i}`}
          ref={(el) => { innerRefs.current[i] = el; }}
          scale={petalGeom(0.28, 0.06, 0.35)}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshPhysicalMaterial
            color="#c22050"
            roughness={0.3}
            metalness={0.02}
            envMapIntensity={1.4}
            clearcoat={0.4}
            clearcoatRoughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {Array.from({ length: MID_PETALS }, (_, i) => (
        <mesh
          key={`mid-${i}`}
          ref={(el) => { midRefs.current[i] = el; }}
          scale={petalGeom(0.35, 0.05, 0.45)}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshPhysicalMaterial
            color="#d43060"
            roughness={0.32}
            metalness={0.02}
            envMapIntensity={1.3}
            clearcoat={0.3}
            clearcoatRoughness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {Array.from({ length: OUTER_PETALS }, (_, i) => (
        <mesh
          key={`out-${i}`}
          ref={(el) => { outerRefs.current[i] = el; }}
          scale={petalGeom(0.42, 0.04, 0.55)}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshPhysicalMaterial
            color="#e04070"
            roughness={0.35}
            metalness={0.02}
            envMapIntensity={1.2}
            clearcoat={0.25}
            clearcoatRoughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh position={[0, -1.5, 0]} rotation={[0.03, 0, 0.02]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshPhysicalMaterial color="#2d6e35" roughness={0.5} metalness={0.05} />
      </mesh>

      {[-0.6, -1.1].map((y, i) => (
        <mesh
          key={i}
          position={[(i === 0 ? 0.3 : -0.25), y, (i === 0 ? 0.1 : -0.1)]}
          rotation={[0.15, i * 2, i === 0 ? 0.5 : -0.6]}
          scale={[0.35, 0.08, 0.2]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshPhysicalMaterial color="#3a8a42" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitPetals({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const petals = useMemo(
    () =>
      Array.from({ length: ORBIT_PETAL_COUNT }, () => ({
        orbit: 2.5 + Math.random() * 4.5,
        speed: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        inclination: (Math.random() - 0.5) * 1.2,
        size: 0.05 + Math.random() * 0.12,
        tumble: 0.5 + Math.random() * 2,
      })),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(ORBIT_PETAL_COUNT * 3);
    const c = new THREE.Color();
    const petalColors = ["#e84070", "#f2a0b5", "#d94f72", "#f5c6d0", "#c87adb", "#f8e8e0"];
    for (let i = 0; i < ORBIT_PETAL_COUNT; i++) {
      c.set(petalColors[Math.floor(Math.random() * petalColors.length)]);
      c.toArray(arr, i * 3);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < ORBIT_PETAL_COUNT; i++) {
      const p = petals[i];
      const angle = t * p.speed + p.phase + scroll * 1.5;
      const r = p.orbit + scroll * 1.2;
      dummy.position.set(
        Math.cos(angle) * r * Math.cos(p.inclination),
        Math.sin(p.inclination) * r * 0.5 + Math.sin(t * 0.6 + p.phase) * 0.4,
        Math.sin(angle) * r * Math.cos(p.inclination),
      );
      dummy.rotation.set(
        t * p.tumble + p.phase,
        t * p.tumble * 0.6,
        Math.sin(t + p.phase) * 0.5,
      );
      dummy.scale.set(p.size * 2.5, p.size * 0.5, p.size * 1.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, ORBIT_PETAL_COUNT]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshPhysicalMaterial
        vertexColors
        roughness={0.4}
        metalness={0.02}
        envMapIntensity={1}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      >
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </meshPhysicalMaterial>
    </instancedMesh>
  );
}

function Sparkles() {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 10,
        speed: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        size: 0.01 + Math.random() * 0.03,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const p = particles[i];
      dummy.position.set(p.x, p.y, p.z);
      const pulse = Math.max(0, Math.sin(t * p.speed + p.phase));
      dummy.scale.setScalar(p.size * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, SPARKLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#ffe8f0"
        transparent
        opacity={0.6}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function RoseBloomScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const next = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (next - scrollProgress.current) * 0.04;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.06;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.06;
  });

  return (
    <>
      <Environment preset="sunset" />
      <fog attach="fog" args={["#120810", 8, 28]} />

      <ambientLight intensity={0.2} color="#ffe0e8" />
      <directionalLight position={[3, 10, 5]} intensity={1.3} color="#fff0e0" castShadow />
      <pointLight position={[-4, 3, -3]} intensity={0.6} color="#f080a0" distance={18} />
      <pointLight position={[3, -2, 4]} intensity={0.4} color="#d0a0f0" distance={14} />
      <spotLight
        position={[0, 8, 2]}
        angle={0.25}
        penumbra={0.9}
        intensity={0.8}
        color="#ffe0d0"
      />

      <RoseBud scrollProgress={scrollProgress} mousePos={mousePos} />
      <OrbitPetals scrollProgress={scrollProgress} />
      <Sparkles />
    </>
  );
}
