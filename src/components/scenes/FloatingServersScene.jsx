import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

const SERVER_POSITIONS = [
  { pos: [-4, 2, -2], rot: [0.1, 0.3, 0], scale: 1 },
  { pos: [3.5, 1, -1], rot: [-0.1, -0.2, 0.05], scale: 0.9 },
  { pos: [-2, -2, -3], rot: [0.05, 0.5, -0.1], scale: 0.85 },
  { pos: [4, -1.5, -2], rot: [-0.05, -0.4, 0.1], scale: 0.95 },
  { pos: [0, 3, -4], rot: [0.15, 0.1, 0], scale: 0.8 },
  { pos: [-3.5, -0.5, 0], rot: [0, 0.6, -0.05], scale: 1.1 },
  { pos: [1, -3, -1], rot: [-0.1, 0.2, 0.1], scale: 0.75 },
];

function ServerRack({ position, rotation, scaleFactor, index, scrollProgress }) {
  const groupRef = useRef();
  const ledsRef = useRef([]);
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    const spread = scroll * 2.5;
    const dir = basePos.clone().normalize();
    groupRef.current.position.set(
      position[0] + dir.x * spread,
      position[1] + dir.y * spread,
      position[2] + dir.z * spread,
    );

    ledsRef.current.forEach((led, i) => {
      if (led) {
        const blink = Math.sin(t * (2 + index * 0.5) + i * 1.5) > 0.3 ? 1 : 0.2;
        led.material.opacity = blink;
      }
    });
  });

  const ledColors = ["#00e59e", "#3d6bff", "#ff6b6b", "#00e59e"];

  return (
    <Float speed={1.5 + index * 0.2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef} position={position} rotation={rotation} scale={scaleFactor}>
        <mesh>
          <boxGeometry args={[1.4, 2.2, 0.8]} />
          <meshStandardMaterial
            color="#0a1020"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, 0, 0.41]}>
          <boxGeometry args={[1.3, 2.1, 0.01]} />
          <meshStandardMaterial
            color="#060c18"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {[-0.6, -0.2, 0.2, 0.6].map((y, i) => (
          <mesh key={`slot-${i}`} position={[0, y, 0.42]}>
            <boxGeometry args={[1.1, 0.28, 0.01]} />
            <meshStandardMaterial color="#0d1525" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}

        {ledColors.map((color, i) => (
          <mesh
            key={`led-${i}`}
            position={[0.45, -0.6 + i * 0.4, 0.43]}
            ref={(el) => { ledsRef.current[i] = el; }}
          >
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={1}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}

        {ledColors.map((color, i) => (
          <pointLight
            key={`led-light-${i}`}
            position={[0.45, -0.6 + i * 0.4, 0.5]}
            color={color}
            intensity={0.1}
            distance={1}
          />
        ))}

        {[[-0.3, 0], [0, 0], [0.3, 0]].map(([x, z], i) => (
          <mesh key={`vent-${i}`} position={[x, -1.0, z + 0.42]}>
            <boxGeometry args={[0.15, 0.08, 0.01]} />
            <meshBasicMaterial color="#0a1a30" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function DataStream({ start, end, color, speed, scrollProgress }) {
  const lineRef = useRef();
  const particlesRef = useRef();
  const particleCount = 8;

  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    mid.y += 1.5;
    return new THREE.QuadraticBezierCurve3(s, mid, e);
  }, [start, end]);

  const linePoints = useMemo(() => curve.getPoints(40), [curve]);
  const lineGeometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(linePoints),
    [linePoints],
  );

  const particlePositions = useMemo(() => new Float32Array(particleCount * 3), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (particlesRef.current) {
      const arr = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const progress = ((t * speed * 0.2 + i / particleCount) % 1);
        const pos = curve.getPoint(progress);
        arr[i * 3] = pos.x;
        arr[i * 3 + 1] = pos.y;
        arr[i * 3 + 2] = pos.z;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </line>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.08}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export default function FloatingServersScene() {
  const scrollProgress = useRef(0);

  const dataStreams = useMemo(() => {
    const streams = [];
    for (let i = 0; i < SERVER_POSITIONS.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 3, SERVER_POSITIONS.length); j++) {
        streams.push({
          start: SERVER_POSITIONS[i].pos,
          end: SERVER_POSITIONS[j].pos,
          color: i % 2 === 0 ? "#00e59e" : "#3d6bff",
          speed: 0.5 + Math.random() * 1.5,
        });
      }
    }
    return streams;
  }, []);

  useFrame(() => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;
  });

  return (
    <>
      <fog attach="fog" args={["#05050a", 8, 30]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color="#00e59e" />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color="#3d6bff" />
      <directionalLight position={[0, 5, 5]} intensity={0.3} color="#ffffff" />

      {SERVER_POSITIONS.map((srv, i) => (
        <ServerRack
          key={i}
          position={srv.pos}
          rotation={srv.rot}
          scaleFactor={srv.scale}
          index={i}
          scrollProgress={scrollProgress}
        />
      ))}

      {dataStreams.map((stream, i) => (
        <DataStream
          key={i}
          start={stream.start}
          end={stream.end}
          color={stream.color}
          speed={stream.speed}
          scrollProgress={scrollProgress}
        />
      ))}

      <Sparkles count={400} scale={20} size={1} speed={0.15} opacity={0.2} color="#3d6bff" />
    </>
  );
}
