import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const SHARD_COUNT = 55;

function ShatteringMonolith({ scrollProgress, mousePos }) {
  const solidRef = useRef();
  const edgeRef = useRef();
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const shards = useMemo(() => {
    const W = 2.4, H = 4, D = 0.6;
    return Array.from({ length: SHARD_COUNT }, () => {
      const originX = (Math.random() - 0.5) * W;
      const originY = (Math.random() - 0.5) * H;
      const originZ = (Math.random() - 0.5) * D;

      const dir = new THREE.Vector3(originX, originY, originZ).normalize();
      const dist = 3 + Math.random() * 5;

      return {
        originX, originY, originZ,
        targetX: dir.x * dist + (Math.random() - 0.5) * 2,
        targetY: dir.y * dist + (Math.random() - 0.5) * 1.5,
        targetZ: dir.z * dist + (Math.random() - 0.5) * 3,
        rotSpeed: 0.3 + Math.random() * 1.2,
        floatSpeed: 0.3 + Math.random() * 0.6,
        floatAmp: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        scaleX: 0.1 + Math.random() * 0.35,
        scaleY: 0.15 + Math.random() * 0.7,
        scaleZ: 0.05 + Math.random() * 0.12,
        delay: Math.random() * 0.3,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const rawScroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    const monolithOpacity = Math.max(0, 1 - rawScroll * 3);
    const monolithScale = Math.max(0.01, 1 - rawScroll * 2);

    if (solidRef.current) {
      solidRef.current.rotation.y = t * 0.12 + mx * 0.35;
      solidRef.current.rotation.x = 0.15 + my * 0.2;
      solidRef.current.rotation.z = Math.sin(t * 0.4) * 0.03;
      solidRef.current.position.y = Math.sin(t * 0.5) * 0.15;
      solidRef.current.scale.setScalar(monolithScale);
      solidRef.current.visible = monolithOpacity > 0.01;
      if (solidRef.current.material) {
        solidRef.current.material.opacity = monolithOpacity;
        solidRef.current.material.transparent = true;
      }
    }

    if (edgeRef.current) {
      edgeRef.current.rotation.y = t * 0.12 + mx * 0.35;
      edgeRef.current.rotation.x = 0.15 + my * 0.2;
      edgeRef.current.rotation.z = Math.sin(t * 0.4) * 0.03;
      edgeRef.current.position.y = Math.sin(t * 0.5) * 0.15;
      edgeRef.current.scale.setScalar(monolithScale);
      edgeRef.current.visible = monolithOpacity > 0.01;
      if (edgeRef.current.material) {
        edgeRef.current.material.opacity = 0.05 * monolithOpacity;
      }
    }

    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < SHARD_COUNT; i++) {
      const s = shards[i];
      const shardProgress = Math.min(1, Math.max(0, (rawScroll - s.delay) / (1 - s.delay)));
      const ease = shardProgress * shardProgress * (3 - 2 * shardProgress);

      const px = s.originX + (s.targetX - s.originX) * ease;
      const py = s.originY + (s.targetY - s.originY) * ease;
      const pz = s.originZ + (s.targetZ - s.originZ) * ease;

      const floatY = ease * Math.sin(t * s.floatSpeed + s.phase) * s.floatAmp;

      dummy.position.set(
        px + Math.sin(t * 0.3 + s.phase) * ease * 0.15,
        py + floatY,
        pz + Math.cos(t * 0.25 + s.phase) * ease * 0.1,
      );

      const rot = t * s.rotSpeed * ease;
      dummy.rotation.set(
        rot * 0.4 + mx * ease * 0.5,
        rot * 0.6,
        rot * 0.3,
      );

      const shardScale = 0.3 + ease * 0.7;
      dummy.scale.set(s.scaleX * shardScale, s.scaleY * shardScale, s.scaleZ * shardScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={solidRef} castShadow receiveShadow>
        <boxGeometry args={[2.4, 4, 0.6]} />
        <meshPhysicalMaterial
          color="#b8bfc8"
          metalness={1}
          roughness={0.03}
          envMapIntensity={3.5}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={1}
          transparent
        />
      </mesh>

      <mesh ref={edgeRef}>
        <boxGeometry args={[2.42, 4.02, 0.62]} />
        <meshBasicMaterial
          color="#d8dce6"
          wireframe
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <instancedMesh ref={instancedRef} args={[null, null, SHARD_COUNT]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color="#c8ced8"
          metalness={1}
          roughness={0.04}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </instancedMesh>
    </group>
  );
}

function LightBeams() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.015;
    }
  });

  const beams = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      arr.push({
        position: [Math.cos(angle) * 6, 8, Math.sin(angle) * 6],
        rotation: [Math.PI * 0.35, angle, 0],
      });
    }
    return arr;
  }, []);

  return (
    <group ref={groupRef}>
      {beams.map((beam, i) => (
        <mesh key={i} position={beam.position} rotation={beam.rotation}>
          <planeGeometry args={[0.25, 20]} />
          <meshBasicMaterial
            color="#d0d8e8"
            transparent
            opacity={0.025}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshPhysicalMaterial color="#070a0f" metalness={1} roughness={0.14} envMapIntensity={1} />
    </mesh>
  );
}

export default function ChromeMonolithScene() {
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
      <fog attach="fog" args={["#06080c", 10, 36]} />

      <ambientLight intensity={0.06} />
      <directionalLight
        position={[6, 15, 4]}
        intensity={1.4}
        color="#e4eaf5"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-7, 5, -6]} intensity={0.5} color="#8090b0" distance={24} />
      <pointLight position={[5, -1, 8]} intensity={0.3} color="#9eaac6" distance={18} />
      <spotLight
        position={[0, 10, 0]}
        angle={0.2}
        penumbra={0.8}
        intensity={0.6}
        color="#c8d0e0"
      />

      <ShatteringMonolith scrollProgress={scrollProgress} mousePos={mousePos} />
      <LightBeams />
      <ReflectiveFloor />
    </>
  );
}
