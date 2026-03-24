import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 200;
const EDGE_COUNT = 300;

function GeodesicShell({ scrollProgress, mousePos }) {
  const shellRef = useRef();
  const wireRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    const mx = mousePos.current.x;
    const my = mousePos.current.y;

    if (shellRef.current) {
      shellRef.current.rotation.y = t * 0.08 + mx * 0.4;
      shellRef.current.rotation.x = t * 0.05 + my * 0.3;
      const breathe = 1 + Math.sin(t * 0.5) * 0.03 + scroll * 0.2;
      shellRef.current.scale.setScalar(breathe);
    }

    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.06 + mx * 0.4;
      wireRef.current.rotation.x = -t * 0.04 + my * 0.3;
      wireRef.current.scale.setScalar(1.01 + Math.sin(t * 0.5) * 0.03 + scroll * 0.2);
    }
  });

  return (
    <group>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[3, 3]} />
        <meshPhysicalMaterial
          color="#0a1828"
          metalness={0.95}
          roughness={0.15}
          envMapIntensity={2}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[3.05, 3]} />
        <meshBasicMaterial
          color="#40e0d0"
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function DataNodes({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const nodes = useMemo(() => {
    const pts = [];
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (2 * i) / (NODE_COUNT - 1);
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = (2 * Math.PI * i) / phi;
      pts.push({
        pos: new THREE.Vector3(
          Math.cos(theta) * radiusAtY * 3.2,
          y * 3.2,
          Math.sin(theta) * radiusAtY * 3.2,
        ),
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1 + Math.random() * 2,
        baseSize: 0.03 + Math.random() * 0.06,
        isActive: Math.random() > 0.7,
      });
    }
    return pts;
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT * 3);
    const color = new THREE.Color();
    nodes.forEach((n, i) => {
      if (n.isActive) {
        color.set("#40e0d0");
      } else {
        color.setHSL(0.52, 0.6, 0.2 + Math.random() * 0.15);
      }
      color.toArray(arr, i * 3);
    });
    return arr;
  }, [nodes]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    nodes.forEach((n, i) => {
      const pulse = 1 + Math.sin(t * n.pulseSpeed + n.pulsePhase) * 0.5;
      const s = n.baseSize * pulse * (n.isActive ? 1.5 : 1) * (1 + scroll * 0.3);
      const offset = n.isActive ? Math.sin(t * 2 + n.pulsePhase) * 0.1 : 0;

      dummy.position.copy(n.pos).multiplyScalar(1 + offset);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, NODE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        toneMapped={false}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function DataEdges({ scrollProgress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const edges = useMemo(() => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const pts = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (2 * i) / (NODE_COUNT - 1);
      const r = Math.sqrt(1 - y * y);
      const theta = (2 * Math.PI * i) / phi;
      pts.push(new THREE.Vector3(Math.cos(theta) * r * 3.2, y * 3.2, Math.sin(theta) * r * 3.2));
    }

    const result = [];
    for (let i = 0; i < EDGE_COUNT; i++) {
      const a = Math.floor(Math.random() * pts.length);
      let b = Math.floor(Math.random() * pts.length);
      if (a === b) b = (b + 1) % pts.length;
      const dist = pts[a].distanceTo(pts[b]);
      if (dist < 2.5) {
        const mid = new THREE.Vector3().addVectors(pts[a], pts[b]).multiplyScalar(0.5);
        const len = dist;
        const dir = new THREE.Vector3().subVectors(pts[b], pts[a]).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        result.push({ mid, len, quat, pulsePhase: Math.random() * Math.PI * 2 });
      }
    }
    return result;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;

    edges.forEach((e, i) => {
      const pulse = 0.5 + Math.sin(t * 1.5 + e.pulsePhase) * 0.5;
      dummy.position.copy(e.mid);
      dummy.quaternion.copy(e.quat);
      dummy.scale.set(0.008 * (1 + scroll * 0.3), e.len, 0.008 * (1 + scroll * 0.3));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, edges.length]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshBasicMaterial
        color="#1a8fa8"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function ScanRing({ scrollProgress }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgress.current;
    if (!ref.current) return;

    const y = Math.sin(t * 0.4) * 3;
    ref.current.position.y = y;
    ref.current.scale.setScalar(1 + scroll * 0.2);
    ref.current.material.opacity = 0.12 + Math.sin(t * 2) * 0.06;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[3.3, 0.015, 16, 128]} />
      <meshBasicMaterial
        color="#40e0d0"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function CyberSphereScene() {
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
      <Environment preset="city" />
      <fog attach="fog" args={["#010810", 10, 35]} />
      <ambientLight intensity={0.08} />
      <pointLight position={[5, 8, 5]} intensity={0.8} color="#40e0d0" distance={25} />
      <pointLight position={[-6, -3, -5]} intensity={0.5} color="#1a8fa8" distance={20} />
      <directionalLight position={[0, 10, 5]} intensity={0.6} color="#d8eaf4" />

      <GeodesicShell scrollProgress={scrollProgress} mousePos={mousePos} />
      <DataNodes scrollProgress={scrollProgress} />
      <DataEdges scrollProgress={scrollProgress} />
      <ScanRing scrollProgress={scrollProgress} />
    </>
  );
}
