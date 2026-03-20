import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const SHARD_COUNT = 45;

function generateShards() {
  const shards = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const radius = 1 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    shards.push({
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ),
      scale: 0.2 + Math.random() * 0.8,
      speed: 0.2 + Math.random() * 0.8,
      axis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize(),
      explosionFactor: 1 + Math.random() * 3, // How far it flies out on scroll
    });
  }
  return shards;
}

function ObsidianShards({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const shards = useMemo(() => generateShards(), []);
  
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#050505",
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 2.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    polygonOffset: true,
  }), []);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05 + mousePos.current.x * 0.2;
      groupRef.current.rotation.x = mousePos.current.y * 0.2;
      
      groupRef.current.children.forEach((child, i) => {
        const data = shards[i];
        
        // Base rotation
        child.rotateOnAxis(data.axis, 0.01 * data.speed);
        
        // Explosion effect based on scroll
        const currentRadius = 1 + scroll * data.explosionFactor * 5;
        const targetPos = data.position.clone().normalize().multiplyScalar(currentRadius);
        
        // Add some floating noise
        targetPos.y += Math.sin(t * data.speed + i) * 0.2;
        
        child.position.lerp(targetPos, 0.05);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {shards.map((shard, i) => (
        <mesh 
          key={i} 
          geometry={geometry} 
          material={material} 
          scale={shard.scale}
          castShadow
          receiveShadow
        />
      ))}
      
      {/* Central Core */}
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[1.5, 2]} />
        <meshPhysicalMaterial
          color="#000000"
          metalness={1}
          roughness={0.1}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshPhysicalMaterial 
        color="#020202"
        metalness={0.8}
        roughness={0.2}
        envMapIntensity={1}
      />
    </mesh>
  );
}

export default function ObsidianShatterScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.06;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.05;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.05;
  });

  return (
    <>
      <Environment preset="city" />
      <fog attach="fog" args={["#000000", 10, 30]} />

      <ambientLight intensity={0.1} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight 
        position={[-10, -5, -5]} 
        intensity={5} 
        color="#4a00e0" 
        distance={30} 
        angle={0.5} 
        penumbra={1} 
      />
      <spotLight 
        position={[10, -5, 5]} 
        intensity={3} 
        color="#00d2ff" 
        distance={30} 
        angle={0.5} 
        penumbra={1} 
      />

      <ObsidianShards scrollProgress={scrollProgress} mousePos={mousePos} />
      <Floor />
    </>
  );
}