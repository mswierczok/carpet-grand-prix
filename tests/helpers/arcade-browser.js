// Test instrumentation is installed before application scripts; no production hooks.
export async function installPausedClock(page) {
  // Freeze before loading WebGL. Reading Date in a busy renderer and issuing
  // pauseAt later can otherwise race wall time and try to travel backwards.
  await page.clock.install({ time: new Date("2026-11-15T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-15T00:00:01Z"));
}

export async function driveDarkShoulder(page) {
  await page.clock.pauseAt(
    await page.evaluate(() => new Date(Date.now() + 100).toISOString()),
  );
  await page.keyboard.down("w");
  await page.clock.runFor(600);
  await page.keyboard.down("d");
  await page.clock.runFor(450);
  await page.keyboard.up("d");
  await page.keyboard.up("w");
  await page.keyboard.down("a");
  await page.clock.runFor(600);
  await page.keyboard.up("a");
  await page.clock.runFor(80);
}
export async function capture2D(page) {
  await installPausedClock(page);
  await page.addInitScript(() => {
    globalThis.CGPArcade = {};
    let module;
    Object.defineProperty(CGPArcade, "Renderer", {
      configurable: true,
      get: () => module,
      set: (value) => {
        module = {
          create(...args) {
            const renderer = value.create(...args);
            return {
              ...renderer,
              draw(snapshot, ...rest) {
                globalThis.__driveSnapshot = snapshot;
                return renderer.draw(snapshot, ...rest);
              },
            };
          },
        };
      },
    });
  });
}

export async function capture3D(page) {
  await installPausedClock(page);
  await page.addInitScript(() => {
    let three;
    Object.defineProperty(globalThis, "CGPThree", {
      configurable: true,
      get: () => three,
      set: (library) => {
        class ObservedRenderer extends library.WebGLRenderer {
          constructor(...args) {
            super(...args);
            const original = this.render;
            this.render = (scene, camera) => {
              const rendered = original.call(this, scene, camera);
              const pose = globalThis.__driveSnapshot?.visual;
              if (pose) {
                const point = new library.Vector3(pose.x, 1.5, pose.y).project(
                  camera,
                );
                const stats = (globalThis.__cameraStats ||= {
                  maxX: 0,
                  minY: 1,
                  maxY: -1,
                  samples: 0,
                });
                stats.maxX = Math.max(stats.maxX, Math.abs(point.x));
                stats.minY = Math.min(stats.minY, point.y);
                stats.maxY = Math.max(stats.maxY, point.y);
                stats.samples++;
              }
              return rendered;
            };
          }
        }
        three = { ...library, WebGLRenderer: ObservedRenderer };
      },
    });
    globalThis.CGPArcade = {};
    let module;
    Object.defineProperty(CGPArcade, "Renderer3D", {
      configurable: true,
      get: () => module,
      set: (value) => {
        module = {
          create(...args) {
            const renderer = value.create(...args);
            globalThis.__inspect3D = renderer;
            return {
              ...renderer,
              draw(snapshot, ...rest) {
                globalThis.__driveSnapshot = snapshot;
                renderer.draw(snapshot, ...rest);
              },
            };
          },
        };
      },
    });
  });
}

export function keyboardPilot({ laps = 1 } = {}) {
  const p = CGPArcade.Physics.parameters,
    surface = CGPArcade.Surface.create(CGPArcadeData.tracks.bahrain),
    held = new Set();
  const key = (code, down) => {
    if (held.has(code) === down) return;
    down ? held.add(code) : held.delete(code);
    window.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
    );
  };
  function tick() {
    const car = globalThis.__driveSnapshot?.car;
    if (car) {
      const look = Math.max(12, Math.min(30, 12 + car.speed * 0.18)),
        target = surface.at(car.s + look);
      const angle = Math.atan2(
        Math.sin(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
        Math.cos(Math.atan2(target.y - car.y, target.x - car.x) - car.heading),
      );
      let curvature = 0.001;
      for (let ahead = 0; ahead < 70; ahead += 7) {
        const a = surface.at(car.s + ahead),
          b = surface.at(car.s + ahead + 8);
        curvature = Math.max(
          curvature,
          Math.abs(
            Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)),
          ) / 8,
        );
      }
      const desired = Math.min(
        92,
        Math.sqrt((p.maxLateralAcceleration * 0.62) / curvature),
      );
      key("KeyW", car.speed < desired);
      key("KeyS", car.speed > desired + 3);
      key("KeyA", angle < -0.065);
      key("KeyD", angle > 0.065);
    }
    if (Number(document.getElementById("laps").textContent) < laps)
      requestAnimationFrame(tick);
    else {
      for (const code of [...held]) key(code, false);
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyP", bubbles: true }),
      );
    }
  }
  requestAnimationFrame(tick);
}
