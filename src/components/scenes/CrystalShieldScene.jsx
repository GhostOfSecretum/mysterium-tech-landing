import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uMouse3D;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;
  varying float vFresnel;

  // simplex-style noise
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
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;

    float mouseProximity = 1.0 - smoothstep(0.0, 4.0, length(position - uMouse3D));
    float ripple = sin(length(position - uMouse3D) * 6.0 - uTime * 4.0) * 0.15 * mouseProximity;

    float noise = snoise(position * 1.5 + uTime * 0.2) * 0.3;
    float openAmount = uScroll * 1.5;
    float displacement = noise + ripple + openAmount * 0.3 * (0.5 + 0.5 * sin(position.y * 2.0));

    vDisplacement = displacement;

    vec3 newPos = position + normal * displacement;

    vec3 viewDir = normalize(-vPosition);
    vFresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;
  varying float vFresnel;

  void main() {
    vec3 baseColor = mix(
      vec3(0.0, 0.9, 0.62),
      vec3(0.24, 0.42, 1.0),
      0.5 + 0.5 * sin(vDisplacement * 8.0 + uTime * 0.5)
    );

    vec3 coreGlow = vec3(1.0, 1.0, 1.0) * vFresnel * 0.8;
    vec3 fresnelColor = mix(vec3(0.0, 0.9, 0.62), vec3(0.6, 0.3, 1.0), vFresnel);

    vec3 color = baseColor * 0.6 + fresnelColor * vFresnel * 1.2 + coreGlow * 0.3;

    float pulse = 0.7 + 0.3 * sin(uTime * 1.5 + vDisplacement * 4.0);
    float alpha = 0.35 + vFresnel * 0.5 + pulse * 0.15;

    gl_FragColor = vec4(color, alpha);
  }
`;

const coreVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  void main() {
    vPos = position;
    vec3 p = position;
    p += normal * sin(uTime * 2.0 + position.y * 4.0) * 0.15;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const coreFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec3 vPos;
  void main() {
    float dist = length(vPos);
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + dist * 6.0);
    vec3 color = mix(vec3(0.0, 0.9, 0.62), vec3(1.0, 1.0, 1.0), pulse * 0.6);
    float alpha = (0.3 + pulse * 0.5) * smoothstep(0.0, 0.5, uScroll);
    gl_FragColor = vec4(color, alpha);
  }
`;

function CrystalShield({ scrollProgress, mouseWorld }) {
  const meshRef = useRef();
  const coreRef = useRef();

  const shieldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse3D: { value: new THREE.Vector3() },
    }),
    [],
  );

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    shieldUniforms.uTime.value = t;
    shieldUniforms.uScroll.value = scrollProgress.current;
    shieldUniforms.uMouse3D.value.copy(mouseWorld.current);

    coreUniforms.uTime.value = t;
    coreUniforms.uScroll.value = scrollProgress.current;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1;
      meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[3, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={shieldUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 16]} />
        <shaderMaterial
          vertexShader={coreVertexShader}
          fragmentShader={coreFragmentShader}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function CrystalShieldScene() {
  const scrollProgress = useRef(0);
  const mouseWorld = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  useFrame(({ pointer }) => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;

    raycaster.setFromCamera(pointer, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    if (intersection) mouseWorld.current.copy(intersection);
  });

  return (
    <>
      <fog attach="fog" args={["#05050a", 10, 40]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e59e" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#3d6bff" />

      <CrystalShield scrollProgress={scrollProgress} mouseWorld={mouseWorld} />

      <Sparkles
        count={200}
        scale={20}
        size={2}
        speed={0.4}
        opacity={0.5}
        color="#00e59e"
      />
      <Sparkles
        count={150}
        scale={18}
        size={1.5}
        speed={0.3}
        opacity={0.3}
        color="#3d6bff"
      />
    </>
  );
}
