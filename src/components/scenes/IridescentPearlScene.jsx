import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function Pearl({ scrollProgress, mousePos }) {
  const meshRef = useRef();

  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 0.9,
    roughness: 0.05,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [100, 400],
    envMapIntensity: 2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    
    if (meshRef.current) {
      // Scroll makes the pearl pulse and move slightly forward
      const pulse = 1 + Math.sin(t * 2) * 0.02 + scroll * 0.2;
      meshRef.current.scale.setScalar(pulse);
      meshRef.current.position.z = scroll * 2;
      
      // Slight rotation for the iridescence to catch the light
      meshRef.current.rotation.y = t * 0.2 + mousePos.current.x * 0.5;
      meshRef.current.rotation.x = mousePos.current.y * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} material={material} castShadow receiveShadow>
      <sphereGeometry args={[2, 128, 128]} />
    </mesh>
  );
}

function OrbitingRings({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  
  const ringMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 1,
    roughness: 0.02,
    iridescence: 0.8,
    iridescenceIOR: 2.0,
    envMapIntensity: 3,
    transparent: true,
    opacity: 0.9,
  }), []);

  const rings = useMemo(() => {
    return [
      { radius: 3.5, tube: 0.05, speed: 0.5, axis: new THREE.Vector3(1, 0.5, 0).normalize() },
      { radius: 4.5, tube: 0.08, speed: -0.3, axis: new THREE.Vector3(0, 1, 0.5).normalize() },
      { radius: 5.5, tube: 0.04, speed: 0.7, axis: new THREE.Vector3(0.5, 0, 1).normalize() },
    ];
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    
    if (groupRef.current) {
      groupRef.current.children.forEach((ring, i) => {
        const data = rings[i];
        // Base rotation
        ring.setRotationFromAxisAngle(data.axis, t * data.speed);
        
        // Scroll effect: tilt the rings dramatically
        ring.rotateX(scroll * Math.PI);
        ring.rotateY(mousePos.current.x * 0.5);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} material={ringMaterial} castShadow receiveShadow>
          <torusGeometry args={[ring.radius, ring.tube, 32, 128]} />
        </mesh>
      ))}
    </group>
  );
}

export default function IridescentPearlScene() {
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
      <Environment preset="dawn" />
      <fog attach="fog" args={["#f0f4f8", 15, 40]} />

      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight
        position={[5, 5, 5]}
        intensity={2}
        color="#ffffff"
        castShadow
      />
      {/* Colorful lights to enhance iridescence */}
      <pointLight position={[-5, 5, -5]} intensity={2} color="#ff00ff" distance={20} />
      <pointLight position={[5, -5, 5]} intensity={2} color="#00ffff" distance={20} />

      <Pearl scrollProgress={scrollProgress} mousePos={mousePos} />
      <OrbitingRings scrollProgress={scrollProgress} mousePos={mousePos} />
      
      {/* Light background to contrast with dark scenes */}
      <mesh position={[0, 0, -20]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#eef2f5" />
      </mesh>
    </>
  );
}