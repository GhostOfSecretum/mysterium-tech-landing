import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const POINTS_PER_STRAND = 220;

function HelixStrands({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const instA = useRef();
  const instB = useRef();
  const bridgeRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const phaseOffsets = useMemo(
    () => Array.from({ length: POINTS_PER_STRAND }, (_, i) => i / POINTS_PER_STRAND),
    [],
  );

  const bridgeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(POINTS_PER_STRAND * 6), 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const radius = 1.6 + scroll * 2.5;
    const height = 8 + scroll * 12;
    const turns = 3.2 + scroll * 4.5;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.2 + mousePos.current.x * 0.4;
      groupRef.current.rotation.x = mousePos.current.y * 0.22;
      groupRef.current.position.y = -0.6 + scroll * 1.8;
    }

    const bridgePos = bridgeGeometry.attributes.position.array;

    for (let i = 0; i < POINTS_PER_STRAND; i++) {
      const u = phaseOffsets[i];
      const angle = u * Math.PI * 2 * turns + t * 0.7;
      const y = (u - 0.5) * height;
      const wobble = Math.sin(t * 1.6 + i * 0.15) * 0.05;

      const ax = Math.cos(angle) * (radius + wobble);
      const az = Math.sin(angle) * (radius + wobble);
      const bx = Math.cos(angle + Math.PI) * (radius + wobble);
      const bz = Math.sin(angle + Math.PI) * (radius + wobble);

      dummy.position.set(ax, y, az);
      dummy.scale.setScalar(0.085 + Math.sin(t * 2 + i * 0.2) * 0.015);
      dummy.updateMatrix();
      instA.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(bx, y, bz);
      dummy.scale.setScalar(0.085 + Math.cos(t * 2 + i * 0.2) * 0.015);
      dummy.updateMatrix();
      instB.current?.setMatrixAt(i, dummy.matrix);

      const base = i * 6;
      bridgePos[base] = ax;
      bridgePos[base + 1] = y;
      bridgePos[base + 2] = az;
      bridgePos[base + 3] = bx;
      bridgePos[base + 4] = y;
      bridgePos[base + 5] = bz;
    }

    if (instA.current) instA.current.instanceMatrix.needsUpdate = true;
    if (instB.current) instB.current.instanceMatrix.needsUpdate = true;
    bridgeGeometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instA} args={[null, null, POINTS_PER_STRAND]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhysicalMaterial
          color="#c8ced8"
          metalness={1}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={2.5}
        />
      </instancedMesh>

      <instancedMesh ref={instB} args={[null, null, POINTS_PER_STRAND]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhysicalMaterial
          color="#f2f4f8"
          metalness={0.95}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={2}
        />
      </instancedMesh>

      <lineSegments ref={bridgeRef} geometry={bridgeGeometry}>
        <lineBasicMaterial
          color="#d7dde7"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function FloatingPlates({ scrollProgress }) {
  const groupRef = useRef();
  const plates = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        y: -6 + i * 1.05,
        size: 1.2 + (i % 3) * 0.55,
        phase: i * 0.6,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((mesh, i) => {
      const p = plates[i];
      mesh.position.y = p.y + Math.sin(t * 0.8 + p.phase) * 0.12 + scroll * 0.35 * i * 0.03;
      mesh.rotation.y = t * 0.2 + p.phase;
      mesh.rotation.x = Math.sin(t * 0.5 + p.phase) * 0.2;
      mesh.scale.setScalar(1 + scroll * 0.08);
    });
  });

  return (
    <group ref={groupRef}>
      {plates.map((p, i) => (
        <mesh key={i} position={[0, p.y, 0]}>
          <torusGeometry args={[p.size, 0.025, 20, 120]} />
          <meshPhysicalMaterial
            color="#9ea8ba"
            metalness={1}
            roughness={0.2}
            transparent
            opacity={0.35}
            envMapIntensity={1.7}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function TitaniumHelixScene() {
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
      <Environment preset="city" />
      <fog attach="fog" args={["#070b12", 12, 45]} />

      <ambientLight intensity={0.12} />
      <directionalLight position={[7, 10, 6]} intensity={1.15} color="#edf0f8" castShadow />
      <pointLight position={[-6, 0, -5]} intensity={0.45} color="#6b88b8" distance={22} />
      <pointLight position={[6, 4, 5]} intensity={0.34} color="#b2becf" distance={18} />

      <HelixStrands scrollProgress={scrollProgress} mousePos={mousePos} />
      <FloatingPlates scrollProgress={scrollProgress} />
    </>
  );
}
