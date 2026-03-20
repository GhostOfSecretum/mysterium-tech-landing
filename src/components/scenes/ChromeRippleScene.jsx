import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const RING_COUNT = 7;
const GLINT_COUNT = 90;

function RippleCore({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const shellRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.16 + mousePos.current.x * 0.3;
      groupRef.current.rotation.x = t * 0.09 + mousePos.current.y * 0.25;
    }

    if (shellRef.current) {
      const scale = 1 + scroll * 0.22 + Math.sin(t * 1.2) * 0.03;
      shellRef.current.scale.setScalar(scale);
    }

    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.22;
      innerRef.current.rotation.x = t * 0.15;
      innerRef.current.scale.setScalar(0.95 + scroll * 0.08);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={shellRef} castShadow receiveShadow>
        <icosahedronGeometry args={[2.1, 4]} />
        <meshPhysicalMaterial
          color="#cfd6de"
          metalness={1}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.03}
          envMapIntensity={3}
        />
      </mesh>

      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.45, 2]} />
        <meshPhysicalMaterial
          color="#f2f5f8"
          metalness={0.9}
          roughness={0.15}
          transmission={0.22}
          thickness={0.8}
          envMapIntensity={2.2}
        />
      </mesh>
    </group>
  );
}

function RippleRings({ scrollProgress }) {
  const groupRef = useRef();
  const rings = useMemo(
    () =>
      Array.from({ length: RING_COUNT }, (_, i) => ({
        radius: 3.1 + i * 0.65,
        speed: 0.14 + i * 0.03,
        wobble: 0.06 + i * 0.02,
        phase: i * 1.3,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((ring, i) => {
      const data = rings[i];
      ring.rotation.z = t * data.speed + i * 0.2;
      ring.rotation.y = Math.sin(t * data.speed + data.phase) * (0.2 + scroll * 0.35);
      ring.position.y = -1.2 + Math.sin(t * 0.7 + data.phase) * data.wobble + scroll * i * 0.16;

      const scale = 1 + scroll * (0.18 + i * 0.01);
      ring.scale.setScalar(scale);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ring.radius, 0.05 + i * 0.004, 24, 180]} />
          <meshPhysicalMaterial
            color={i % 2 ? "#c7ced6" : "#edf1f6"}
            metalness={1}
            roughness={0.08}
            transparent
            opacity={0.26}
            envMapIntensity={2.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function ChromeGlints({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(
    () =>
      Array.from({ length: GLINT_COUNT }, () => ({
        r: 2.4 + Math.random() * 7,
        speed: 0.2 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        y: (Math.random() - 0.5) * 3.5,
        size: 0.02 + Math.random() * 0.08,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < GLINT_COUNT; i++) {
      const p = data[i];
      const angle = t * p.speed + p.phase + scroll * 2.6;
      dummy.position.set(
        Math.cos(angle) * (p.r + scroll * 1.8),
        p.y + Math.sin(t * 0.8 + p.phase) * 0.5,
        Math.sin(angle) * (p.r + scroll * 1.8),
      );
      dummy.scale.setScalar(p.size * (0.8 + Math.sin(t * 3 + p.phase) * 0.2));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, GLINT_COUNT]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial
        color="#f4f8ff"
        transparent
        opacity={0.32}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function MirrorFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.8, 0]} receiveShadow>
      <planeGeometry args={[46, 46]} />
      <meshPhysicalMaterial color="#080b10" metalness={1} roughness={0.16} envMapIntensity={1.2} />
    </mesh>
  );
}

export default function ChromeRippleScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const next = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (next - scrollProgress.current) * 0.05;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.06;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.06;
  });

  return (
    <>
      <Environment preset="studio" />
      <fog attach="fog" args={["#070a10", 10, 40]} />

      <ambientLight intensity={0.1} />
      <directionalLight position={[8, 11, 7]} intensity={1.25} color="#e8edf6" castShadow />
      <pointLight position={[-7, 2, -6]} intensity={0.45} color="#92a0c0" distance={24} />
      <pointLight position={[6, -2, 5]} intensity={0.35} color="#a9b5cd" distance={18} />

      <RippleCore scrollProgress={scrollProgress} mousePos={mousePos} />
      <RippleRings scrollProgress={scrollProgress} />
      <ChromeGlints scrollProgress={scrollProgress} />
      <MirrorFloor />
    </>
  );
}
