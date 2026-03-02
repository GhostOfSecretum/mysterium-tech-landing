import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_COUNT = 15000;

export default function CrystalOrbScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.02);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Ограничиваем pixel ratio для повышения производительности (особенно на мобильных)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    const dirLight1 = new THREE.DirectionalLight(0x00e59e, 4.0);
    dirLight1.position.set(5, 5, 5);
    const dirLight2 = new THREE.DirectionalLight(0x3d6bff, 4.0);
    dirLight2.position.set(-5, -5, 2);
    scene.add(ambient, dirLight1, dirLight2);

    // Group for the entire orb
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // 1. CRYSTAL SHELLS (Faceted Icosahedrons)
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x88bbff,
      transmission: 0.95,
      opacity: 1.0,
      metalness: 0.3,
      roughness: 0.1,
      ior: 1.6,
      thickness: 2.5,
      specularIntensity: 2.0,
      specularColor: new THREE.Color(0x00e59e),
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      flatShading: true,
      transparent: true,
    });

    const shellGeometry1 = new THREE.IcosahedronGeometry(2.2, 1);
    const shell1 = new THREE.Mesh(shellGeometry1, crystalMat);
    orbGroup.add(shell1);

    const shellGeometry2 = new THREE.IcosahedronGeometry(2.4, 2);
    const shell2 = new THREE.Mesh(shellGeometry2, crystalMat);
    orbGroup.add(shell2);

    const shellGeometry3 = new THREE.IcosahedronGeometry(2.6, 1);
    const crystalMatOuter = crystalMat.clone();
    crystalMatOuter.roughness = 0.25;
    crystalMatOuter.transmission = 0.8;
    const shell3 = new THREE.Mesh(shellGeometry3, crystalMatOuter);
    orbGroup.add(shell3);

    const shells = [shell1, shell2, shell3];

    // 2. INNER NODES (4 Countries)
    const nodesGroup = new THREE.Group();
    orbGroup.add(nodesGroup);

    const nodeColors = [0x00e59e, 0x3d6bff, 0xa29bfe, 0x00d2ff];
    const nodes = [];
    const nodeGeometry = new THREE.SphereGeometry(0.15, 32, 32);

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        emissive: nodeColors[i],
        emissiveIntensity: 2.5,
        roughness: 0.1,
      });
      const mesh = new THREE.Mesh(nodeGeometry, mat);
      
      // Starting positions (will be animated)
      const angle = (i / 4) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0);
      
      nodesGroup.add(mesh);
      nodes.push(mesh);
      
      // Add a point light to each node for internal glow
      const light = new THREE.PointLight(nodeColors[i], 3.0, 6.0);
      mesh.add(light);
    }

    // 3. CONNECTING LINES
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x7d9dff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    
    // We will update this geometry in the render loop
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(4 * 4 * 3); // 4 nodes, interconnected
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    nodesGroup.add(lines);

    // 4. DATA STORM PARTICLES
    const particleGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pAngles = new Float32Array(PARTICLE_COUNT * 2); // theta, phi
    const pRadii = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx3 = i * 3;
      const idx2 = i * 2;
      
      pAngles[idx2] = Math.random() * Math.PI * 2; // theta
      pAngles[idx2 + 1] = Math.acos((Math.random() * 2) - 1); // phi
      pRadii[i] = 2.8 + Math.random() * 8.0; // Distance from center
      
      // Initial positions
      pPos[idx3] = pRadii[i] * Math.sin(pAngles[idx2 + 1]) * Math.cos(pAngles[idx2]);
      pPos[idx3+1] = pRadii[i] * Math.sin(pAngles[idx2 + 1]) * Math.sin(pAngles[idx2]);
      pPos[idx3+2] = pRadii[i] * Math.cos(pAngles[idx2 + 1]);
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    
    // Custom shader for glowing particles
    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00e59e) },
        uProgress: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        attribute float radius;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          // Swirl effect
          float dist = length(pos);
          float angle = atan(pos.z, pos.x);
          float swirl = angle + uTime * (0.5 + 2.0 * uProgress) * (5.0 / dist);
          
          pos.x = dist * cos(swirl);
          pos.z = dist * sin(swirl);
          
          // Explosion effect on scroll
          pos += normalize(pos) * (uProgress * 15.0);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Size attenuation
          gl_PointSize = (4.0 + uProgress * 8.0) * (15.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = smoothstep(12.0 + uProgress * 20.0, 2.0, length(pos));
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        
        void main() {
          // Circular particle
          vec2 uv = gl_PointCoord.xy - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          
          // Soft glow
          float alpha = (0.5 - dist) * 2.0 * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Scroll Animation State
    const scrollState = {
      progress: 0,
      crystalScale: 1.0,
      crystalDispersion: 0.0,
      nodeSpread: 1.2,
      cameraZ: 8.0,
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scrollTween = null;
    if (!reducedMotion) {
      scrollTween = gsap.to(scrollState, {
        progress: 1.0,
        crystalScale: 8.0, // Engulf the camera
        crystalDispersion: 3.5, // Break the shells apart
        nodeSpread: 8.0, // Nodes fly out to the edges
        cameraZ: 2.0, // Camera flies inside
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });
    }

    // Pointer Parallax
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onPointerMove = (e) => {
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2.0;
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2.0;
    };
    window.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    let rafId;

    const tick = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth pointer
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      // Animate shells
      shell1.rotation.y = elapsed * 0.15;
      shell1.rotation.x = elapsed * 0.1;
      
      shell2.rotation.y = -elapsed * 0.2;
      shell2.rotation.z = elapsed * 0.12;
      
      shell3.rotation.x = -elapsed * 0.18;
      shell3.rotation.y = elapsed * 0.25;

      // Apply scroll state to shells (shatter / expand effect)
      shell1.scale.setScalar(scrollState.crystalScale);
      shell2.scale.setScalar(scrollState.crystalScale + scrollState.crystalDispersion * 0.5);
      shell3.scale.setScalar(scrollState.crystalScale + scrollState.crystalDispersion);
      
      // Make them fade out as they pass the camera
      crystalMat.opacity = Math.max(0, 1.0 - scrollState.progress * 1.5);
      crystalMatOuter.opacity = Math.max(0, 1.0 - scrollState.progress * 1.2);

      // Animate nodes (orbiting)
      for (let i = 0; i < 4; i++) {
        const t = elapsed * (0.5 + i * 0.1) + i * Math.PI * 0.5;
        const spread = scrollState.nodeSpread;
        
        nodes[i].position.set(
          Math.cos(t) * spread,
          Math.sin(t * 1.2) * spread,
          Math.sin(t * 0.8) * spread
        );
      }

      // Update connecting lines
      let lineIdx = 0;
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          linePositions[lineIdx++] = nodes[i].position.x;
          linePositions[lineIdx++] = nodes[i].position.y;
          linePositions[lineIdx++] = nodes[i].position.z;
          
          linePositions[lineIdx++] = nodes[j].position.x;
          linePositions[lineIdx++] = nodes[j].position.y;
          linePositions[lineIdx++] = nodes[j].position.z;
        }
      }
      lineGeometry.attributes.position.needsUpdate = true;
      lineMaterial.opacity = (1.0 - scrollState.progress) * 0.8; // fade lines on scroll

      // Particles
      particleMat.uniforms.uTime.value = elapsed;
      particleMat.uniforms.uProgress.value = scrollState.progress;
      particles.rotation.y = elapsed * 0.05;

      // Camera parallax & dolly
      camera.position.x = pointer.x * 1.5;
      camera.position.y = -pointer.y * 1.5;
      camera.position.z = scrollState.cameraZ;
      camera.lookAt(0, 0, 0);

      // Pass phase mix to CSS only if changed
      const currentProgress = scrollState.progress.toFixed(3);
      if (currentProgress !== scrollState._lastProgress) {
        document.documentElement.style.setProperty("--phase-mix", currentProgress);
        scrollState._lastProgress = currentProgress;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      if (scrollTween) {
        scrollTween.scrollTrigger?.kill();
        scrollTween.kill();
      }
      
      // Cleanup
      shellGeometry1.dispose();
      shellGeometry2.dispose();
      shellGeometry3.dispose();
      nodeGeometry.dispose();
      lineGeometry.dispose();
      particleGeo.dispose();
      
      crystalMat.dispose();
      crystalMatOuter.dispose();
      lineMaterial.dispose();
      particleMat.dispose();
      
      nodes.forEach(n => n.material.dispose());
      
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="scene-shell" ref={containerRef} aria-hidden="true" />;
}
