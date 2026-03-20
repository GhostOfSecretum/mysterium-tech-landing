import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

const sssVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldNormal;
  varying float vNoise;

  vec3 mod289v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permutev(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrtv(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

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
    i = mod289v(i);
    vec4 p = permutev(permutev(permutev(
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
    vec4 norm = taylorInvSqrtv(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    float n = snoise(position * 0.8 + uTime * 0.15);
    vNoise = n;
    vec3 displaced = position + normal * n * 0.4;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
    vViewPos = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const sssFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLightPos;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vWorldNormal;
  varying float vNoise;

  void main() {
    vec3 lightDir = normalize(uLightPos - vViewPos);
    vec3 viewDir = normalize(-vViewPos);

    float NdotL = max(dot(vNormal, lightDir), 0.0);
    float wrap = max(0.0, (dot(vNormal, lightDir) + 0.5) / 1.5);

    float sss = pow(max(0.0, dot(viewDir, -lightDir + vNormal * 0.3)), 3.0) * 0.6;

    vec3 skinBase = vec3(0.92, 0.82, 0.76);
    vec3 skinDeep = vec3(0.85, 0.55, 0.45);
    vec3 skinHighlight = vec3(1.0, 0.95, 0.92);

    vec3 color = skinBase * wrap;
    color += skinDeep * sss;
    color += skinHighlight * pow(NdotL, 8.0) * 0.4;

    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    color += vec3(0.9, 0.85, 0.95) * fresnel * 0.25;

    float veinPattern = smoothstep(0.2, 0.5, vNoise) * 0.08;
    color = mix(color, skinDeep * 0.8, veinPattern);

    float ao = 0.7 + 0.3 * NdotL;
    color *= ao;

    gl_FragColor = vec4(color, 0.92);
  }
`;

function OrganicBlob({ position, scale, speed, scrollProgress, mousePos }) {
  const meshRef = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector3(5, 8, 6) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(t * speed * 0.3) * 0.15;
      meshRef.current.rotation.y = t * speed * 0.1;

      const breathe = 1 + Math.sin(t * speed * 0.5) * 0.03;
      const s = scale * breathe;
      meshRef.current.scale.setScalar(s);

      meshRef.current.position.y = position[1] + Math.sin(t * speed * 0.4) * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        vertexShader={sssVertexShader}
        fragmentShader={sssFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

function SoftBlobDrei({ position, color, scale, speed, distort }) {
  const meshRef = useRef();
  const matRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * speed * 0.08;
      meshRef.current.position.y = position[1] + Math.sin(t * speed * 0.3 + position[0]) * 0.25;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        ref={matRef}
        color={color}
        roughness={0.7}
        metalness={0.05}
        distort={distort}
        speed={speed}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

function SoftShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        color="#f0e8e0"
        roughness={1}
        metalness={0}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

function FloatingSpores() {
  const pointsRef = useRef();
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.002;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#c8a090"
        size={0.04}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function BiomorphicScene() {
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
      <Environment preset="apartment" />
      <fog attach="fog" args={["#f5ede5", 8, 30]} />

      <ambientLight intensity={0.4} color="#f0e8e0" />
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.5}
        color="#fff5ee"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.001}
      />
      <pointLight position={[-4, 3, 4]} intensity={0.5} color="#e0c0a0" distance={15} />
      <pointLight position={[3, -2, -3]} intensity={0.3} color="#d0a090" distance={12} />

      <OrganicBlob position={[0, 0, 0]} scale={2.2} speed={1} scrollProgress={scrollProgress} mousePos={mousePos} />

      <SoftBlobDrei position={[-4, 1, -2]} color="#e8c8b8" scale={[1.2, 1.2, 1.2]} speed={1.5} distort={0.4} />
      <SoftBlobDrei position={[3.5, -0.5, -1]} color="#d4a898" scale={[0.9, 0.9, 0.9]} speed={2} distort={0.35} />
      <SoftBlobDrei position={[-2, -2, 1.5]} color="#c8b8a8" scale={[0.7, 0.7, 0.7]} speed={1.8} distort={0.3} />
      <SoftBlobDrei position={[4.5, 2, -3]} color="#e0d0c0" scale={[0.5, 0.5, 0.5]} speed={2.2} distort={0.45} />

      <SoftShadowPlane />
      <FloatingSpores />
    </>
  );
}
