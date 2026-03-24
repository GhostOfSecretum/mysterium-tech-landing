import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const HELIX_POINTS = 120;
const RUNG_COUNT = 40;
const PARTICLE_COUNT = 200;

function HelixStrands({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const strand1Ref = useRef();
  const strand2Ref = useRef();

  const { positions1, positions2 } = useMemo(() => {
    const p1 = [];
    const p2 = [];
    for (let i = 0; i < HELIX_POINTS; i++) {
      const t = (i / HELIX_POINTS) * Math.PI * 6;
      const y = (i / HELIX_POINTS - 0.5) * 12;
      const r = 2;
      p1.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
      p2.push(new THREE.Vector3(Math.cos(t + Math.PI) * r, y, Math.sin(t + Math.PI) * r));
    }
    return { positions1: p1, positions2: p2 };
  }, []);

  const curve1 = useMemo(() => new THREE.CatmullRomCurve3(positions1), [positions1]);
  const curve2 = useMemo(() => new THREE.CatmullRomCurve3(positions2), [positions2]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15 + mx * 0.4;
      groupRef.current.rotation.x = my * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1 + scroll * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={strand1Ref}>
        <tubeGeometry args={[curve1, 200, 0.08, 12, false]} />
        <meshPhysicalMaterial
          color="#40e0d0"
          emissive="#40e0d0"
          emissiveIntensity={0.8}
          metalness={0.7}
          roughness={0.2}
          envMapIntensity={2}
        />
      </mesh>
      <mesh ref={strand2Ref}>
        <tubeGeometry args={[curve2, 200, 0.08, 12, false]} />
        <meshPhysicalMaterial
          color="#d4a843"
          emissive="#d4a843"
          emissiveIntensity={0.6}
          metalness={0.7}
          roughness={0.2}
          envMapIntensity={2}
        />
      </mesh>
    </group>
  );
}

function HelixRungs({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const rungs = useMemo(() => {
    const result = [];
    for (let i = 0; i < RUNG_COUNT; i++) {
      const frac = i / RUNG_COUNT;
      const angle = frac * Math.PI * 6;
      const y = (frac - 0.5) * 12;
      const r = 2;
      const p1 = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const p2 = new THREE.Vector3(Math.cos(angle + Math.PI) * r, y, Math.sin(angle + Math.PI) * r);
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const len = p1.distanceTo(p2);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      result.push({ mid, len, quat, phase: frac * Math.PI * 4 });
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15 + mousePos.current.x * 0.4;
      groupRef.current.rotation.x = mousePos.current.y * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1 + scroll * 0.3;
    }

    rungs.forEach((rung, i) => {
      const pulse = 0.5 + Math.sin(t * 2 + rung.phase) * 0.5;
      dummy.position.copy(rung.mid);
      dummy.quaternion.copy(rung.quat);
      dummy.scale.set(0.02 + pulse * 0.01, rung.len, 0.02 + pulse * 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[null, null, RUNG_COUNT]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial
          color="#1a8fa8"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

function FloatingParticles({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * 16,
        y: (Math.random() - 0.5) * 14,
        z: (Math.random() - 0.5) * 16,
        speed: 0.2 + Math.random() * 0.6,
        size: 0.015 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        isTeal: Math.random() > 0.5,
      })),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      color.set(p.isTeal ? "#40e0d0" : "#d4a843");
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [particles]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    particles.forEach((p, i) => {
      const x = p.x + Math.sin(t * p.speed + p.phase) * 0.5;
      const y = p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.8;
      const z = p.z + Math.sin(t * p.speed * 0.5 + p.phase) * 0.5;

      dummy.position.set(x, y, z);
      const s = p.size * (0.6 + Math.sin(t * 2 + p.phase) * 0.4) * (1 + scroll * 0.5);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function NeonHelixScene() {
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
      <Environment preset="night" />
      <fog attach="fog" args={["#010810", 10, 35]} />
      <ambientLight intensity={0.06} />
      <pointLight position={[3, 6, 3]} intensity={1} color="#40e0d0" distance={25} />
      <pointLight position={[-3, -4, -3]} intensity={0.7} color="#d4a843" distance={20} />
      <pointLight position={[0, 0, 8]} intensity={0.4} color="#1a8fa8" distance={18} />

      <HelixStrands scrollProgress={scrollProgress} mousePos={mousePos} />
      <HelixRungs scrollProgress={scrollProgress} mousePos={mousePos} />
      <FloatingParticles scrollProgress={scrollProgress} />
    </>
  );
}
