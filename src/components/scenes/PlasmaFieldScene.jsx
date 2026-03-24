import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const plasmaVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDisplacement;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normal;
    vec3 pos = position;

    float n1 = snoise(pos * 0.8 + uTime * 0.2);
    float n2 = snoise(pos * 1.6 - uTime * 0.15);
    float n3 = snoise(pos * 3.2 + uTime * 0.3);

    float displacement = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
    displacement *= 1.0 + uScroll * 0.8;

    vDisplacement = displacement;
    pos += normal * displacement * 0.8;
    vPosition = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const plasmaFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDisplacement;

  void main() {
    float d = vDisplacement;

    vec3 cold = vec3(0.0, 0.15, 0.3);
    vec3 teal = vec3(0.0, 0.85, 0.75);
    vec3 hot = vec3(0.25, 0.5, 1.0);
    vec3 white = vec3(0.8, 0.95, 1.0);

    float t = d * 0.5 + 0.5;
    vec3 col;
    if (t < 0.3) {
      col = mix(cold, teal, t / 0.3);
    } else if (t < 0.6) {
      col = mix(teal, hot, (t - 0.3) / 0.3);
    } else {
      col = mix(hot, white, (t - 0.6) / 0.4);
    }

    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
    col += fresnel * teal * 0.4;

    float pulse = sin(uTime * 2.0 + vPosition.y * 3.0) * 0.1 + 0.9;
    col *= pulse;

    float alpha = 0.7 + fresnel * 0.3;
    gl_FragColor = vec4(col, alpha);
  }
`;

function PlasmaSphere({ scrollProgress, mousePos }) {
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
      meshRef.current.rotation.y = t * 0.06 + mousePos.current.x * 0.3;
      meshRef.current.rotation.x = t * 0.04 + mousePos.current.y * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[3, 64]} />
      <shaderMaterial
        vertexShader={plasmaVertexShader}
        fragmentShader={plasmaFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const EMBER_COUNT = 150;

function PlasmaEmbers({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 3.5 + Math.random() * 4,
        y: (Math.random() - 0.5) * 8,
        speed: 0.1 + Math.random() * 0.3,
        size: 0.02 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
        drift: 0.5 + Math.random() * 1.5,
      })),
    [],
  );

  const colors = useMemo(() => {
    const arr = new Float32Array(EMBER_COUNT * 3);
    const color = new THREE.Color();
    embers.forEach((_, i) => {
      const hue = 0.45 + Math.random() * 0.12;
      color.setHSL(hue, 0.9, 0.5 + Math.random() * 0.3);
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [embers]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    embers.forEach((e, i) => {
      const a = e.angle + t * e.speed;
      const r = e.radius + Math.sin(t * e.drift + e.phase) * 0.8 + scroll * 2;
      const y = e.y + Math.sin(t * 0.6 + e.phase) * 1.2;

      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      const s = e.size * (0.6 + Math.sin(t * 3 + e.phase) * 0.4);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, EMBER_COUNT]}>
      <sphereGeometry args={[1, 6, 6]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default function PlasmaFieldScene() {
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
      <fog attach="fog" args={["#010510", 8, 35]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 0, 5]} intensity={1.5} color="#00ccaa" distance={20} />
      <pointLight position={[-5, 5, -5]} intensity={0.6} color="#2244ff" distance={18} />
      <pointLight position={[5, -3, 3]} intensity={0.4} color="#40e0d0" distance={15} />

      <PlasmaSphere scrollProgress={scrollProgress} mousePos={mousePos} />
      <PlasmaEmbers scrollProgress={scrollProgress} />
    </>
  );
}
