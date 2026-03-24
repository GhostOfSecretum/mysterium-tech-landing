import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const SIZE = 22;
const COUNT = SIZE * SIZE;
const HALF = SIZE / 2;
const SPACING = 0.7;
const GRID_EXTENT = HALF * SPACING;
const LERP_SPEED = 0.08;
const MOUSE_WAVE_RADIUS = 4.5;
const MOUSE_WAVE_STRENGTH = 1.8;
const TILT_STRENGTH = 0.15;

export default function CryptoGridScene() {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const pointer = useRef({ x: 0, y: 0 });
  const smoothPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (clientX, clientY) => {
      pointer.current.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(clientY / window.innerHeight) * 2 + 1;
    };

    const onMouse = (e) => onMove(e.clientX, e.clientY);
    const onTouch = (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    const color = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      if (Math.random() > 0.92) {
        color.set("#40e0d0");
      } else if (Math.random() > 0.85) {
        color.set("#1a8fa8");
      } else {
        color.set("#0a1118");
      }
      color.toArray(arr, i * 3);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = window.scrollY / window.innerHeight;

    smoothPointer.current.x += (pointer.current.x - smoothPointer.current.x) * LERP_SPEED;
    smoothPointer.current.y += (pointer.current.y - smoothPointer.current.y) * LERP_SPEED;

    const mx = smoothPointer.current.x * GRID_EXTENT;
    const mz = -smoothPointer.current.y * GRID_EXTENT;

    let i = 0;
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const posX = (x - HALF) * SPACING;
        const posZ = (z - HALF) * SPACING;

        const distance = Math.sqrt(posX * posX + posZ * posZ);

        const wave1 = Math.sin(distance * 0.8 - t * 1.5);
        const wave2 = Math.cos(posX * 0.5 + t) * Math.sin(posZ * 0.5 + t);

        const dx = posX - mx;
        const dz = posZ - mz;
        const mouseDist = Math.sqrt(dx * dx + dz * dz);
        const mouseInfluence =
          Math.max(0, 1 - mouseDist / MOUSE_WAVE_RADIUS) *
          MOUSE_WAVE_STRENGTH *
          (1 + 0.3 * Math.sin(mouseDist * 2 - t * 3));

        const yOffset = (wave1 + wave2) * 0.5 + mouseInfluence;
        const scrollEffect = Math.sin(distance * 0.3 - scroll * 8) * scroll * 3;

        dummy.position.set(posX, yOffset + scrollEffect - 3, posZ);
        dummy.scale.set(1, 1 + Math.max(0, yOffset + scrollEffect) * 2, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    meshRef.current.rotation.x = 0.6 + scroll * 0.4 + smoothPointer.current.y * TILT_STRENGTH;
    meshRef.current.rotation.y = t * 0.05 + scroll * 0.2 + smoothPointer.current.x * TILT_STRENGTH;
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={2} />

      <instancedMesh ref={meshRef} args={[null, null, COUNT]}>
        <boxGeometry args={[0.55, 1, 0.55]}>
          <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
        </boxGeometry>
        <meshStandardMaterial
          vertexColors
          metalness={0.8}
          roughness={0.2}
        />
      </instancedMesh>
    </>
  );
}
