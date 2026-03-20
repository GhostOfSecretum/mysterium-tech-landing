import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const SERVER_NODES = [
  { name: "USA", lat: 38.9, lon: -77.0, color: "#00e59e" },
  { name: "Latvia", lat: 56.95, lon: 24.1, color: "#3d6bff" },
  { name: "Netherlands", lat: 52.37, lon: 4.9, color: "#a29bfe" },
  { name: "Sweden", lat: 59.33, lon: 18.07, color: "#ff6b6b" },
];

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createArcCurve(start, end, globeRadius) {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  mid.normalize().multiplyScalar(globeRadius + dist * 0.4);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function GlobeWireframe({ scrollProgress }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05 + scrollProgress.current * Math.PI * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 48, 48]} />
      <meshBasicMaterial
        color="#0a1628"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

function GlobeShell({ scrollProgress }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05 + scrollProgress.current * Math.PI * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.98, 64, 64]} />
      <meshPhysicalMaterial
        color="#060d1a"
        transparent
        opacity={0.3}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

function ServerNode({ position, color, scrollProgress }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const baseScale = 0.12;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 3) * 0.3;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(baseScale * pulse);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(baseScale * pulse * 3);
      glowRef.current.material.opacity = 0.15 + Math.sin(t * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ArcConnection({ start, end, color, scrollProgress, delay }) {
  const lineRef = useRef();
  const pulseRef = useRef();
  const curve = useMemo(() => createArcCurve(start, end, 3), [start, end]);
  const points = useMemo(() => curve.getPoints(64), [curve]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pulseRef.current) {
      const progress = ((t * 0.3 + delay) % 1);
      const pos = curve.getPoint(progress);
      pulseRef.current.position.copy(pos);
      const glow = Math.sin(progress * Math.PI);
      pulseRef.current.scale.setScalar(0.06 + glow * 0.08);
      pulseRef.current.material.opacity = glow * 0.9;
    }
    if (lineRef.current) {
      lineRef.current.material.opacity = 0.2 + Math.sin(t * 1.5 + delay * 3) * 0.15;
    }
  });

  return (
    <group>
      <line ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </line>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function DataRings({ scrollProgress }) {
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.15;
      ring1Ref.current.rotation.z = t * 0.08;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.12;
      ring2Ref.current.rotation.x = Math.PI * 0.3 + t * 0.05;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[3.8, 0.01, 8, 128]} />
        <meshBasicMaterial color="#00e59e" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[4.2, 0.01, 8, 128]} />
        <meshBasicMaterial color="#3d6bff" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

export default function NeuralGlobeScene() {
  const scrollProgress = useRef(0);
  const globeRadius = 3;

  const nodePositions = useMemo(
    () => SERVER_NODES.map((n) => latLonToVec3(n.lat, n.lon, globeRadius)),
    [],
  );

  const connections = useMemo(() => {
    const conns = [];
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        conns.push({
          start: nodePositions[i],
          end: nodePositions[j],
          color: SERVER_NODES[i].color,
          delay: i * 0.25 + j * 0.15,
        });
      }
    }
    return conns;
  }, [nodePositions]);

  useFrame(() => {
    const t = (window.scrollY || 0) / (document.body.scrollHeight - window.innerHeight || 1);
    scrollProgress.current += (t - scrollProgress.current) * 0.05;
  });

  return (
    <>
      <fog attach="fog" args={["#05050a", 12, 45]} />
      <ambientLight intensity={0.1} />
      <pointLight position={[8, 5, 8]} intensity={0.4} color="#00e59e" />
      <pointLight position={[-6, -4, 5]} intensity={0.3} color="#3d6bff" />

      <group>
        <GlobeShell scrollProgress={scrollProgress} />
        <GlobeWireframe scrollProgress={scrollProgress} />

        {SERVER_NODES.map((node, i) => (
          <ServerNode
            key={node.name}
            position={nodePositions[i].toArray()}
            color={node.color}
            scrollProgress={scrollProgress}
          />
        ))}

        {connections.map((conn, i) => (
          <ArcConnection
            key={i}
            start={conn.start}
            end={conn.end}
            color={conn.color}
            scrollProgress={scrollProgress}
            delay={conn.delay}
          />
        ))}

        <DataRings scrollProgress={scrollProgress} />
      </group>

      <Sparkles count={300} scale={25} size={1.5} speed={0.2} opacity={0.3} color="#3d6bff" />
    </>
  );
}
