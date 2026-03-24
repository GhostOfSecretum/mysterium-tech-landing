import { Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";

const scenes = {
  chrome: lazy(() => import("./scenes/ChromeLuxuryScene")),
  ripple: lazy(() => import("./scenes/ChromeRippleScene")),
  streams: lazy(() => import("./scenes/DataStreamsScene")),
  grid: lazy(() => import("./scenes/CryptoGridScene")),
  aurora: lazy(() => import("./scenes/AuroraVortexScene")),
  cyber: lazy(() => import("./scenes/CyberSphereScene")),
  plasma: lazy(() => import("./scenes/PlasmaFieldScene")),
  helix: lazy(() => import("./scenes/NeonHelixScene")),
  gravity: lazy(() => import("./scenes/GravityWellScene")),
};

export default function SceneSwitcher({ activeScene = "grid" }) {
  const SceneComponent = scenes[activeScene] ?? scenes.grid;

  return (
    <div className="scene-shell" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 14], fov: 55, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <SceneComponent />
        </Suspense>
      </Canvas>
    </div>
  );
}
