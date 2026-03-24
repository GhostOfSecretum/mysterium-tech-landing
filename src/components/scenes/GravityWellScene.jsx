import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const ORBIT_COUNT = 400;
const RING_LAYERS = 8;

const lensVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lensFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float ring = sin(dist * 40.0 - uTime * 2.0) * 0.5 + 0.5;
    ring *= smoothstep(0.5, 0.1, dist);
    float glow = exp(-dist * 4.0) * 0.6;

    vec3 col = mix(
      vec3(0.0, 0.55, 0.65),
      vec3(0.25, 0.88, 0.82),
      ring
    );
    col += vec3(0.8, 0.95, 1.0) * glow;

    float alpha = (ring * 0.15 + glow * 0.4) * smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(col, alpha);
  }
`;

function EventHorizon({ scrollProgress, mousePos }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1 + mx * 0.3;
      meshRef.current.rotation.x = my * 0.2;
      const s = 1 + Math.sin(t * 0.4) * 0.05 + scroll * 0.2;
      meshRef.current.scale.setScalar(s);
    }

    if (glowRef.current) {
      glowRef.current.rotation.z = t * 0.05;
      glowRef.current.scale.setScalar(1 + scroll * 0.3 + Math.sin(t * 0.6) * 0.08);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshPhysicalMaterial
          color="#020408"
          metalness={1}
          roughness={0.05}
          envMapIntensity={0.5}
        />
      </mesh>

      <mesh ref={glowRef} position={[0, 0, -0.1]}>
        <planeGeometry args={[10, 10]} />
        <shaderMaterial
          vertexShader={lensVertexShader}
          fragmentShader={lensFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function AccretionDisc({ scrollProgress }) {
  const groupRef = useRef();

  const rings = useMemo(
    () =>
      Array.from({ length: RING_LAYERS }, (_, i) => ({
        radius: 2.5 + i * 0.6,
        tubeRadius: 0.12 + i * 0.02,
        speed: 0.2 - i * 0.015,
        tilt: 0.05 + i * 0.02,
        hue: 0.47 + i * 0.02,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((ring, i) => {
      const d = rings[i];
      ring.rotation.z = t * d.speed * (i % 2 ? 1 : -1);
      ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + i) * d.tilt;
      ring.scale.setScalar(1 + scroll * 0.15);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => {
        const color = new THREE.Color().setHSL(ring.hue, 0.7, 0.35 + i * 0.04);
        const emissive = new THREE.Color().setHSL(ring.hue, 0.9, 0.25);
        return (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ring.radius, ring.tubeRadius, 16, 128]} />
            <meshPhysicalMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={0.35 - i * 0.02}
              envMapIntensity={1.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function OrbitingParticles({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: ORBIT_COUNT }, () => {
        const orbitRadius = 2 + Math.random() * 6;
        const orbitSpeed = (0.3 + Math.random() * 0.8) / Math.sqrt(orbitRadius);
        return {
          orbitRadius,
          orbitSpeed,
          angle: Math.random() * Math.PI * 2,
          inclination: (Math.random() - 0.5) * 0.4,
          size: 0.01 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
          eccentricity: 0.8 + Math.random() * 0.4,
        };
      }),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(ORBIT_COUNT * 3);
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      const closeness = 1 - (p.orbitRadius - 2) / 6;
      color.setHSL(0.47 + closeness * 0.08, 0.8, 0.4 + closeness * 0.4);
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [particles]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    particles.forEach((p, i) => {
      const a = p.angle + t * p.orbitSpeed;
      const r = p.orbitRadius * (1 + scroll * 0.2);
      const rx = r * p.eccentricity;
      const ry = r;

      const x = Math.cos(a) * rx;
      const z = Math.sin(a) * ry;
      const y = Math.sin(a * 2 + p.phase) * p.inclination * r;

      dummy.position.set(x, y, z);
      const s = p.size * (0.7 + Math.sin(t * 3 + p.phase) * 0.3);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, ORBIT_COUNT]}>
      <sphereGeometry args={[1, 6, 6]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.7}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function GravityStreaks() {
  const groupRef = useRef();

  const streaks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const r = 1.5;
      result.push({
        start: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r),
        angle,
        length: 3 + Math.random() * 4,
      });
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.rotation.y = t * 0.03;
  });

  return (
    <group ref={groupRef}>
      {streaks.map((s, i) => {
        const dir = new THREE.Vector3(Math.cos(s.angle), 0, Math.sin(s.angle));
        const end = s.start.clone().add(dir.multiplyScalar(s.length));
        const mid = new THREE.Vector3().addVectors(s.start, end).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize(),
        );

        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.005, 0.001, s.length, 4]} />
            <meshBasicMaterial
              color="#40e0d0"
              transparent
              opacity={0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function GravityWellScene() {
  const scrollProgress = useRef(0);
  const mousePos = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    const next = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (next - scrollProgress.current) * 0.04;
    mousePos.current.x += (pointer.x - mousePos.current.x) * 0.06;
    mousePos.current.y += (pointer.y - mousePos.current.y) * 0.06;
  });

  return (
    <>
      <Environment preset="night" />
      <fog attach="fog" args={["#010408", 8, 40]} />
      <ambientLight intensity={0.04} />
      <pointLight position={[0, 3, 0]} intensity={1.2} color="#40e0d0" distance={20} />
      <pointLight position={[-5, -2, 5]} intensity={0.5} color="#1a8fa8" distance={18} />
      <pointLight position={[5, 2, -5]} intensity={0.3} color="#d4a843" distance={15} />

      <EventHorizon scrollProgress={scrollProgress} mousePos={mousePos} />
      <AccretionDisc scrollProgress={scrollProgress} />
      <OrbitingParticles scrollProgress={scrollProgress} />
      <GravityStreaks />
    </>
  );
}
