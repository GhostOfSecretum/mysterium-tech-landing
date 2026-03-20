import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function HUDRing({ radius, segments, speed, color, tilt, thickness, dashes }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const points = [];
    const dashLen = (Math.PI * 2) / dashes;
    const gapRatio = 0.3;
    for (let d = 0; d < dashes; d++) {
      const startAngle = d * dashLen;
      const endAngle = startAngle + dashLen * (1 - gapRatio);
      const steps = Math.ceil(segments / dashes);
      for (let s = 0; s <= steps; s++) {
        const angle = startAngle + (s / steps) * (endAngle - startAngle);
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius, segments, dashes]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.z = t * speed;
    }
  });

  return (
    <group rotation={tilt}>
      <line ref={meshRef} geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>
    </group>
  );
}

function GlowingTorus({ radius, tube, color, speed, tilt, scrollProgress }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.z = t * speed;
      const spread = scrollProgress.current * 0.5;
      meshRef.current.scale.setScalar(1 + spread * 0.3);
      meshRef.current.material.opacity = 0.12 - spread * 0.04;
    }
  });

  return (
    <mesh ref={meshRef} rotation={tilt}>
      <torusGeometry args={[radius, tube, 16, 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

const dataStreamVertexShader = /* glsl */ `
  attribute float aOffset;
  uniform float uTime;
  uniform float uRadius;
  varying float vAlpha;

  void main() {
    float angle = aOffset * 6.28318 + uTime * 0.5;
    float y = mod(aOffset * 10.0 + uTime * 0.8, 10.0) - 5.0;
    vec3 pos = vec3(cos(angle) * uRadius, y, sin(angle) * uRadius);
    vAlpha = smoothstep(5.0, 3.0, abs(y)) * (0.5 + 0.5 * sin(uTime * 3.0 + aOffset * 20.0));
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0 * (8.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const dataStreamFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float alpha = (1.0 - d * d) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function DataStream({ radius, color, count }) {
  const pointsRef = useRef();

  const { offsets, uniforms } = useMemo(() => {
    const off = new Float32Array(count);
    for (let i = 0; i < count; i++) off[i] = Math.random();
    return {
      offsets: off,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: radius },
        uColor: { value: new THREE.Color(color) },
      },
    };
  }, [count, radius, color]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={new Float32Array(count * 3)} itemSize={3} />
        <bufferAttribute attach="attributes-aOffset" count={count} array={offsets} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={dataStreamVertexShader}
        fragmentShader={dataStreamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function HolographicCore({ scrollProgress, mousePos }) {
  const groupRef = useRef();
  const innerRef = useRef();
  const outerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1 + mousePos.current.x * 0.3;
      groupRef.current.rotation.x = mousePos.current.y * 0.15;
    }
    if (innerRef.current) {
      const pulse = 0.8 + Math.sin(t * 2) * 0.2;
      innerRef.current.scale.setScalar(pulse);
      innerRef.current.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
    }
    if (outerRef.current) {
      outerRef.current.rotation.x = t * 0.2;
      outerRef.current.rotation.z = t * 0.15;
      outerRef.current.material.opacity = 0.05 + Math.sin(t * 1.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial
          color="#00ffaa"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={outerRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial
          color="#00cc88"
          wireframe
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GridFloor() {
  const gridRef = useRef();

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.06 + Math.sin(clock.getElapsedTime() * 0.5) * 0.02;
    }
  });

  const geometry = useMemo(() => {
    const points = [];
    const size = 30;
    const divisions = 40;
    const step = size / divisions;
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      points.push(new THREE.Vector3(i * step, 0, -size / 2));
      points.push(new THREE.Vector3(i * step, 0, size / 2));
      points.push(new THREE.Vector3(-size / 2, 0, i * step));
      points.push(new THREE.Vector3(size / 2, 0, i * step));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <lineSegments ref={gridRef} geometry={geometry} position={[0, -5, 0]}>
      <lineBasicMaterial
        color="#00ffaa"
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function ScanPulse() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const cycle = (t * 0.3) % 1;
      const radius = cycle * 12;
      meshRef.current.scale.set(radius, radius, 1);
      meshRef.current.material.opacity = (1 - cycle) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.9, 0]}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial
        color="#00ffaa"
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FloatingGlyphs({ scrollProgress }) {
  const groupRef = useRef();
  const glyphs = useMemo(() => {
    const g = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const r = 5 + Math.random() * 3;
      g.push({
        pos: [Math.cos(angle) * r, (Math.random() - 0.5) * 6, Math.sin(angle) * r],
        size: 0.05 + Math.random() * 0.1,
        speed: 0.5 + Math.random(),
      });
    }
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.03;
      groupRef.current.children.forEach((child, i) => {
        const g = glyphs[i];
        child.position.y = g.pos[1] + Math.sin(t * g.speed + i) * 0.5;
        child.material.opacity = 0.15 + Math.sin(t * 2 + i * 0.5) * 0.1;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {glyphs.map((g, i) => (
        <mesh key={i} position={g.pos}>
          <planeGeometry args={[g.size * 4, g.size * 6]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? "#00ffaa" : i % 3 === 1 ? "#0088ff" : "#00ccaa"}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SciFiInterfaceScene() {
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
      <fog attach="fog" args={["#020408", 8, 35]} />

      <ambientLight intensity={0.02} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#00ffaa" distance={20} />
      <pointLight position={[5, -2, 5]} intensity={0.3} color="#0066ff" distance={15} />

      <HolographicCore scrollProgress={scrollProgress} mousePos={mousePos} />

      <HUDRing radius={3} segments={128} speed={0.15} color="#00ffaa" tilt={[0, 0, 0]} thickness={0.02} dashes={8} />
      <HUDRing radius={3.5} segments={128} speed={-0.1} color="#0088ff" tilt={[0.3, 0, 0]} thickness={0.015} dashes={12} />
      <HUDRing radius={4.2} segments={128} speed={0.08} color="#00ccaa" tilt={[-0.2, 0.1, 0.1]} thickness={0.01} dashes={16} />
      <HUDRing radius={5} segments={128} speed={-0.05} color="#004488" tilt={[0.5, -0.2, 0]} thickness={0.008} dashes={24} />

      <GlowingTorus radius={2.5} tube={0.03} color="#00ffaa" speed={0.2} tilt={[Math.PI / 2, 0, 0]} scrollProgress={scrollProgress} />
      <GlowingTorus radius={3.8} tube={0.02} color="#0066ff" speed={-0.12} tilt={[Math.PI / 2 + 0.3, 0.2, 0]} scrollProgress={scrollProgress} />

      <DataStream radius={3.2} color="#00ffaa" count={300} />
      <DataStream radius={4.5} color="#0088ff" count={200} />

      <GridFloor />
      <ScanPulse />
      <FloatingGlyphs scrollProgress={scrollProgress} />
    </>
  );
}
