import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const SIZE = 22;
const COUNT = SIZE * SIZE;

export default function CryptoGridScene() {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    const color = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      if (Math.random() > 0.92) {
        color.set("#40e0d0"); // Glowing cyan
      } else if (Math.random() > 0.85) {
        color.set("#1a8fa8"); // Muted blue
      } else {
        color.set("#0a1118"); // Dark base
      }
      color.toArray(arr, i * 3);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    let i = 0;
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const posX = (x - SIZE / 2) * 0.7;
        const posZ = (z - SIZE / 2) * 0.7;

        const distance = Math.sqrt(posX * posX + posZ * posZ);
        
        // Complex wave pattern
        const wave1 = Math.sin(distance * 0.8 - t * 1.5);
        const wave2 = Math.cos(posX * 0.5 + t) * Math.sin(posZ * 0.5 + t);
        
        const yOffset = (wave1 + wave2) * 0.5;
        const scrollEffect = Math.sin(distance * 0.3 - scroll * 8) * scroll * 3;

        dummy.position.set(posX, yOffset + scrollEffect - 3, posZ);
        // Scale Y based on height
        dummy.scale.set(1, 1 + Math.max(0, yOffset + scrollEffect) * 2, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Tilt grid based on scroll
    meshRef.current.rotation.x = 0.6 + scroll * 0.4;
    meshRef.current.rotation.y = t * 0.05 + scroll * 0.2;
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={2} />
      
      <instancedMesh ref={meshRef} args={[null, null, COUNT]}>
        <boxGeometry args={[0.55, 1, 0.55]}>
          <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
        </boxGeometry>
        <meshStandardMaterial 
          vertexColors 
          metalness={0.8} 
          roughness={0.2} 
        />
      </instancedMesh>
    </>
  );
}
