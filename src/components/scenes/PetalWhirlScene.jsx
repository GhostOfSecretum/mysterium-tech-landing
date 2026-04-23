import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const PETAL_COUNT = 200;
const GLOW_COUNT = 60;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float glow = 0.04 / (dist + 0.05);
    float pulse = 0.8 + sin(uTime * 2.0) * 0.2;
    vec3 color = mix(
      vec3(0.95, 0.3, 0.5),
      vec3(0.8, 0.5, 0.95),
      sin(uTime * 0.5) * 0.5 + 0.5
    ) * glow * pulse * 0.15;
    gl_FragColor = vec4(color, glow * 0.12);
  }
`;

function CentralGlow({ mousePos }) {
  const meshRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[3, 32, 32]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PetalVortex({ scrollProgress, mousePos }) {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, (_, i) => {
        const t = i / PETAL_COUNT;
        return {
          baseRadius: 1 + t * 6,
          baseY: (Math.random() - 0.5) * 8,
          speed: 0.15 + (1 - t) * 0.35,
          phase: Math.random() * Math.PI * 2,
          wobbleAmp: 0.2 + Math.random() * 0.6,
          wobbleSpeed: 0.5 + Math.random() * 1.5,
          tumble: 0.3 + Math.random() * 2,
          size: 0.04 + Math.random() * 0.1,
          drift: (Math.random() - 0.5) * 0.15,
        };
      }),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(PETAL_COUNT * 3);
    const c = new THREE.Color();
    const palette = [
      "#f04070", "#e86090", "#f2a0b5", "#d94f72",
      "#f5c6d0", "#c87adb", "#f8e8e0", "#e8708a",
      "#ff88a8", "#d060a0", "#f0b0c8", "#ffd0d8",
    ];
    for (let i = 0; i < PETAL_COUNT; i++) {
      c.set(palette[Math.floor(Math.random() * palette.length)]);
      c.toArray(arr, i * 3);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;
    const mesh = instancedRef.current;
    if (!mesh) return;

    const windAngle = mx * 0.5;
    const windLift = my * 0.3;

    for (let i = 0; i < PETAL_COUNT; i++) {
      const p = petals[i];
      const angle = t * p.speed + p.phase + scroll * 2;
      const r = p.baseRadius * (0.8 + scroll * 0.3) +
        Math.sin(t * p.wobbleSpeed + p.phase) * p.wobbleAmp;

      const spiralY = p.baseY +
        Math.sin(t * 0.4 + p.phase) * 0.8 +
        t * p.drift + windLift;
      const wrappedY = ((spiralY % 8) + 8) % 8 - 4;

      dummy.position.set(
        Math.cos(angle + windAngle) * r,
        wrappedY,
        Math.sin(angle + windAngle) * r,
      );
      dummy.rotation.set(
        t * p.tumble + p.phase,
        t * p.tumble * 0.6,
        Math.sin(t * 1.5 + p.phase) * 0.8,
      );
      dummy.scale.set(p.size * 2.8, p.size * 0.4, p.size * 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, PETAL_COUNT]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshPhysicalMaterial
        vertexColors
        roughness={0.35}
        metalness={0.02}
        envMapIntensity={1.3}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      >
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </meshPhysicalMaterial>
    </instancedMesh>
  );
}

function GlowOrbs() {
  const instancedRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const orbs = useMemo(
    () =>
      Array.from({ length: GLOW_COUNT }, () => ({
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 12,
        speed: 0.8 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        size: 0.02 + Math.random() * 0.06,
        floatSpeed: 0.2 + Math.random() * 0.5,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = instancedRef.current;
    if (!mesh) return;

    for (let i = 0; i < GLOW_COUNT; i++) {
      const o = orbs[i];
      dummy.position.set(
        o.x + Math.sin(t * o.floatSpeed + o.phase) * 0.5,
        o.y + Math.cos(t * o.floatSpeed * 0.7 + o.phase) * 0.3,
        o.z,
      );
      const pulse = Math.max(0, Math.sin(t * o.speed + o.phase));
      dummy.scale.setScalar(o.size * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[null, null, GLOW_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color="#ffc0d8"
        transparent
        opacity={0.5}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function PetalWhirlScene() {
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
      <Environment preset="sunset" />
      <fog attach="fog" args={["#100610", 6, 26]} />

      <ambientLight intensity={0.15} color="#ffe0e8" />
      <directionalLight position={[4, 8, 6]} intensity={1} color="#fff0e0" castShadow />
      <pointLight position={[-5, 3, -4]} intensity={0.5} color="#f080a0" distance={20} />
      <pointLight position={[5, -1, 5]} intensity={0.4} color="#c080e0" distance={16} />

      <CentralGlow mousePos={mousePos} />
      <PetalVortex scrollProgress={scrollProgress} mousePos={mousePos} />
      <GlowOrbs />
    </>
  );
}
