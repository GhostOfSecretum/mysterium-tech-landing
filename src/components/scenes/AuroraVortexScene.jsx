import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const STRAND_COUNT = 12;
const PARTICLES_PER_STRAND = 80;
const TOTAL = STRAND_COUNT * PARTICLES_PER_STRAND;

const auroraVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  vec3 hash3(vec2 p) {
    vec3 q = vec3(
      dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3)),
      dot(p, vec2(419.2, 371.9))
    );
    return fract(sin(q) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = dot(hash3(i).xy, f - vec2(0.0, 0.0));
    float b = dot(hash3(i + vec2(1.0, 0.0)).xy, f - vec2(1.0, 0.0));
    float c = dot(hash3(i + vec2(0.0, 1.0)).xy, f - vec2(0.0, 1.0));
    float d = dot(hash3(i + vec2(1.0, 1.0)).xy, f - vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) + 0.5;
  }

  void main() {
    vec2 uv = vUv * 3.0;
    float n1 = noise(uv + uTime * 0.15);
    float n2 = noise(uv * 2.0 - uTime * 0.1);
    float aurora = pow(n1 * n2, 1.5) * 2.0;

    vec3 c1 = vec3(0.0, 0.9, 0.7);
    vec3 c2 = vec3(0.1, 0.4, 0.9);
    vec3 c3 = vec3(0.5, 0.0, 0.8);
    vec3 col = mix(c1, c2, n1) + c3 * n2 * 0.3;
    col *= aurora;

    gl_FragColor = vec4(col, aurora * 0.18);
  }
`;

function AuroraFloor() {
  const ref = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      <planeGeometry args={[50, 50]} />
      <shaderMaterial
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function VortexCore({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const ringRefs = useRef([]);

  const rings = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        radius: 1.2 + i * 0.7,
        tubeRadius: 0.02 + i * 0.005,
        speed: 0.3 - i * 0.03,
        tilt: i * 0.15,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1 + mx * 0.4;
      groupRef.current.rotation.x = my * 0.3;
    }

    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      const d = rings[i];
      ring.rotation.z = t * d.speed * (i % 2 ? 1 : -1);
      ring.rotation.x = Math.sin(t * 0.5 + i) * d.tilt + scroll * 0.5;
      const s = 1 + scroll * 0.15 + Math.sin(t * 0.8 + i * 0.7) * 0.05;
      ring.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
        >
          <torusGeometry args={[ring.radius, ring.tubeRadius, 32, 128]} />
          <meshPhysicalMaterial
            color={i % 3 === 0 ? "#00e6c8" : i % 3 === 1 ? "#2266ff" : "#8800dd"}
            metalness={0.9}
            roughness={0.1}
            emissive={i % 3 === 0 ? "#00e6c8" : i % 3 === 1 ? "#2266ff" : "#8800dd"}
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
            envMapIntensity={2}
          />
        </mesh>
      ))}
    </group>
  );
}

function VortexParticles({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: TOTAL }, (_, i) => {
        const strand = Math.floor(i / PARTICLES_PER_STRAND);
        const idx = i % PARTICLES_PER_STRAND;
        const t = idx / PARTICLES_PER_STRAND;
        return {
          strand,
          t,
          baseAngle: (strand / STRAND_COUNT) * Math.PI * 2,
          radius: 1.5 + t * 5,
          height: (t - 0.5) * 8,
          speed: 0.3 + Math.random() * 0.4,
          size: 0.02 + Math.random() * 0.06,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(TOTAL * 3);
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      const hue = 0.45 + p.strand * 0.04 + p.t * 0.15;
      color.setHSL(hue % 1, 0.8, 0.5 + p.t * 0.3);
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [particles]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    particles.forEach((p, i) => {
      const angle = p.baseAngle + time * p.speed + p.t * 3 + scroll * 4;
      const r = p.radius + Math.sin(time * 0.5 + p.phase) * 0.5;
      const y = p.height + Math.sin(time * 0.7 + p.phase) * 0.8;

      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const s = p.size * (0.8 + Math.sin(time * 2 + p.phase) * 0.4);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, TOTAL]}>
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

export default function AuroraVortexScene() {
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
      <fog attach="fog" args={["#020810", 8, 40]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 5, 0]} intensity={1} color="#00e6c8" distance={25} />
      <pointLight position={[-5, -3, 4]} intensity={0.6} color="#4400cc" distance={20} />
      <pointLight position={[5, 2, -4]} intensity={0.4} color="#0066ff" distance={18} />

      <VortexCore scrollProgress={scrollProgress} mousePos={mousePos} />
      <VortexParticles scrollProgress={scrollProgress} />
      <AuroraFloor />
    </>
  );
}
