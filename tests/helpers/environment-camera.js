// Only the explicitly approved configurable-camera extension is normalized.
// Every original default, smoothing rule and remaining source byte stays guarded.
// A changed default (for example 17 -> 18) does not match these exact replacements.
export function withoutEnvironmentCameraOptions(source) {
  return source
    .replace("function create(options = {}) {", "function create() {")
    .replace("const distance = options.distance ?? 26,", "const distance = 26,")
    .replace("height = options.height ?? 17,", "height = 17,")
    .replace(
      "look = (options.look ?? 14) + speed * (options.speedLook ?? 0.09);",
      "look = 14 + speed * 0.09;",
    );
}
