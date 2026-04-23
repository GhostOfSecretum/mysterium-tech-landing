import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const TORUS_COUNT = 12;
const DUST_COUNT = 120;

function VortexRings({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const ringsRef = useRef([]);

  const rings = useMemo(
    () =>
      Array.from({ length: TORUS_COUNT }, (_, i) => {
        const t = i / TORUS_COUNT;
        return {
          radius: 1.2 + t * 3.5,
          tube: 0.025 + t * 0.015,
          yBase: (t - 0.5) * 6,
          speed: 0.3 - t * 0.02,
          direction: i % 2 === 0 ? 1 : -1,
          wobble: 0.06 + t * 0.04,
          phase: i * 0.9,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    if (groupRef.current) {
      groupRef.current.rotation.x = my * 0.2;
      groupRef.current.rotation.z = mx * 0.1;
    }

    ringsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const r = rings[i];
      mesh.rotation.z = t * r.speed * r.direction + r.phase;
      mesh.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + r.phase) * r.wobble;
      mesh.position.y = r.yBase + Math.sin(t * 0.7 + r.phase) * 0.15;

      const spread = 1 + scroll * 0.3;
      const s = spread + Math.sin(t * 0.4 + r.phase) * 0.02;
      mesh.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((r, i) => (
        <mesh
          key={i}
          ref={(el) => { ringsRef.current[i] = el; }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[r.radius, r.tube, 28, 180]} />
          <meshPhysicalMaterial
            color={i % 3 === 0 ? "#d8dce6" : i % 3 === 1 ? "#b8c0cc" : "#e4e8f0"}
            metalness={1}
            roughness={0.05}
            envMapIntensity={2.8}
            clearcoat={1}
            clearcoatRoughness={0.04}
            transparent
            opacity={0.7 + (1 - i / TORUS_COUNT) * 0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function CoreGlow({ scrollProgress, mousePos }) {
  const meshRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15 + mousePos.current.x * 0.5;
      meshRef.current.rotation.x = t * 0.1 + mousePos.current.y * 0.4;
      const pulse = 1 + Math.sin(t * 1.5) * 0.04;
      meshRef.current.scale.setScalar(pulse);
    }

    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.2;
      innerRef.current.rotation.z = t * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.9, 2]} />
        <meshPhysicalMaterial
          color="#ccd2dc"
          metalness={1}
          roughness={0.02}
          envMapIntensity={4}
          clearcoat={1}
          clearcoatRoughness={0.01}
          reflectivity={1}
        />
      </mesh>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial
          color="#e0e6f4"
          wireframe
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function VortexDust({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 5;
        return {
          angle,
          radius: r,
          y: (Math.random() - 0.5) * 7,
          speed: 0.1 + Math.random() * 0.4,
          drift: (Math.random() - 0.5) * 0.3,
          size: 0.015 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < DUST_COUNT; i++) {
      const p = particles[i];
      const a = p.angle + t * p.speed + scroll * 1.5;
      const r = p.radius + scroll * 0.8 + Math.sin(t * 0.5 + p.phase) * 0.3;
      const spiralY = p.y + t * p.drift + Math.sin(t * 0.8 + p.phase) * 0.4;
      const wrappedY = ((spiralY % 7) + 7) % 7 - 3.5;

      dummy.position.set(Math.cos(a) * r, wrappedY, Math.sin(a) * r);
      const pulse = p.size * (0.6 + Math.sin(t * 3 + p.phase) * 0.4);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, DUST_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color="#e8eef8"
        transparent
        opacity={0.35}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function ChromeVortexScene() {
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
      <fog attach="fog" args={["#070910", 8, 32]} />

      <ambientLight intensity={0.07} />
      <directionalLight position={[5, 12, 8]} intensity={1.2} color="#e2e8f4" castShadow />
      <pointLight position={[-6, 4, -5]} intensity={0.45} color="#8892b0" distance={22} />
      <pointLight position={[4, -3, 6]} intensity={0.35} color="#a0aac8" distance={18} />
      <pointLight position={[0, 6, 0]} intensity={0.3} color="#c0c8e0" distance={14} />

      <CoreGlow scrollProgress={scrollProgress} mousePos={mousePos} />
      <VortexRings scrollProgress={scrollProgress} mousePos={mousePos} />
      <VortexDust scrollProgress={scrollProgress} />
    </>
  );
}
