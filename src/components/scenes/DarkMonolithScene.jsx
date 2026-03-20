import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Float, ContactShadows } from "@react-three/drei";

export default function DarkMonolithScene() {
  const monolithRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    monolithRef.current.rotation.y = t * 0.1 + scroll * Math.PI;
    monolithRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
    
    // Move closer on scroll
    monolithRef.current.position.z = scroll * 3;
    monolithRef.current.position.y = Math.sin(t) * 0.2 - scroll * 1.5;
  });

  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 20, 10]} angle={0.15} penumbra={1} intensity={3} castShadow color="#40e0d0" />
      <spotLight position={[-10, -10, -10]} angle={0.2} penumbra={1} intensity={1} color="#1a8fa8" />
      
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={1.5}>
        <mesh ref={monolithRef} scale={[1.2, 3.5, 1.2]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial 
            color="#020508" 
            metalness={1} 
            roughness={0.15} 
            clearcoat={1} 
            clearcoatRoughness={0.1}
          />
        </mesh>
      </Float>
      
      <ContactShadows position={[0, -4.5, 0]} opacity={0.6} scale={15} blur={2.5} far={6} />
    </>
  );
}
