(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(canvas, surface, options = {}) {
    const webgl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!webgl) throw Error("WebGL 2 ist auf diesem Gerät nicht verfügbar.");
    const renderer = new T.WebGLRenderer({
      canvas,
      context: webgl,
      antialias: true,
      alpha: false,
    });
    renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    scene.background = new T.Color("#b8beb5");
    scene.fog = new T.Fog("#b8beb5", 180, 480);
    scene.add(new T.HemisphereLight("#ffedce", "#627384", 1.5));
    const light = new T.DirectionalLight("#fff1d6", 1.6);
    light.position.set(-150, 200, -80);
    scene.add(light);
    const camera = new T.PerspectiveCamera(55, 1, 0.3, 2400),
      cameraRig = A.Camera3D.create();
    const materials = A.Materials3D.create(
        document.getElementById("worldAtlas"),
        options.invalidate,
      ),
      track = A.Tracks3D.create(surface, materials),
      vehicle = A.Vehicles3D.create(materials);
    scene.add(track.group, vehicle.group);
    let width = 0,
      height = 0,
      lastOverview = false,
      lost = false,
      quality = "auto",
      slowFrames = 0,
      fleet = null;
    function resize() {
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(
          quality === "low" ? 0.75 : 1.5,
          window.devicePixelRatio || 1,
          Math.sqrt(1000000 / Math.max(1, rect.width * rect.height)),
        ),
        w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      if (w !== width || h !== height || renderer.getPixelRatio() !== dpr) {
        width = w;
        height = h;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
    function draw(snapshot, teamId, overview = false, frameSeconds = 1 / 60) {
      if (lost) return;
      resize();
      if (snapshot.entries) {
        if (!fleet) {
          fleet = A.Fleet3D.create(vehicle, materials);
          scene.add(fleet.group);
        }
        fleet.update(snapshot.entries);
      }
      vehicle.update(snapshot.visual, teamId);
      const pose = cameraRig.update(snapshot.visual, surface, frameSeconds, {
        overview,
        reset: snapshot.paused || overview !== lastOverview,
        aspect: camera.aspect,
      });
      lastOverview = overview;
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
      camera.near = overview ? 50 : 0.3;
      camera.far = overview ? 6000 : 800;
      camera.updateProjectionMatrix();
      scene.fog.far = overview ? 5000 : 480;
      scene.fog.near = overview ? 1800 : 180;
      renderer.render(scene, camera);
      // Conservative automatic quality reduction; this measures delivered frame intervals, not GPU time.
      if (!snapshot.paused && quality === "auto") {
        slowFrames =
          frameSeconds > 0.033
            ? slowFrames + Math.min(0.1, frameSeconds)
            : Math.max(0, slowFrames - frameSeconds * 0.5);
        if (slowFrames > 1.5) {
          quality = "low";
          options.onQuality?.("low");
        }
      }
    }
    const contextLost = (event) => {
      event.preventDefault();
      lost = true;
      options.onContextLost?.();
    };
    const contextRestored = () => {
      lost = false;
      cameraRig.reset();
      options.onContextRestored?.();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    return Object.freeze({
      draw,
      frameInterval() {
        return quality === "low" ? 1 / 30 : 0;
      },
      setQuality(value) {
        quality = value === "low" ? "low" : "auto";
        slowFrames = 0;
        options.invalidate?.();
      },
      resetCamera() {
        cameraRig.reset();
      },
      diagnostics() {
        return {
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          pixelRatio: renderer.getPixelRatio(),
          quality,
          lost,
        };
      },
      dispose() {
        canvas.removeEventListener("webglcontextlost", contextLost);
        canvas.removeEventListener("webglcontextrestored", contextRestored);
        track.dispose();
        vehicle.dispose();
        fleet?.dispose();
        materials.dispose();
        renderer.dispose();
      },
    });
  }
  A.Renderer3D = Object.freeze({ create });
})();
