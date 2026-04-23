import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const SATELLITE_COUNT = 60;

function CoreSphere({ scrollProgress, mousePos }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1 + mousePos.current.x * 0.4;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1 + mousePos.current.y * 0.3;
      const breathe = 1 + Math.sin(t * 0.8) * 0.03 + scroll * 0.12;
      meshRef.current.scale.setScalar(breathe);
    }

    if (glowRef.current) {
      glowRef.current.rotation.y = -t * 0.05;
      const s = 1.02 + Math.sin(t * 1.2) * 0.01;
      glowRef.current.scale.setScalar(s + scroll * 0.12);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[1.6, 128, 128]} />
        <meshPhysicalMaterial
          color="#d0d5de"
          metalness={1}
          roughness={0.02}
          envMapIntensity={3.5}
          clearcoat={1}
          clearcoatRoughness={0.01}
          reflectivity={1}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.65, 64, 64]} />
        <meshBasicMaterial
          color="#c8d0e0"
          wireframe
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OrbitalRing({ radius, tubeRadius, tilt, speed, phase, scrollProgress }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!meshRef.current) return;

    meshRef.current.rotation.z = tilt + Math.sin(t * 0.3 + phase) * 0.05;
    meshRef.current.rotation.y = t * speed + phase + scroll * 1.5;
    const s = 1 + scroll * 0.1;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, tubeRadius, 32, 200]} />
      <meshPhysicalMaterial
        color="#c4cad4"
        metalness={1}
        roughness={0.06}
        envMapIntensity={2.8}
        clearcoat={1}
        clearcoatRoughness={0.04}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function Satellites({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: SATELLITE_COUNT }, () => ({
        orbit: 2.8 + Math.random() * 5,
        speed: 0.15 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        inclination: (Math.random() - 0.5) * Math.PI * 0.7,
        size: 0.03 + Math.random() * 0.1,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < SATELLITE_COUNT; i++) {
      const p = particles[i];
      const angle = t * p.speed + p.phase + scroll * 2;
      const r = p.orbit + scroll * 1.2;
      dummy.position.set(
        Math.cos(angle) * r * Math.cos(p.inclination),
        Math.sin(p.inclination) * r * 0.4 + Math.sin(t * 0.6 + p.phase) * 0.3,
        Math.sin(angle) * r * Math.cos(p.inclination),
      );
      const pulse = p.size * (0.7 + Math.sin(t * 2.5 + p.phase) * 0.3);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, SATELLITE_COUNT]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshPhysicalMaterial
        color="#e0e6f0"
        metalness={1}
        roughness={0.05}
        envMapIntensity={3}
      />
    </instancedMesh>
  );
}

function MirrorFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.2, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshPhysicalMaterial color="#060810" metalness={1} roughness={0.18} envMapIntensity={0.8} />
    </mesh>
  );
}

export default function ChromeOrbitalScene() {
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
      <Environment preset="studio" />
      <fog attach="fog" args={["#08090e", 12, 38]} />

      <ambientLight intensity={0.08} />
      <directionalLight position={[10, 14, 6]} intensity={1.3} color="#e6ecf8" castShadow />
      <pointLight position={[-8, 3, -5]} intensity={0.4} color="#8a96b8" distance={22} />
      <pointLight position={[5, -3, 7]} intensity={0.3} color="#a4b0cc" distance={16} />

      <CoreSphere scrollProgress={scrollProgress} mousePos={mousePos} />

      <OrbitalRing radius={3.2} tubeRadius={0.04} tilt={0.3} speed={0.18} phase={0} scrollProgress={scrollProgress} />
      <OrbitalRing radius={4.0} tubeRadius={0.03} tilt={-0.5} speed={0.12} phase={1.2} scrollProgress={scrollProgress} />
      <OrbitalRing radius={5.0} tubeRadius={0.025} tilt={0.8} speed={0.08} phase={2.8} scrollProgress={scrollProgress} />

      <Satellites scrollProgress={scrollProgress} />
      <MirrorFloor />
    </>
  );
}
