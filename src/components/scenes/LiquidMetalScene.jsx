import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshDistortMaterial, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function LiquidBlob({ scrollProgress, mousePos }) {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.2;

      const morphX = 1 + scroll * 0.6;
      const morphY = 1 - scroll * 0.3;
      const morphZ = 1 + scroll * 0.4;
      meshRef.current.scale.set(
        morphX + Math.sin(t * 0.5) * 0.05,
        morphY + Math.cos(t * 0.7) * 0.05,
        morphZ + Math.sin(t * 0.3) * 0.05,
      );
    }

    if (materialRef.current) {
      const mouseInfluence = Math.sqrt(mousePos.current.x ** 2 + mousePos.current.y ** 2);
      materialRef.current.distort = 0.3 + mouseInfluence * 0.4 + Math.sin(t) * 0.05;
      materialRef.current.speed = 2 + mouseInfluence * 3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.5, 128, 128]} />
      <MeshDistortMaterial
        ref={materialRef}
        color="#1a1a2e"
        metalness={1}
        roughness={0.05}
        distort={0.3}
        speed={2}
        envMapIntensity={2.5}
      />
    </mesh>
  );
}

function InnerGlow({ scrollProgress }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.08;
      meshRef.current.scale.setScalar(1.8 + Math.sin(t * 0.8) * 0.1);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#00e59e"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function OrbitalRing({ radius, speed, color, tilt, thickness }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.z = t * speed;
    }
  });

  return (
    <mesh ref={meshRef} rotation={tilt}>
      <torusGeometry args={[radius, thickness, 8, 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function ReflectionProbes() {
  const light1Ref = useRef();
  const light2Ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(t * 0.5) * 6;
      light1Ref.current.position.y = Math.cos(t * 0.3) * 4;
    }
    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(t * 0.4) * 5;
      light2Ref.current.position.z = Math.sin(t * 0.6) * 5;
    }
  });

  return (
    <>
      <pointLight ref={light1Ref} position={[5, 3, 5]} intensity={1.5} color="#00e59e" distance={20} />
      <pointLight ref={light2Ref} position={[-5, -2, 3]} intensity={1} color="#3d6bff" distance={20} />
      <pointLight position={[0, 5, -3]} intensity={0.6} color="#a29bfe" distance={15} />
    </>
  );
}

export default function LiquidMetalScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.08;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.08;
  });

  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.1} />
      <ReflectionProbes />

      <LiquidBlob scrollProgress={scrollProgress} mousePos={mousePos} />
      <InnerGlow scrollProgress={scrollProgress} />

      <OrbitalRing radius={4} speed={0.2} color="#00e59e" tilt={[0.3, 0, 0]} thickness={0.015} />
      <OrbitalRing radius={4.5} speed={-0.15} color="#3d6bff" tilt={[-0.5, 0.3, 0]} thickness={0.012} />
      <OrbitalRing radius={5} speed={0.1} color="#a29bfe" tilt={[0.8, -0.2, 0]} thickness={0.01} />

      <Sparkles count={200} scale={18} size={1.5} speed={0.3} opacity={0.3} color="#00e59e" />
      <Sparkles count={150} scale={16} size={1} speed={0.2} opacity={0.2} color="#3d6bff" />
    </>
  );
}
