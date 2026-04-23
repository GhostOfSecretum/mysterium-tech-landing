import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

const C_ICE = new THREE.Color("#8ec8f0");
const C_CYAN = new THREE.Color("#40d8d0");
const C_GOLD = new THREE.Color("#c8a860");
const C_WHITE = new THREE.Color("#d8e8f8");
const C_DIM = new THREE.Color("#0c2040");
const C_LINE_LO = new THREE.Color("#1a3860");
const C_LINE_MD = new THREE.Color("#2a6098");
const C_LINE_HI = new THREE.Color("#50b0e8");

function noise(x, y) {
  const s = (x + y) * 0.366;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * 0.211;
  const u = x - (i - t);
  const v = y - (j - t);
  return (
    Math.sin(u * 2.1 + v * 1.7) * 0.5 +
    Math.cos(u * 1.3 - v * 2.4) * 0.3 +
    Math.sin((u + v) * 3.1) * 0.2
  );
}

function fbm(x, y) {
  return noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.27 + noise(x * 4.2, y * 4.2) * 0.1;
}

function buildNetwork(cols, rows, span, jitter, extraEdges = 0) {
  const positions = [];
  const sx = span / Math.max(cols - 1, 1);
  const sy = span / Math.max(rows - 1, 1);
  const hx = span / 2;
  const hy = span / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * sx - hx + (Math.random() - 0.5) * sx * jitter;
      const y = r * sy - hy + (Math.random() - 0.5) * sy * jitter;
      const z = fbm(x * 0.12, y * 0.12) * 2 - (x * x + y * y) * 0.001;
      positions.push(new THREE.Vector3(x, y, z));
    }
  }

  const edges = [];
  const id = (r, c) => r * cols + c;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = id(r, c);
      if (c < cols - 1) {
        const j = id(r, c + 1);
        edges.push([i, j, positions[i].distanceTo(positions[j])]);
      }
      if (r < rows - 1) {
        const j = id(r + 1, c);
        edges.push([i, j, positions[i].distanceTo(positions[j])]);
      }
      if (c < cols - 1 && r < rows - 1 && Math.random() > 0.55) {
        const j = id(r + 1, c + 1);
        edges.push([i, j, positions[i].distanceTo(positions[j])]);
      }
    }
  }

  for (let k = 0; k < extraEdges; k++) {
    const a = Math.floor(Math.random() * positions.length);
    const b = Math.floor(Math.random() * positions.length);
    if (a !== b) edges.push([a, b, positions[a].distanceTo(positions[b])]);
  }

  return { positions, edges };
}

function FabricLayer({
  network,
  zBase,
  parallax,
  scrollRef,
  mouseRef,
  nodeColor,
  accentColor,
  lineColor,
  lineBright,
  nodeSize,
  nodeOpacity,
  lineOpacity,
  scrollStrength,
  breatheStrength,
  showPulses,
  pulseCount,
  timeOffset,
}) {
  const nodesRef = useRef();
  const pulsesRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpCol = useMemo(() => new THREE.Color(), []);

  const nLen = network.positions.length;
  const eLen = network.edges.length;

  const animPos = useMemo(() => network.positions.map(() => new THREE.Vector3()), [network]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(eLen * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(eLen * 6), 3));
    return g;
  }, [eLen]);

  const pulseData = useMemo(() => {
    if (!showPulses) return [];
    return Array.from({ length: pulseCount }, () => ({
      edgeIdx: Math.floor(Math.random() * eLen),
      progress: Math.random(),
      speed: 0.12 + Math.random() * 0.45,
      forward: Math.random() > 0.5,
    }));
  }, [showPulses, pulseCount, eLen]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime() + (timeOffset || 0);
    const dt = Math.min(delta, 0.05);
    const sc = scrollRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const pf = parallax;
    const bk = breatheStrength;
    const sk = scrollStrength;

    const nm = nodesRef.current;
    if (nm) {
      for (let i = 0; i < nLen; i++) {
        const bp = network.positions[i];

        const bx = Math.sin(t * 0.4 + bp.x * 0.3 + bp.y * 0.2) * 0.12 * bk;
        const by = Math.cos(t * 0.35 + bp.y * 0.25) * 0.1 * bk;
        const bz = Math.sin(t * 0.28 + bp.x * 0.18 - bp.y * 0.12) * 0.18 * bk;

        const sw = Math.sin(bp.x * 0.18 + bp.y * 0.14 - sc * 8) * sc * 2.5 * sk;
        const sb = Math.cos(bp.y * 0.11 + sc * 5) * sc * 1.6 * sk;
        const sz = Math.sin(bp.x * 0.22 - sc * 6 + bp.y * 0.08) * sc * 2 * sk;

        const dx = bp.x - mx * 10 * pf;
        const dy = bp.y - my * 6 * pf;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseInf = Math.max(0, 1 - dist / 5) * 1.2;

        const px = bp.x + bx + mx * pf * 1.6;
        const py = bp.y + by + sw + my * pf * 1;
        const pz = zBase + bp.z + bz + sb + sz + mouseInf * 1.5;

        animPos[i].set(px, py, pz);
        dummy.position.set(px, py, pz);

        const scale = nodeSize * (1 + Math.sin(t * 2 + i * 0.5) * 0.12 + mouseInf * 0.6);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        nm.setMatrixAt(i, dummy.matrix);

        const colorMix = Math.min(
          1,
          mouseInf * 0.7 + Math.abs(Math.sin(t * 0.5 + i * 0.2)) * 0.12,
        );
        tmpCol.copy(nodeColor).lerp(accentColor, colorMix);
        nm.setColorAt(i, tmpCol);
      }
      nm.instanceMatrix.needsUpdate = true;
      if (nm.instanceColor) nm.instanceColor.needsUpdate = true;
    }

    const posArr = lineGeo.attributes.position.array;
    const colArr = lineGeo.attributes.color.array;
    for (let i = 0; i < eLen; i++) {
      const [a, b, baseDist] = network.edges[i];
      const va = animPos[a];
      const vb = animPos[b];
      const o = i * 6;
      posArr[o] = va.x;
      posArr[o + 1] = va.y;
      posArr[o + 2] = va.z;
      posArr[o + 3] = vb.x;
      posArr[o + 4] = vb.y;
      posArr[o + 5] = vb.z;
      const d = va.distanceTo(vb);
      const tension = Math.min(1, Math.max(0, (d / baseDist - 0.6) * 1.2));
      tmpCol.copy(lineColor).lerp(lineBright, tension * 0.6 + 0.25);
      colArr[o] = tmpCol.r;
      colArr[o + 1] = tmpCol.g;
      colArr[o + 2] = tmpCol.b;
      colArr[o + 3] = tmpCol.r;
      colArr[o + 4] = tmpCol.g;
      colArr[o + 5] = tmpCol.b;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    const pm = pulsesRef.current;
    if (pm && showPulses) {
      for (let i = 0; i < pulseData.length; i++) {
        const p = pulseData[i];
        p.progress += dt * p.speed * (p.forward ? 1 : -1);
        if (p.progress > 1 || p.progress < 0) {
          p.edgeIdx = Math.floor(Math.random() * eLen);
          p.progress = p.forward ? 0 : 1;
          p.forward = Math.random() > 0.5;
        }
        const [a, b] = network.edges[p.edgeIdx];
        dummy.position.lerpVectors(animPos[a], animPos[b], p.progress);
        dummy.scale.setScalar(0.022 + Math.sin(p.progress * Math.PI) * 0.016);
        dummy.updateMatrix();
        pm.setMatrixAt(i, dummy.matrix);
        tmpCol.copy(C_WHITE).lerp(C_CYAN, Math.sin(p.progress * Math.PI) * 0.5);
        pm.setColorAt(i, tmpCol);
      }
      pm.instanceMatrix.needsUpdate = true;
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={nodesRef} args={[null, null, nLen]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={nodeOpacity}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={lineOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      {showPulses && (
        <instancedMesh ref={pulsesRef} args={[null, null, pulseCount]} frustumCulled={false}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial
            transparent
            opacity={0.85}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  );
}

function GlowOrbs() {
  const ref = useRef();
  const orbs = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        x: (Math.random() - 0.5) * 28,
        y: (Math.random() - 0.5) * 18,
        z: -4 + Math.random() * 6,
        scale: 2.5 + Math.random() * 3.5,
        speed: 0.03 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? "#0c2848" : "#081830",
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child, i) => {
      const o = orbs[i];
      child.position.x = o.x + Math.sin(t * o.speed + o.phase) * 1.5;
      child.position.y = o.y + Math.cos(t * o.speed * 0.7 + o.phase) * 1;
      child.material.opacity = 0.05 + Math.sin(t * 0.25 + o.phase) * 0.025;
    });
  });

  return (
    <group ref={ref}>
      {orbs.map((o, i) => (
        <mesh key={i} position={[o.x, o.y, o.z]} scale={o.scale}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            color={o.color}
            transparent
            opacity={0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ scrollRef, mouseRef }) {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const sc = scrollRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    const targetX = Math.sin(t * 0.065) * 0.6 + mx * 2;
    const targetY = Math.cos(t * 0.045) * 0.3 + my * 1.2 + sc * 1.5;
    const targetZ = 14 - sc * 5;

    camera.position.x += (targetX - camera.position.x) * 0.022;
    camera.position.y += (targetY - camera.position.y) * 0.022;
    camera.position.z += (targetZ - camera.position.z) * 0.022;
    camera.lookAt(mx * 0.4, my * 0.25 + sc * 0.8, 0);
  });
  return null;
}

export default function DigitalFabricScene() {
  const scrollRef = useRef(0);
  const rawMouse = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const set = (cx, cy) => {
      rawMouse.current.x = (cx / window.innerWidth) * 2 - 1;
      rawMouse.current.y = -(cy / window.innerHeight) * 2 + 1;
    };
    const onMouse = (e) => set(e.clientX, e.clientY);
    const onTouch = (e) => {
      if (e.touches.length) set(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useFrame(() => {
    const raw = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollRef.current += (raw - scrollRef.current) * 0.04;
    mouseRef.current.x += (rawMouse.current.x - mouseRef.current.x) * 0.05;
    mouseRef.current.y += (rawMouse.current.y - mouseRef.current.y) * 0.05;
  });

  const backNet = useMemo(() => buildNetwork(10, 10, 30, 0.5), []);
  const midNet = useMemo(() => buildNetwork(20, 20, 24, 0.3, 25), []);
  const frontNet = useMemo(() => buildNetwork(7, 7, 18, 0.4), []);

  return (
    <>
      <fog attach="fog" args={["#040a1a", 6, 36]} />
      <ambientLight intensity={0.03} color="#081828" />
      <pointLight position={[5, 4, 6]} intensity={0.35} color="#3088b8" distance={25} />
      <pointLight position={[-6, 3, 0]} intensity={0.25} color="#40d8d0" distance={22} />
      <pointLight position={[0, -4, -4]} intensity={0.15} color="#c8a860" distance={18} />

      <CameraRig scrollRef={scrollRef} mouseRef={mouseRef} />

      <FabricLayer
        network={backNet}
        zBase={-8}
        parallax={0.3}
        scrollRef={scrollRef}
        mouseRef={mouseRef}
        nodeColor={C_DIM}
        accentColor={C_ICE}
        lineColor={C_LINE_LO}
        lineBright={C_LINE_MD}
        nodeSize={0.04}
        nodeOpacity={0.4}
        lineOpacity={0.3}
        scrollStrength={0.3}
        breatheStrength={0.5}
        showPulses={false}
        pulseCount={0}
        timeOffset={100}
      />

      <FabricLayer
        network={midNet}
        zBase={0}
        parallax={1}
        scrollRef={scrollRef}
        mouseRef={mouseRef}
        nodeColor={C_ICE}
        accentColor={C_CYAN}
        lineColor={C_LINE_MD}
        lineBright={C_LINE_HI}
        nodeSize={0.055}
        nodeOpacity={0.8}
        lineOpacity={0.55}
        scrollStrength={1}
        breatheStrength={1}
        showPulses={true}
        pulseCount={80}
        timeOffset={0}
      />

      <FabricLayer
        network={frontNet}
        zBase={6}
        parallax={1.8}
        scrollRef={scrollRef}
        mouseRef={mouseRef}
        nodeColor={C_WHITE}
        accentColor={C_GOLD}
        lineColor={C_LINE_MD}
        lineBright={C_LINE_HI}
        nodeSize={0.07}
        nodeOpacity={0.6}
        lineOpacity={0.4}
        scrollStrength={1.4}
        breatheStrength={1.2}
        showPulses={false}
        pulseCount={0}
        timeOffset={50}
      />

      <GlowOrbs />

      <Sparkles count={350} scale={28} size={1.2} speed={0.08} opacity={0.2} color="#6aacd8" />
      <Sparkles count={120} scale={22} size={0.5} speed={0.04} opacity={0.12} color="#40d8d0" />
    </>
  );
}
