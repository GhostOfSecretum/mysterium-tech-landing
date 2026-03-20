import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";

export default function QuantumCoreScene() {
  const coreRef = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    ring1.current.rotation.x = t * 0.2 + scroll;
    ring1.current.rotation.y = t * 0.3;

    ring2.current.rotation.y = t * 0.25 - scroll;
    ring2.current.rotation.z = t * 0.4;

    ring3.current.rotation.x = t * 0.35;
    ring3.current.rotation.z = t * 0.2 + scroll * 1.5;

    coreRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05 + scroll * 0.2);
    coreRef.current.rotation.y = t * 0.5;
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <group>
          {/* Core */}
          <mesh ref={coreRef}>
            <sphereGeometry args={[1.5, 64, 64]} />
            <meshPhysicalMaterial 
              color="#010810" 
              metalness={0.9} 
              roughness={0.1} 
              clearcoat={1} 
              emissive="#0d8090" 
              emissiveIntensity={0.4} 
            />
          </mesh>
          
          {/* Rings */}
          <mesh ref={ring1}>
            <torusGeometry args={[2.2, 0.02, 16, 100]} />
            <meshStandardMaterial color="#40e0d0" metalness={0.8} roughness={0.2} emissive="#40e0d0" emissiveIntensity={0.8} />
          </mesh>
          
          <mesh ref={ring2}>
            <torusGeometry args={[2.6, 0.04, 16, 100]} />
            <meshStandardMaterial color="#1a8fa8" metalness={1} roughness={0.1} />
          </mesh>
          
          <mesh ref={ring3}>
            <torusGeometry args={[3.0, 0.02, 16, 100]} />
            <meshStandardMaterial color="#d4a843" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </Float>
    </>
  );
}
