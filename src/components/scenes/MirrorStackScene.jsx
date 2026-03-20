import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const LAYER_COUNT = 16;
const DUST_COUNT = 120;

function MirrorLayers({ scrollProgress, mousePos }) {
  const groupRef = useRef();

  const layers = useMemo(
    () =>
      Array.from({ length: LAYER_COUNT }, (_, i) => ({
        baseY: -4.4 + i * 0.62,
        radius: 1.6 + i * 0.14,
        thickness: 0.07 + (i % 2) * 0.02,
        phase: i * 0.47,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (!groupRef.current) return;

    groupRef.current.rotation.y = mousePos.current.x * 0.35 + t * 0.09;
    groupRef.current.rotation.x = mousePos.current.y * 0.18;

    groupRef.current.children.forEach((layer, i) => {
      const d = layers[i];
      layer.position.y = d.baseY + scroll * (i - LAYER_COUNT / 2) * 0.22;
      layer.rotation.y = t * (0.06 + i * 0.007) + d.phase;
      layer.rotation.z = Math.sin(t * 0.8 + d.phase) * (0.08 + scroll * 0.15);

      const xShift = Math.sin(t * 0.55 + d.phase) * scroll * 2.8;
      layer.position.x = xShift;
      layer.position.z = Math.cos(t * 0.5 + d.phase) * scroll * 1.2;
    });
  });

  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.baseY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[l.radius, l.radius, l.thickness, 96, 1, true]} />
          <meshPhysicalMaterial
            color={i % 2 ? "#d9e0ea" : "#aeb7c6"}
            metalness={1}
            roughness={0.06 + (i % 3) * 0.06}
            clearcoat={1}
            clearcoatRoughness={0.03}
            envMapIntensity={2.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function OrbitDust({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, () => ({
        radius: 3 + Math.random() * 8,
        speed: 0.15 + Math.random() * 0.6,
        y: (Math.random() - 0.5) * 9,
        phase: Math.random() * Math.PI * 2,
        size: 0.02 + Math.random() * 0.06,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < DUST_COUNT; i++) {
      const p = particles[i];
      const angle = t * p.speed + p.phase + scroll * 2;
      dummy.position.set(
        Math.cos(angle) * (p.radius + scroll * 1.5),
        p.y + Math.sin(t * 0.9 + p.phase) * 0.35,
        Math.sin(angle) * (p.radius + scroll * 1.5),
      );
      dummy.scale.setScalar(p.size * (0.75 + Math.sin(t * 2 + p.phase) * 0.25));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, DUST_COUNT]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial
        color="#ebf0fa"
        transparent
        opacity={0.26}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function BaseFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.6, 0]} receiveShadow>
      <planeGeometry args={[52, 52]} />
      <meshPhysicalMaterial color="#080c14" metalness={1} roughness={0.2} envMapIntensity={1.3} />
    </mesh>
  );
}

export default function MirrorStackScene() {
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
      <Environment preset="dawn" />
      <fog attach="fog" args={["#090d15", 12, 44]} />

      <ambientLight intensity={0.1} />
      <directionalLight position={[8, 11, 4]} intensity={1.2} color="#e8edf8" castShadow />
      <pointLight position={[-6, 2, -7]} intensity={0.42} color="#6f85ad" distance={23} />
      <pointLight position={[6, -1, 6]} intensity={0.35} color="#c9d3e6" distance={18} />

      <MirrorLayers scrollProgress={scrollProgress} mousePos={mousePos} />
      <OrbitDust scrollProgress={scrollProgress} />
      <BaseFloor />
    </>
  );
}
