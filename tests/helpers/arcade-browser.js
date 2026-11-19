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

export async function capture3D(
  page,
  {
    observeFleet = false,
    renderEvery = 1,
    observeElevation = false,
    reviewCamera = false,
  } = {},
) {
  await installPausedClock(page);
  await page.addInitScript(
    ({ observeFleet, renderEvery, observeElevation, reviewCamera }) => {
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
                let visibleCamera = camera;
                if (reviewCamera && globalThis.__reviewDetail) {
                  const view = globalThis.__reviewDetail;
                  visibleCamera = new library.PerspectiveCamera(
                    55,
                    camera.aspect,
                    0.3,
                    2100,
                  );
                  visibleCamera.position.set(...view.position);
                  visibleCamera.lookAt(...view.target);
                  visibleCamera.updateMatrixWorld(true);
                }
                const rendered = original.call(this, scene, visibleCamera);
                const pose = globalThis.__driveSnapshot?.visual;
                if (pose && observeElevation) {
                  const model = scene.children.find(
                      (n) =>
                        n.isGroup &&
                        Math.hypot(
                          n.position.x - pose.x,
                          n.position.z - pose.y,
                        ) < 1e-6,
                    ),
                    stats = (globalThis.__bridgeRenderStats ||= {
                      samples: 0,
                      maxElevation: 0,
                      maxCamera: 0,
                      maxError: 0,
                    });
                  if (model) {
                    stats.samples++;
                    stats.maxElevation = Math.max(
                      stats.maxElevation,
                      model.position.y,
                    );
                    stats.maxCamera = Math.max(
                      stats.maxCamera,
                      camera.position.y,
                    );
                    stats.maxError = Math.max(
                      stats.maxError,
                      Math.abs(model.position.y - (pose.elevation || 0)),
                    );
                  }
                }
                if (pose) {
                  const point = new library.Vector3(
                    pose.x,
                    1.5,
                    pose.y,
                  ).project(camera);
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
                const player = globalThis.__driveSnapshot?.race?.playerTeam;
                if (
                  observeFleet &&
                  player &&
                  globalThis.__fleetStats?.player !== player
                ) {
                  const models = [];
                  scene.traverse((node) => {
                    if (node.name?.startsWith("opponent-")) models.push(node);
                  });
                  const visible = models.filter((node) => node.visible);
                  globalThis.__fleetStats = {
                    player,
                    cached: models.length,
                    ids: visible.map((node) => node.name.slice(9)).sort(),
                    batches: visible.map((node) => node.children.length),
                    liveries: new Set(
                      visible
                        .flatMap((node) => node.children)
                        .map((mesh) => mesh.material.map)
                        .filter((map) => map?.image?.width === 560)
                        .map((map) => map.uuid),
                    ).size,
                  };
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
              let frame = 0,
                elapsed = 0;
              globalThis.__inspect3D = renderer;
              return {
                ...renderer,
                draw(snapshot, ...rest) {
                  globalThis.__driveSnapshot = snapshot;
                  elapsed += rest[2] ?? 1 / 60;
                  if (snapshot.paused || frame++ % renderEvery === 0) {
                    renderer.draw(snapshot, rest[0], rest[1], elapsed);
                    elapsed = 0;
                  }
                },
              };
            },
          };
        },
      });
    },
    { observeFleet, renderEvery, observeElevation, reviewCamera },
  );
}

export function keyboardPilot({ laps = 1, tryShortcut = false } = {}) {
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
        cutting = tryShortcut && car.s > 1000,
        target = cutting ? { x: 490, y: 310 } : surface.at(car.s + look);
      if (cutting) globalThis.__attemptingShortcut = true;
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
        cutting ? 35 : 92,
        Math.sqrt((p.maxLateralAcceleration * 0.62) / curvature),
      );
      key("KeyW", car.speed < desired);
      key("KeyS", car.speed > desired + 3);
      key("KeyA", angle < -0.065);
      key("KeyD", angle > 0.065);
    }
    const done = tryShortcut
      ? globalThis.__driveSnapshot?.contacts > 0
      : Number(document.getElementById("laps").textContent) >= laps;
    if (!done) requestAnimationFrame(tick);
    else {
      for (const code of [...held]) key(code, false);
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyP", bubbles: true }),
      );
    }
  }
  requestAnimationFrame(tick);
}

// Follow the actual menu flow in race.html; free driving keeps its inline options.
export async function selectDriveSetting(page, id, value) {
  const menu = page.locator("#openSettings");
  if (await menu.count()) await menu.click();
  await page.locator("#" + id).selectOption(value);
  if (await menu.count()) await page.locator("#closeSettings").click();
}
export async function switchToTopDown(page) {
  const menu = page.locator("#openSettings");
  if (await menu.count()) await menu.click();
  await page.locator("#fallback").click();
  if (await menu.count()) await page.locator("#closeSettings").click();
}
