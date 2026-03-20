import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

const causticsVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const causticsFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  float voronoi(vec2 p) {
    vec2 g = floor(p);
    vec2 f = fract(p);
    float d = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec2 r = o + sin(g + o + uTime * 0.4) * 0.5 - f;
        d = min(d, dot(r, r));
      }
    }
    return sqrt(d);
  }

  void main() {
    vec2 uv = vUv * 6.0;
    float v1 = voronoi(uv);
    float v2 = voronoi(uv * 1.5 + 3.0);
    float caustic = pow(1.0 - v1, 3.0) * 0.6 + pow(1.0 - v2, 4.0) * 0.4;
    vec3 color = mix(
      vec3(0.85, 0.88, 0.92),
      vec3(0.95, 0.97, 1.0),
      caustic
    ) * caustic * 0.4;
    gl_FragColor = vec4(color, caustic * 0.25);
  }
`;

function ChromeKnot({ scrollProgress, mousePos }) {
  const meshRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.08 + mousePos.current.y * 0.3;
      meshRef.current.rotation.y = t * 0.12 + mousePos.current.x * 0.3;
      const breathe = 1 + Math.sin(t * 0.6) * 0.02;
      meshRef.current.scale.setScalar(breathe * (1 + scroll * 0.15));
    }

    if (innerRef.current) {
      innerRef.current.rotation.x = -t * 0.15;
      innerRef.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow receiveShadow>
        <torusKnotGeometry args={[2, 0.6, 256, 64, 2, 3]} />
        <meshPhysicalMaterial
          color="#c0c4cc"
          metalness={1}
          roughness={0.03}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={1}
        />
      </mesh>

      <mesh ref={innerRef}>
        <torusKnotGeometry args={[2, 0.62, 128, 32, 2, 3]} />
        <meshBasicMaterial
          color="#e8ecf2"
          wireframe
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CausticFloor({ scrollProgress }) {
  const meshRef = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <shaderMaterial
        vertexShader={causticsVertexShader}
        fragmentShader={causticsFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function FloatingAccent({ position, radius, speed, delay }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * speed + delay) * 0.5;
      meshRef.current.rotation.x = t * 0.3;
      meshRef.current.rotation.z = t * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshPhysicalMaterial
        color="#d4d8e0"
        metalness={1}
        roughness={0.01}
        envMapIntensity={4}
        clearcoat={1}
        clearcoatRoughness={0.01}
      />
    </mesh>
  );
}

function VolumetricRays() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.02;
    }
  });

  const rays = useMemo(() => {
    const r = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      r.push({
        position: [Math.cos(angle) * 8, 6, Math.sin(angle) * 8],
        rotation: [Math.PI * 0.3, angle, 0],
      });
    }
    return r;
  }, []);

  return (
    <group ref={groupRef}>
      {rays.map((ray, i) => (
        <mesh key={i} position={ray.position} rotation={ray.rotation}>
          <planeGeometry args={[0.3, 16]} />
          <meshBasicMaterial
            color="#e0e4ec"
            transparent
            opacity={0.03}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ChromeLuxuryScene() {
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
      <Environment preset="studio" />
      <fog attach="fog" args={["#0a0a0f", 12, 35]} />

      <ambientLight intensity={0.08} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1.2}
        color="#e8ecf5"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-6, 4, -4]} intensity={0.4} color="#8890a8" distance={20} />
      <pointLight position={[4, -2, 6]} intensity={0.3} color="#a0a8c0" distance={15} />

      <ChromeKnot scrollProgress={scrollProgress} mousePos={mousePos} />
      <CausticFloor scrollProgress={scrollProgress} />

      <FloatingAccent position={[-5, 1.5, -3]} radius={0.25} speed={0.8} delay={0} />
      <FloatingAccent position={[4.5, 2, -2]} radius={0.18} speed={1.1} delay={1.5} />
      <FloatingAccent position={[-3, -1, 4]} radius={0.15} speed={0.9} delay={3} />
      <FloatingAccent position={[5, -0.5, 3]} radius={0.12} speed={1.3} delay={4.5} />

      <VolumetricRays />
    </>
  );
}
