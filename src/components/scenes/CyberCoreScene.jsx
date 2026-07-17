import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/*
 * CyberCoreScene — тёмная tech-сцена с трёхслойным параллаксом:
 *   слой 1 (задний)  — звёздные частицы + перспективная сетка
 *   слой 2 (средний) — второстепенные wireframe-фигуры
 *   слой 3 (передний)— стеклянное «нейроядро»: наклон за курсором + вращение,
 *                      скорость кручения растёт от скорости мыши над объектом
 */

const BLUE = new THREE.Color("#2E5CFF");
const VIOLET = new THREE.Color("#7B2FFF");
const TEAL = new THREE.Color("#00E5D0");

const MAX_TILT = THREE.MathUtils.degToRad(15);
const CORE_RADIUS = 2.3;

const LERP_FRONT = 0.075;
const LERP_MID = 0.045;
const LERP_GLOW = 0.025;

const BASE_SPIN = 0.45; // рад/с в покое
const MAX_SPIN = 9;
const SPIN_BOOST = 14; // множитель скорости мыши → импульс вращения
const SPIN_DECAY = 0.965; // инерция: замедление к базовой скорости
const HIT_RADIUS_NDC = 0.42; // зона «прохождения мыши через объект» в NDC

function paletteColor(t, out) {
  if (t < 0.5) return out.copy(BLUE).lerp(VIOLET, t * 2);
  return out.copy(VIOLET).lerp(TEAL, (t - 0.5) * 2);
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ---------- слой 1: перспективная сетка, тающая в темноту ---------- */

const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gridFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  varying vec3 vPos;

  float gridLine(vec2 p) {
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    vec2 p = vPos.xy * 0.55;
    p.y += uTime * 0.35; // медленный дрейф сетки к горизонту
    float line = gridLine(p);

    float dist = length(vPos.xy) / 26.0;
    float fade = smoothstep(1.0, 0.05, dist);           // тает к краям
    float pulse = 0.75 + 0.25 * sin(uTime * 0.6 + vPos.y * 0.2);

    vec3 color = mix(uColorA, uColorB, clamp(vUv.y + 0.15 * sin(uTime * 0.3), 0.0, 1.0));
    float alpha = line * fade * fade * 0.32 * pulse;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function PerspectiveGrid() {
  const materialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: BLUE.clone() },
      uColorB: { value: VIOLET.clone() },
    }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, -5.5, -6]} rotation={[-Math.PI / 2.25, 0, 0]}>
      <planeGeometry args={[52, 52, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ---------- слой 1: звёздное поле ---------- */

function Starfield({ glowMap }) {
  const { positions, colors } = useMemo(() => {
    const count = 650;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 9 + Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      pos[i * 3 + 2] = -4 - Math.abs(r * Math.cos(phi)) * 0.8;
      paletteColor(Math.random(), c);
      c.multiplyScalar(0.35 + Math.random() * 0.55);
      c.toArray(col, i * 3);
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glowMap}
        vertexColors
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- слой 2: второстепенные фигуры ---------- */

const MID_SHAPES = [
  { geo: "octahedron", pos: [-6.2, 2.4, -3.5], scale: 0.9, speed: 0.25, color: "#2E5CFF" },
  { geo: "torus", pos: [5.8, -2.2, -4.5], scale: 1.15, speed: -0.18, color: "#7B2FFF" },
  { geo: "icosahedron", pos: [4.8, 3.2, -6], scale: 0.65, speed: 0.32, color: "#00E5D0" },
  { geo: "tetrahedron", pos: [-4.6, -3.4, -5], scale: 0.75, speed: -0.28, color: "#2E5CFF" },
];

function MidShape({ shape, index }) {
  const ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.rotation.x = t * shape.speed;
    ref.current.rotation.y = t * shape.speed * 1.4 + index;
    ref.current.position.y = shape.pos[1] + Math.sin(t * 0.5 + index * 2.1) * 0.35;
  });

  return (
    <mesh ref={ref} position={shape.pos} scale={shape.scale}>
      {shape.geo === "octahedron" && <octahedronGeometry args={[1, 0]} />}
      {shape.geo === "torus" && <torusGeometry args={[0.85, 0.28, 6, 14]} />}
      {shape.geo === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
      {shape.geo === "tetrahedron" && <tetrahedronGeometry args={[1, 0]} />}
      <meshBasicMaterial color={shape.color} wireframe transparent opacity={0.28} />
    </mesh>
  );
}

/* ---------- слой 3: главный объект ---------- */

function useCoreGeometry() {
  return useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(CORE_RADIUS, 1);

    // уникальные вершины — узлы «нейросети»
    const positionAttr = geometry.attributes.position;
    const seen = new Map();
    const nodes = [];
    for (let i = 0; i < positionAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
      const key = `${v.x.toFixed(3)}|${v.y.toFixed(3)}|${v.z.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        nodes.push(v);
      }
    }

    // рёбра с градиентной вершинной окраской (синий → фиолетовый → бирюзовый)
    const edges = new THREE.EdgesGeometry(geometry);
    const edgePos = edges.attributes.position;
    const edgeColors = new Float32Array(edgePos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < edgePos.count; i++) {
      const t = (edgePos.getY(i) / CORE_RADIUS + 1) / 2;
      paletteColor(THREE.MathUtils.clamp(t, 0, 1), c);
      c.toArray(edgeColors, i * 3);
    }
    edges.setAttribute("color", new THREE.BufferAttribute(edgeColors, 3));

    return { geometry, nodes, edges };
  }, []);
}

function useSatelliteLinks(nodes) {
  return useMemo(() => {
    const satellites = [];
    const rng = (seed) => {
      // детерминированный псевдорандом, чтобы сцена не «прыгала» между рендерами
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 14; i++) {
      const r = 4.2 + rng(i * 3 + 1) * 2.6;
      const theta = rng(i * 3 + 2) * Math.PI * 2;
      const phi = Math.acos(2 * rng(i * 3 + 3) - 1);
      satellites.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.8,
          r * Math.cos(phi) * 0.6,
        ),
      );
    }

    // линии-связи: спутник → ближайший узел ядра
    const linePositions = new Float32Array(satellites.length * 6);
    const lineColors = new Float32Array(satellites.length * 6);
    const c = new THREE.Color();
    satellites.forEach((sat, i) => {
      let nearest = nodes[0];
      let best = Infinity;
      for (const n of nodes) {
        const d = n.distanceToSquared(sat);
        if (d < best) {
          best = d;
          nearest = n;
        }
      }
      linePositions.set([nearest.x, nearest.y, nearest.z, sat.x, sat.y, sat.z], i * 6);
      paletteColor((nearest.y / CORE_RADIUS + 1) / 2, c);
      c.toArray(lineColors, i * 6);
      c.multiplyScalar(0.25);
      c.toArray(lineColors, i * 6 + 3);
    });

    const satPositions = new Float32Array(satellites.length * 3);
    const satColors = new Float32Array(satellites.length * 3);
    satellites.forEach((sat, i) => {
      sat.toArray(satPositions, i * 3);
      paletteColor(rng(i * 7 + 5), c);
      c.toArray(satColors, i * 3);
    });

    return { linePositions, lineColors, satPositions, satColors };
  }, [nodes]);
}

function CyberCore({ glowMap, spinRef }) {
  const groupRef = useRef();
  const innerRef = useRef();
  const innerMatRef = useRef();
  const glowSpriteRef = useRef();
  const { geometry, nodes, edges } = useCoreGeometry();
  const links = useSatelliteLinks(nodes);

  const nodePositions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const c = new THREE.Color();
    nodes.forEach((n, i) => {
      n.toArray(arr, i * 3);
      paletteColor((n.y / CORE_RADIUS + 1) / 2, c);
      c.toArray(colors, i * 3);
    });
    return { arr, colors };
  }, [nodes]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const speed = spinRef?.current?.speed ?? BASE_SPIN;
    if (groupRef.current) {
      groupRef.current.rotation.y += speed * delta;
      groupRef.current.rotation.x += speed * delta * 0.18;
      groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.06;
    }
    if (innerRef.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.07;
      innerRef.current.scale.setScalar(pulse);
      innerRef.current.rotation.y -= speed * delta * 1.4;
    }
    if (innerMatRef.current) {
      const boost = Math.min(1, Math.abs(speed) / MAX_SPIN);
      innerMatRef.current.emissiveIntensity = 1.6 + Math.sin(t * 1.6) * 0.6 + boost * 1.2;
    }
    if (glowSpriteRef.current) {
      const boost = Math.min(1, Math.abs(speed) / MAX_SPIN);
      glowSpriteRef.current.material.opacity = 0.22 + Math.sin(t * 1.6) * 0.06 + boost * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* стеклянная низкополигональная оболочка */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#101a3a"
          transmission={0.92}
          thickness={1.6}
          roughness={0.14}
          metalness={0.05}
          ior={1.45}
          envMapIntensity={1.4}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          flatShading
          transparent
        />
      </mesh>

      {/* светящиеся рёбра */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* узлы сети на вершинах */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions.arr, 3]} />
          <bufferAttribute attach="attributes-color" args={[nodePositions.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glowMap}
          vertexColors
          size={0.5}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* внутреннее светящееся ядро */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial
          ref={innerMatRef}
          color="#00E5D0"
          emissive="#00E5D0"
          emissiveIntensity={1.6}
          roughness={0.3}
          flatShading
        />
      </mesh>
      <pointLight color="#00E5D0" intensity={14} distance={9} decay={2} />

      {/* объёмное свечение вокруг ядра */}
      <sprite ref={glowSpriteRef} scale={[7.5, 7.5, 1]}>
        <spriteMaterial
          map={glowMap}
          color="#4a3dff"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* спутники и линии-связи */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[links.linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[links.lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[links.satPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[links.satColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glowMap}
          vertexColors
          size={0.32}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ---------- маленькие стеклянные спутники вокруг главного ядра ---------- */

const ORBIT_MOONS = [
  { radius: 3.6, size: 0.55, speed: 0.28, phase: 0.2, tilt: 0.45, elev: 0.35, dir: 1, tint: "#2E5CFF", core: "#7B2FFF" },
  { radius: 4.4, size: 0.38, speed: 0.22, phase: 1.8, tilt: -0.55, elev: -0.2, dir: -1, tint: "#7B2FFF", core: "#00E5D0" },
  { radius: 5.1, size: 0.72, speed: 0.18, phase: 3.4, tilt: 0.25, elev: 0.55, dir: 1, tint: "#00E5D0", core: "#2E5CFF" },
  { radius: 5.8, size: 0.32, speed: 0.32, phase: 4.9, tilt: 0.7, elev: -0.45, dir: -1, tint: "#2E5CFF", core: "#00E5D0" },
  { radius: 6.5, size: 0.48, speed: 0.15, phase: 2.6, tilt: -0.35, elev: 0.15, dir: 1, tint: "#7B2FFF", core: "#2E5CFF" },
  { radius: 7.2, size: 0.28, speed: 0.24, phase: 5.7, tilt: 0.15, elev: 0.7, dir: -1, tint: "#00E5D0", core: "#7B2FFF" },
];

const MOON_ORBIT_SENSITIVITY = 2.4; // насколько сильно курсор крутит орбиту
const MOON_ORBIT_DECAY = 0.94; // инерция орбиты после движения мыши
const MOON_ORBIT_MAX_VEL = 3.2;

function OrbitMoon({ moon, glowMap, index, moonOrbitRef }) {
  const orbitRef = useRef();
  const bodyRef = useRef();
  const coreMatRef = useRef();

  const edges = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const e = new THREE.EdgesGeometry(geo);
    geo.dispose();
    return e;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const cursorAngle = moonOrbitRef?.current?.angle ?? 0;
    // своя постоянная орбита + дополнительный угол от курсора (часть шаров — против часовой)
    const angle = moon.phase + t * moon.speed * moon.dir + cursorAngle * moon.dir;

    if (orbitRef.current) {
      const x = Math.cos(angle) * moon.radius;
      const z = Math.sin(angle) * moon.radius * Math.cos(moon.tilt);
      const y = Math.sin(angle) * moon.radius * Math.sin(moon.tilt) + moon.elev + Math.sin(t * 0.45 + index) * 0.08;
      orbitRef.current.position.set(x, y, z);
    }

    if (bodyRef.current) {
      const orbitVel = Math.abs(moonOrbitRef?.current?.velocity ?? 0);
      // вращение вокруг своей оси + чуть быстрее, когда курсор крутит орбиту
      bodyRef.current.rotation.y += delta * (0.45 + Math.abs(moon.speed) + orbitVel * 0.4) * moon.dir;
      bodyRef.current.rotation.x += delta * 0.12 * moon.dir;
    }

    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.2 + index) * 0.25;
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={bodyRef} scale={moon.size}>
        <mesh>
          <icosahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#101a3a"
            transmission={0.9}
            thickness={1.1}
            roughness={0.16}
            metalness={0.05}
            ior={1.45}
            envMapIntensity={1.2}
            clearcoat={0.5}
            clearcoatRoughness={0.35}
            flatShading
            transparent
          />
        </mesh>

        <lineSegments geometry={edges}>
          <lineBasicMaterial
            color={moon.tint}
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>

        <mesh scale={0.38}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            ref={coreMatRef}
            color={moon.core}
            emissive={moon.core}
            emissiveIntensity={1.2}
            roughness={0.35}
            flatShading
          />
        </mesh>

        <sprite scale={[3.2, 3.2, 1]}>
          <spriteMaterial
            map={glowMap}
            color={moon.tint}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>

        <pointLight color={moon.core} intensity={3.5} distance={3.5} decay={2} />
      </group>
    </group>
  );
}

function OrbitMoons({ glowMap, moonOrbitRef }) {
  return (
    <group>
      {ORBIT_MOONS.map((moon, i) => (
        <OrbitMoon key={i} moon={moon} glowMap={glowMap} index={i} moonOrbitRef={moonOrbitRef} />
      ))}
    </group>
  );
}

/* ---------- дрейфующие частицы вокруг ядра (двигаются с лагом) ---------- */

function DriftParticles({ glowMap }) {
  const ref = useRef();

  const { positions, colors } = useMemo(() => {
    const count = 240;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 3.2 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      pos[i * 3 + 2] = r * Math.cos(phi) * 0.7;
      paletteColor(Math.random(), c);
      c.multiplyScalar(0.5 + Math.random() * 0.5);
      c.toArray(col, i * 3);
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glowMap}
        vertexColors
        size={0.18}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ---------- сцена ---------- */

export default function CyberCoreScene() {
  const { camera } = useThree();
  const backRef = useRef();
  const midRef = useRef();
  const frontRef = useRef();
  const moonsRef = useRef();
  const glowLayerRef = useRef();
  const projected = useMemo(() => new THREE.Vector3(), []);

  const pointer = useRef({ x: 0, y: 0 });
  const prevPointer = useRef({ x: 0, y: 0, ready: false });
  const smoothFront = useRef({ x: 0, y: 0 });
  const smoothMid = useRef({ x: 0, y: 0 });
  const smoothGlow = useRef({ x: 0, y: 0 });
  const smoothMoons = useRef({ x: 0, y: 0 });
  const spinRef = useRef({ speed: BASE_SPIN });
  const moonOrbitRef = useRef({ angle: 0, velocity: 0 });

  const glowMap = useMemo(() => makeGlowTexture(), []);

  useEffect(() => {
    const onMove = (clientX, clientY) => {
      pointer.current.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(clientY / window.innerHeight) * 2 + 1;
    };
    const onMouse = (e) => onMove(e.clientX, e.clientY);
    const onTouch = (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useFrame((_, delta) => {
    // нормализуем скролл 0→1 по всей высоте документа, чтобы реакция не уезжала
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scroll = window.scrollY / maxScroll;
    const p = pointer.current;
    const dt = Math.max(delta, 1 / 120);

    // скорость мыши в NDC/сек
    let mouseSpeed = 0;
    let mouseDx = 0;
    let mouseDy = 0;
    if (prevPointer.current.ready) {
      mouseDx = p.x - prevPointer.current.x;
      mouseDy = p.y - prevPointer.current.y;
      mouseSpeed = Math.hypot(mouseDx, mouseDy) / dt;
    }
    prevPointer.current.x = p.x;
    prevPointer.current.y = p.y;
    prevPointer.current.ready = true;

    smoothFront.current.x += (p.x - smoothFront.current.x) * LERP_FRONT;
    smoothFront.current.y += (p.y - smoothFront.current.y) * LERP_FRONT;
    smoothMid.current.x += (p.x - smoothMid.current.x) * LERP_MID;
    smoothMid.current.y += (p.y - smoothMid.current.y) * LERP_MID;
    smoothGlow.current.x += (p.x - smoothGlow.current.x) * LERP_GLOW;
    smoothGlow.current.y += (p.y - smoothGlow.current.y) * LERP_GLOW;
    // спутники догоняют курсор медленнее и слабее главного ядра
    smoothMoons.current.x += (p.x - smoothMoons.current.x) * 0.02;
    smoothMoons.current.y += (p.y - smoothMoons.current.y) * 0.02;

    // слой 1: задний — едва заметный параллакс, остаётся в кадре
    if (backRef.current) {
      backRef.current.position.y = scroll * 0.35;
      backRef.current.position.x = smoothGlow.current.x * 0.2;
      backRef.current.rotation.z = scroll * 0.04;
    }

    // слой 2: средний — лёгкий дрейф + вращение за курсором
    if (midRef.current) {
      midRef.current.position.y = Math.sin(scroll * Math.PI) * 0.55;
      midRef.current.rotation.x = -smoothMid.current.y * MAX_TILT * 0.4 + scroll * 0.15;
      midRef.current.rotation.y = smoothMid.current.x * MAX_TILT * 0.4 + scroll * 0.35;
    }

    // слой 3: ядро всегда в viewport; скролл даёт лёгкий дрейф/наклон, мышь — ±15°
    if (frontRef.current) {
      frontRef.current.position.x = 0.6 + smoothFront.current.x * 0.5;
      frontRef.current.position.y = 0.2 + Math.sin(scroll * Math.PI) * 0.4 + smoothFront.current.y * 0.12;
      frontRef.current.position.z = 2 - scroll * 0.45;
      frontRef.current.rotation.x = -smoothFront.current.y * MAX_TILT + scroll * 0.18;
      frontRef.current.rotation.y = smoothFront.current.x * MAX_TILT + scroll * 0.55;
      frontRef.current.scale.setScalar(1 - scroll * 0.06);

      // импульс вращения: чем быстрее мышь проходит через объект, тем быстрее крутится
      frontRef.current.getWorldPosition(projected);
      projected.project(camera);
      const dist = Math.hypot(p.x - projected.x, p.y - projected.y);
      const hit = Math.max(0, 1 - dist / HIT_RADIUS_NDC);

      if (hit > 0 && mouseSpeed > 0.05) {
        // направление: горизонтальный жест крутит вокруг Y, вертикальный — чуть вокруг X (через знак)
        const direction = Math.sign(mouseDx || mouseDy) || 1;
        const impulse = mouseSpeed * SPIN_BOOST * hit * hit * direction;
        spinRef.current.speed = THREE.MathUtils.clamp(
          spinRef.current.speed + impulse * dt,
          -MAX_SPIN,
          MAX_SPIN,
        );
      }

      // плавно возвращаемся к базовой скорости вращения
      spinRef.current.speed += (BASE_SPIN * Math.sign(spinRef.current.speed || 1) - spinRef.current.speed) * (1 - SPIN_DECAY);
      // если почти остановились в нуле — держим лёгкое вращение вперёд
      if (Math.abs(spinRef.current.speed) < BASE_SPIN * 0.5) {
        spinRef.current.speed += (BASE_SPIN - spinRef.current.speed) * 0.08;
      }
    }

    // орбита спутников крутится от движения курсора (с инерцией)
    {
      const orbit = moonOrbitRef.current;
      // горизонталь — основной вклад, вертикаль — чуть слабее
      const impulse = mouseDx * MOON_ORBIT_SENSITIVITY + mouseDy * MOON_ORBIT_SENSITIVITY * 0.45;
      orbit.velocity = THREE.MathUtils.clamp(
        orbit.velocity + impulse,
        -MOON_ORBIT_MAX_VEL,
        MOON_ORBIT_MAX_VEL,
      );
      orbit.velocity *= MOON_ORBIT_DECAY;
      orbit.angle += orbit.velocity * dt;
    }

    // спутники: слабый параллакс, центр держим у большого шара
    if (moonsRef.current) {
      moonsRef.current.position.x = 0.6 + smoothMoons.current.x * 0.12;
      moonsRef.current.position.y = 0.2 + Math.sin(scroll * Math.PI) * 0.12 + smoothMoons.current.y * 0.04;
      moonsRef.current.position.z = 2 - scroll * 0.12;
      moonsRef.current.rotation.x = -smoothMoons.current.y * MAX_TILT * 0.12 + scroll * 0.04;
      moonsRef.current.rotation.y = smoothMoons.current.x * MAX_TILT * 0.12 + scroll * 0.08;
      moonsRef.current.scale.setScalar(1 - scroll * 0.02);
    }

    // частицы-свечения идут за ядром с лагом, тоже остаются в кадре
    if (glowLayerRef.current) {
      glowLayerRef.current.position.x = 0.6 + smoothGlow.current.x * 0.9;
      glowLayerRef.current.position.y = 0.2 + Math.sin(scroll * Math.PI) * 0.35 + smoothGlow.current.y * 0.55;
      glowLayerRef.current.position.z = 2 - scroll * 0.35;
      glowLayerRef.current.rotation.y = scroll * 0.4;
    }
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.22} color="#1a2050" />
      {/* контровой неон */}
      <pointLight position={[-6, 4, -8]} color="#7B2FFF" intensity={60} distance={30} decay={2} />
      <pointLight position={[7, -3, -6]} color="#00E5D0" intensity={45} distance={28} decay={2} />
      {/* rim-light */}
      <directionalLight position={[4, 6, 8]} color="#2E5CFF" intensity={1.4} />

      <group ref={backRef}>
        <PerspectiveGrid />
        <Starfield glowMap={glowMap} />
      </group>

      <group ref={midRef}>
        {MID_SHAPES.map((shape, i) => (
          <MidShape key={i} shape={shape} index={i} />
        ))}
      </group>

      <group ref={frontRef} position={[0.6, 0.2, 2]}>
        <CyberCore glowMap={glowMap} spinRef={spinRef} />
      </group>

      <group ref={moonsRef} position={[0.6, 0.2, 2]}>
        <OrbitMoons glowMap={glowMap} moonOrbitRef={moonOrbitRef} />
      </group>

      <group ref={glowLayerRef} position={[0.6, 0.2, 2]}>
        <DriftParticles glowMap={glowMap} />
      </group>
    </>
  );
}
