import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, MeshWobbleMaterial, Float } from "@react-three/drei";

export default function NeonFluidScene() {
  const blobRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    blobRef.current.rotation.x = t * 0.2 + scroll;
    blobRef.current.rotation.y = t * 0.3;
    
    // Stretch and scale based on scroll
    const stretch = 1 + scroll * 0.5;
    blobRef.current.scale.set(stretch, 1 + scroll * 0.2, stretch);
  });

  return (
    <>
      <Environment preset="warehouse" />
      <ambientLight intensity={0.5} />
      
      {/* Colorful rim lights */}
      <directionalLight position={[10, 10, 5]} intensity={3} color="#40e0d0" />
      <directionalLight position={[-10, -10, -5]} intensity={3} color="#1a8fa8" />
      <pointLight position={[0, 0, 10]} intensity={2} color="#d4a843" distance={20} />

      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
        <mesh ref={blobRef}>
          <sphereGeometry args={[2.2, 128, 128]} />
          <MeshWobbleMaterial
            factor={1.2}
            speed={1.5}
            color="#01050a"
            metalness={1}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </Float>
    </>
  );
}
