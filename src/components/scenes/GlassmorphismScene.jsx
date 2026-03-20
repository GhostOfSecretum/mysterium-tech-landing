import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const holoVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const holoFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  vec3 rainbow(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

    float scanline = sin(vWorldPos.y * 40.0 + uTime * 2.0) * 0.5 + 0.5;
    scanline = smoothstep(0.4, 0.6, scanline) * 0.15;

    float hologram = sin(vUv.y * 80.0 - uTime * 3.0) * 0.5 + 0.5;
    hologram = pow(hologram, 8.0) * 0.3;

    vec3 prismColor = rainbow(vUv.y * 0.5 + vUv.x * 0.3 + uTime * 0.1);
    vec3 baseGlass = vec3(0.7, 0.75, 0.85);

    vec3 color = mix(baseGlass, prismColor, fresnel * 0.6 + hologram);
    color += vec3(1.0) * scanline;
    color += prismColor * hologram * 0.5;

    float edgeGlow = fresnel * 0.4;
    float alpha = 0.08 + fresnel * 0.25 + scanline + hologram * 0.3 + edgeGlow;

    gl_FragColor = vec4(color, alpha);
  }
`;

function GlassPanel({ position, rotation, scale, delay, scrollProgress, mousePos }) {
  const meshRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uScroll.value = scrollProgress.current;

    if (meshRef.current) {
      const hover = Math.sin(t * 0.5 + delay) * 0.15;
      meshRef.current.position.y = position[1] + hover;

      const spread = scrollProgress.current * 1.5;
      const dir = new THREE.Vector3(...position).normalize();
      meshRef.current.position.x = position[0] + dir.x * spread;
      meshRef.current.position.z = position[2] + dir.z * spread;

      meshRef.current.rotation.y = rotation[1] + mousePos.current.x * 0.1;
      meshRef.current.rotation.x = rotation[0] + mousePos.current.y * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[3, 4, 0.04]} />
      <shaderMaterial
        vertexShader={holoVertexShader}
        fragmentShader={holoFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function GlassEdge({ position, rotation, scale }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.material.opacity = 0.06 + Math.sin(t * 1.5) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[3, 4, 0.04]} />
      <meshPhysicalMaterial
        color="#a0b0d0"
        metalness={0.1}
        roughness={0.05}
        transmission={0.95}
        thickness={0.5}
        transparent
        opacity={0.08}
        ior={1.5}
        envMapIntensity={1}
      />
    </mesh>
  );
}

function VolumetricBeam({ position, rotation, color, width, height }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.material.opacity = 0.025 + Math.sin(t * 0.8 + position[0]) * 0.01;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.03}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function HolographicOrb({ scrollProgress }) {
  const groupRef = useRef();
  const shellRef = useRef();
  const coreRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
    }
    if (shellRef.current) {
      shellRef.current.material.opacity = 0.04 + Math.sin(t * 2) * 0.02;
    }
    if (coreRef.current) {
      const pulse = 0.8 + Math.sin(t * 1.5) * 0.2;
      coreRef.current.scale.setScalar(pulse);
      coreRef.current.material.opacity = 0.3 + Math.sin(t * 3) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1.8, 2]} />
        <meshBasicMaterial
          color="#8090c0"
          wireframe
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial
          color="#a0c0ff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function PrismParticles() {
  const pointsRef = useRef();
  const count = 400;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      const hue = Math.random();
      const c = new THREE.Color().setHSL(hue, 0.6, 0.7);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        transparent
        opacity={0.5}
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

const PANELS = [
  { pos: [-2.5, 0, -1], rot: [0, 0.3, 0], scale: [1, 1, 1], delay: 0 },
  { pos: [0, 0.5, 0.5], rot: [0, 0, 0], scale: [1.2, 1.2, 1], delay: 1 },
  { pos: [2.8, -0.2, -0.5], rot: [0, -0.25, 0], scale: [0.9, 0.9, 1], delay: 2 },
  { pos: [-1, -1, 2], rot: [0.1, 0.5, 0], scale: [0.7, 0.7, 1], delay: 3 },
  { pos: [3.5, 1.5, -2], rot: [-0.05, -0.4, 0], scale: [0.6, 0.8, 1], delay: 4 },
];

export default function GlassmorphismScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.04;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.06;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.06;
  });

  return (
    <>
      <Environment preset="city" />
      <fog attach="fog" args={["#060810", 10, 35]} />

      <ambientLight intensity={0.06} />
      <pointLight position={[0, 8, 4]} intensity={0.8} color="#8090c0" distance={25} />
      <pointLight position={[-5, 3, -3]} intensity={0.4} color="#a080d0" distance={18} />
      <pointLight position={[6, -2, 2]} intensity={0.3} color="#60a0d0" distance={15} />

      {PANELS.map((p, i) => (
        <group key={i}>
          <GlassPanel
            position={p.pos}
            rotation={p.rot}
            scale={p.scale}
            delay={p.delay}
            scrollProgress={scrollProgress}
            mousePos={mousePos}
          />
          <GlassEdge
            position={p.pos}
            rotation={p.rot}
            scale={p.scale}
          />
        </group>
      ))}

      <HolographicOrb scrollProgress={scrollProgress} />

      <VolumetricBeam position={[-3, 4, -2]} rotation={[0.3, 0, 0.1]} color="#8090c0" width={0.5} height={12} />
      <VolumetricBeam position={[2, 5, -1]} rotation={[0.2, 0.3, -0.1]} color="#a080d0" width={0.4} height={14} />
      <VolumetricBeam position={[0, 6, 0]} rotation={[0.1, 0, 0]} color="#60a0d0" width={0.6} height={16} />

      <PrismParticles />
    </>
  );
}
