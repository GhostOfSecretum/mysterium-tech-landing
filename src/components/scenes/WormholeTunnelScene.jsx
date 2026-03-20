import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const tunnelVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tunnelFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uMouse;
  varying vec2 vUv;

  #define PI 3.14159265359

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x += uMouse.x * 0.15;
    uv.y += uMouse.y * 0.15;

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    float tunnelDepth = 1.0 / (radius + 0.001);
    float tunnelAngle = angle / PI;

    float scroll = uScroll * 8.0;
    vec2 tunnelUV = vec2(tunnelDepth * 0.5 + uTime * 0.3 + scroll, tunnelAngle);

    float n = fbm(tunnelUV * 3.0);
    float n2 = fbm(tunnelUV * 6.0 + 3.14);

    vec3 color1 = vec3(0.0, 0.9, 0.62);
    vec3 color2 = vec3(0.24, 0.42, 1.0);
    vec3 color3 = vec3(0.64, 0.2, 1.0);

    float ringPattern = sin(tunnelDepth * 2.0 - uTime * 2.0 - scroll * 2.0) * 0.5 + 0.5;
    float spiralPattern = sin(angle * 4.0 + tunnelDepth * 3.0 - uTime * 1.5) * 0.5 + 0.5;

    vec3 baseColor = mix(color1, color2, n);
    baseColor = mix(baseColor, color3, spiralPattern * 0.4);
    baseColor += vec3(1.0) * ringPattern * 0.15 * (1.0 - radius);

    float distortion = fbm(vec2(angle * 2.0, tunnelDepth + uTime * 0.2)) * 0.3;
    baseColor += distortion * color1 * 0.5;

    float vignette = 1.0 - smoothstep(0.0, 1.5, radius);
    float centerGlow = smoothstep(0.3, 0.0, radius) * (0.5 + 0.5 * sin(uTime * 2.0));
    baseColor += vec3(1.0, 1.0, 1.0) * centerGlow * 0.4;

    float edgeGlow = smoothstep(0.8, 1.2, radius);
    baseColor = mix(baseColor, vec3(0.0), edgeGlow);

    float alpha = vignette * (0.6 + n2 * 0.4);

    gl_FragColor = vec4(baseColor * vignette, alpha);
  }
`;

function TunnelPlane({ scrollProgress, mousePos }) {
  const meshRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uScroll.value = scrollProgress.current;
    uniforms.uMouse.value.set(mousePos.current.x, mousePos.current.y);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[30, 30]} />
      <shaderMaterial
        vertexShader={tunnelVertexShader}
        fragmentShader={tunnelFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function HyperParticles({ scrollProgress }) {
  const pointsRef = useRef();
  const count = 600;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 8;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = -(0.5 + Math.random() * 2);
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += velocities[i * 3 + 2] * 0.1;
      if (arr[i * 3 + 2] < -15) {
        arr[i * 3 + 2] = 15;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00e59e"
        size={0.06}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function TunnelRings({ scrollProgress }) {
  const groupRef = useRef();
  const ringCount = 12;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((ring, i) => {
      const z = ((i / ringCount) * 20 - 10 + t * 2 + scrollProgress.current * 10) % 20 - 10;
      ring.position.z = z;
      const dist = Math.abs(z);
      const scale = Math.max(0.1, 1.0 - dist / 12);
      ring.scale.setScalar(scale);
      ring.material.opacity = scale * 0.2;
      ring.rotation.z = t * 0.3 + i * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <mesh key={i} position={[0, 0, (i / ringCount) * 20 - 10]}>
          <torusGeometry args={[3 + i * 0.2, 0.02, 8, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#00e59e" : "#3d6bff"}
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function WormholeTunnelScene() {
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
      <TunnelPlane scrollProgress={scrollProgress} mousePos={mousePos} />
      <TunnelRings scrollProgress={scrollProgress} />
      <HyperParticles scrollProgress={scrollProgress} />
    </>
  );
}
