import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function GoldKnot({ scrollProgress, mousePos }) {
  const meshRef = useRef();

  // Create a custom material that looks like liquid gold
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffc107",
    emissive: "#332200",
    metalness: 1,
    roughness: 0.15,
    envMapIntensity: 2.5,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  }), []);

  // Using a thick TorusKnot to simulate a fluid, continuous loop
  const geometry = useMemo(() => new THREE.TorusKnotGeometry(2.5, 1.2, 256, 64, 2, 3), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    
    if (meshRef.current) {
      // Base slow rotation
      meshRef.current.rotation.x = t * 0.1 + mousePos.current.y * 0.2;
      meshRef.current.rotation.y = t * 0.15 + mousePos.current.x * 0.2;
      
      // Scroll effect: extreme twisting and scaling
      meshRef.current.rotation.z = scroll * Math.PI * 2;
      
      // Breathing effect combined with scroll scale
      const breathe = 1 + Math.sin(t * 1.5) * 0.03;
      meshRef.current.scale.setScalar(breathe * (1 - scroll * 0.3));
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      material={material} 
      castShadow 
      receiveShadow 
    />
  );
}

function GoldDust({ scrollProgress }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 150;

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
      speed: 0.2 + Math.random() * 0.5,
      scale: 0.02 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!instancedRef.current) return;
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      // Scroll makes particles swirl around the center
      const angle = t * p.speed + scroll * 5 + p.phase;
      const radius = Math.sqrt(p.x * p.x + p.z * p.z) * (1 + scroll * 0.5);
      
      dummy.position.set(
        Math.cos(angle) * radius,
        p.y + Math.sin(t * p.speed + p.phase) * 2,
        Math.sin(angle) * radius
      );
      
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * 3 + p.phase) * 0.5));
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial 
        color="#ffdf00" 
        metalness={1} 
        roughness={0.1}
        emissive="#443300"
      />
    </instancedMesh>
  );
}

export default function LiquidGoldScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.05;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.05;
  });

  return (
    <>
      <Environment preset="sunset" />
      <fog attach="fog" args={["#1a1000", 10, 40]} />

      <ambientLight intensity={0.2} color="#ffaa00" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-5, -5, 5]} intensity={2} color="#ff3300" distance={20} />
      <pointLight position={[5, 5, -5]} intensity={1} color="#ffcc00" distance={20} />

      <GoldKnot scrollProgress={scrollProgress} mousePos={mousePos} />
      <GoldDust scrollProgress={scrollProgress} />
      
      {/* Warm ambient background glow */}
      <mesh position={[0, 0, -15]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#2a1100" transparent opacity={0.5} />
      </mesh>
    </>
  );
}