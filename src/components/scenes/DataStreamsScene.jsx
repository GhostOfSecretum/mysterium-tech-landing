import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const COUNT = 300;

export default function DataStreamsScene() {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 30,
      z: (Math.random() - 0.5) * 15 - 5,
      speed: 2 + Math.random() * 4,
      scale: 0.05 + Math.random() * 0.15,
      isHighlight: Math.random() > 0.8
    }));
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      if (p.isHighlight) {
        color.set("#40e0d0"); // Cyan accent
      } else {
        color.set("#1a8fa8"); // Darker blue
      }
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [particles]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    particles.forEach((p, i) => {
      let y = p.y + t * p.speed + scroll * 15;
      // Wrap around logic
      y = ((y + 15) % 30) - 15;

      // Slight wave motion
      const xOffset = Math.sin(t + p.y) * 0.5;

      dummy.position.set(p.x + xOffset, y, p.z);
      dummy.scale.set(p.scale, p.scale * 40, p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.rotation.y = t * 0.05 + scroll * 0.2;
    meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.1;
  });

  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.2} />
      <instancedMesh ref={meshRef} args={[null, null, COUNT]}>
        <cylinderGeometry args={[1, 1, 1, 8]}>
          <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
        </cylinderGeometry>
        <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.8} />
      </instancedMesh>
    </>
  );
}
