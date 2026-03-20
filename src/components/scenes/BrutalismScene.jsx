import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const concreteVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const concreteFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 texCoord = vWorldPos.xz * 0.5 + vWorldPos.xy * 0.3;
    float n1 = noise(texCoord * 8.0);
    float n2 = noise(texCoord * 24.0);
    float n3 = noise(texCoord * 64.0);

    float concrete = 0.42 + n1 * 0.12 + n2 * 0.06 + n3 * 0.03;

    float stain = noise(texCoord * 2.0 + 5.0);
    concrete -= stain * 0.06;

    vec3 baseColor = vec3(concrete, concrete * 0.97, concrete * 0.94);

    float ao = 0.7 + 0.3 * max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0);
    baseColor *= ao;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

function Monolith({ position, size, rotation, scrollProgress, index }) {
  const meshRef = useRef();
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);

  const uniforms = useMemo(() => ({}), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (meshRef.current) {
      const rise = Math.sin(t * 0.3 + index * 0.8) * 0.15;
      meshRef.current.position.y = position[1] + rise;

      const spread = scroll * 1.2;
      const dir = basePos.clone().normalize();
      meshRef.current.position.x = position[0] + dir.x * spread;
      meshRef.current.position.z = position[2] + dir.z * spread;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <shaderMaterial
        vertexShader={concreteVertexShader}
        fragmentShader={concreteFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function MetallicAccent({ position, size, color }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.95}
        roughness={0.1}
        envMapIntensity={2}
        clearcoat={0.5}
      />
    </mesh>
  );
}

function ArchFrame({ position, width, height, depth, scrollProgress }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.25) * 0.1;
    }
  });

  const thickness = 0.3;

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[-width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <shaderMaterial vertexShader={concreteVertexShader} fragmentShader={concreteFragmentShader} uniforms={{}} />
      </mesh>
      <mesh position={[width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <shaderMaterial vertexShader={concreteVertexShader} fragmentShader={concreteFragmentShader} uniforms={{}} />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + thickness, thickness, depth]} />
        <shaderMaterial vertexShader={concreteVertexShader} fragmentShader={concreteFragmentShader} uniforms={{}} />
      </mesh>
    </group>
  );
}

function ShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.95} metalness={0} />
    </mesh>
  );
}

function DramaticDust() {
  const pointsRef = useRef();
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = Math.random() * 12 - 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.003;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -5;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#8a8070"
        size={0.03}
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function LightShaft({ position, rotation, height }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.material.opacity = 0.04 + Math.sin(t * 0.3 + position[0]) * 0.015;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[1.5, height]} />
      <meshBasicMaterial
        color="#f0e8d8"
        transparent
        opacity={0.04}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function BrutalismScene() {
  const scrollProgress = useRef(0);

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
  });

  return (
    <>
      <Environment preset="warehouse" />
      <fog attach="fog" args={["#1a1816", 10, 40]} />

      <ambientLight intensity={0.08} color="#e0d8c8" />
      <directionalLight
        position={[10, 15, 5]}
        intensity={2}
        color="#f5e8d0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />
      <pointLight position={[-8, 3, -5]} intensity={0.2} color="#d0c0a0" distance={20} />

      <Monolith position={[-3, 0, -2]} size={[1.5, 8, 1.5]} rotation={[0, 0.1, 0]} scrollProgress={scrollProgress} index={0} />
      <Monolith position={[2.5, -1, -1]} size={[1.2, 6, 1.8]} rotation={[0, -0.15, 0]} scrollProgress={scrollProgress} index={1} />
      <Monolith position={[0, 0.5, -4]} size={[2, 10, 1]} rotation={[0, 0.3, 0]} scrollProgress={scrollProgress} index={2} />
      <Monolith position={[-5, -0.5, 1]} size={[1, 5, 2]} rotation={[0, -0.2, 0]} scrollProgress={scrollProgress} index={3} />
      <Monolith position={[5, 0, -3]} size={[1.8, 7, 1.2]} rotation={[0, 0.05, 0]} scrollProgress={scrollProgress} index={4} />

      <ArchFrame position={[0, 1, 2]} width={4} height={6} depth={0.8} scrollProgress={scrollProgress} />

      <MetallicAccent position={[-1, -3, 0]} size={[6, 0.15, 3]} color="#c8a060" />
      <MetallicAccent position={[3, 2, -2.5]} size={[0.1, 3, 0.1]} color="#b0903c" />
      <MetallicAccent position={[-4, 3.5, -1]} size={[0.08, 2, 0.08]} color="#c8a060" />

      <ShadowPlane />
      <DramaticDust />

      <LightShaft position={[-2, 3, 0]} rotation={[0, 0.3, 0.1]} height={18} />
      <LightShaft position={[3, 4, -1]} rotation={[0, -0.2, -0.05]} height={20} />
    </>
  );
}
