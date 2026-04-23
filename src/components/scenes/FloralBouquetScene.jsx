import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const FLOWER_COUNT = 7;
const PETAL_LAYERS = 3;
const PETALS_PER_LAYER = 6;
const FALLING_COUNT = 80;

const PALETTE = [
  "#f2a0b5", "#e86b8a", "#d94f72", "#f5c6d0",
  "#c87adb", "#f0d86e", "#f8e8e0", "#e8708a",
];

function Flower({ position, color, size, speed, phase, scrollProgress, mousePos }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!groupRef.current) return;

    groupRef.current.position.y =
      position[1] + Math.sin(t * speed + phase) * 0.25 + scroll * 0.3;
    groupRef.current.rotation.y = t * speed * 0.3 + mousePos.current.x * 0.3;
    groupRef.current.rotation.x = Math.sin(t * 0.4 + phase) * 0.1 + mousePos.current.y * 0.15;
  });

  const petals = useMemo(() => {
    const arr = [];
    for (let layer = 0; layer < PETAL_LAYERS; layer++) {
      const layerOffset = layer * 0.15;
      const layerAngle = layer * 0.3;
      const layerScale = 1 - layer * 0.15;
      for (let i = 0; i < PETALS_PER_LAYER; i++) {
        const angle = (i / PETALS_PER_LAYER) * Math.PI * 2 + layerAngle;
        arr.push({
          angle,
          tilt: 0.4 + layer * 0.3,
          dist: (0.35 + layer * 0.15) * size,
          scale: layerScale * size,
          yOff: layerOffset,
        });
      }
    }
    return arr;
  }, [size]);

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.15 * size, 16, 16]} />
        <meshPhysicalMaterial
          color="#f0d050"
          roughness={0.6}
          metalness={0.1}
          envMapIntensity={1}
        />
      </mesh>

      {petals.map((p, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(p.angle) * p.dist,
            p.yOff,
            Math.sin(p.angle) * p.dist,
          ]}
          rotation={[p.tilt, p.angle, 0]}
          scale={[p.scale * 0.35, p.scale * 0.12, p.scale * 0.5]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.35}
            metalness={0.05}
            envMapIntensity={1.5}
            clearcoat={0.3}
            clearcoatRoughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh position={[0, -0.8 * size, 0]} rotation={[0.05, 0, 0.05]}>
        <cylinderGeometry args={[0.03 * size, 0.04 * size, 1.6 * size, 8]} />
        <meshPhysicalMaterial color="#3a7a40" roughness={0.5} metalness={0.05} />
      </mesh>

      {[0.4, 0.7].map((h, i) => (
        <mesh
          key={i}
          position={[
            (i === 0 ? 0.15 : -0.12) * size,
            -h * size,
            (i === 0 ? 0.05 : -0.08) * size,
          ]}
          rotation={[0.2, i * 1.5, i === 0 ? 0.6 : -0.5]}
          scale={[0.22 * size, 0.06 * size, 0.12 * size]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshPhysicalMaterial color="#4a9a50" roughness={0.45} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function FallingPetals({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const petals = useMemo(
    () =>
      Array.from({ length: FALLING_COUNT }, () => ({
        x: (Math.random() - 0.5) * 12,
        z: (Math.random() - 0.5) * 10,
        speed: 0.3 + Math.random() * 0.5,
        wobbleSpeed: 1 + Math.random() * 2,
        wobbleAmp: 0.3 + Math.random() * 0.8,
        rotSpeed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        size: 0.06 + Math.random() * 0.1,
      })),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(FALLING_COUNT * 3);
    const color = new THREE.Color();
    for (let i = 0; i < FALLING_COUNT; i++) {
      color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      color.toArray(arr, i * 3);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < FALLING_COUNT; i++) {
      const p = petals[i];
      const rawY = 5 - ((t * p.speed + p.phase * 3) % 10);
      const x = p.x + Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp;
      const z = p.z + Math.cos(t * p.wobbleSpeed * 0.7 + p.phase) * p.wobbleAmp * 0.5;

      dummy.position.set(x, rawY, z);
      dummy.rotation.set(
        t * p.rotSpeed + p.phase,
        t * p.rotSpeed * 0.7,
        Math.sin(t * 2 + p.phase) * 0.5,
      );
      dummy.scale.set(p.size * 2.5, p.size * 0.5, p.size * 1.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, FALLING_COUNT]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshPhysicalMaterial
        vertexColors
        roughness={0.4}
        metalness={0.02}
        envMapIntensity={1.2}
        transparent
        opacity={0.75}
        side={THREE.DoubleSide}
      >
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </meshPhysicalMaterial>
    </instancedMesh>
  );
}

const FLOWERS = [
  { pos: [0, 0.3, 0], color: "#e86b8a", size: 1.3, speed: 0.5, phase: 0 },
  { pos: [-1.8, -0.2, 0.8], color: "#f2a0b5", size: 1, speed: 0.6, phase: 1 },
  { pos: [1.6, -0.1, 0.6], color: "#d94f72", size: 1.1, speed: 0.45, phase: 2 },
  { pos: [-0.8, 0.1, -1.2], color: "#c87adb", size: 0.9, speed: 0.55, phase: 3 },
  { pos: [1.0, -0.3, -1.0], color: "#f5c6d0", size: 0.95, speed: 0.5, phase: 4 },
  { pos: [-2.2, -0.5, -0.5], color: "#f0d86e", size: 0.8, speed: 0.65, phase: 5 },
  { pos: [2.3, -0.4, -0.3], color: "#e8708a", size: 0.85, speed: 0.48, phase: 6 },
];

export default function FloralBouquetScene() {
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
      <fog attach="fog" args={["#1a0a10", 10, 30]} />

      <ambientLight intensity={0.25} color="#ffe0e8" />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#fff0e8" castShadow />
      <pointLight position={[-5, 4, -3]} intensity={0.5} color="#f0a0c0" distance={20} />
      <pointLight position={[4, -2, 5]} intensity={0.4} color="#e0c0f0" distance={16} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#f8e8d0" distance={12} />

      {FLOWERS.map((f, i) => (
        <Flower
          key={i}
          position={f.pos}
          color={f.color}
          size={f.size}
          speed={f.speed}
          phase={f.phase}
          scrollProgress={scrollProgress}
          mousePos={mousePos}
        />
      ))}

      <FallingPetals scrollProgress={scrollProgress} />
    </>
  );
}
