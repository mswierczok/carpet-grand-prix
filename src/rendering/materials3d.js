(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    T = globalThis.CGPThree;
  function create(image, invalidate = () => {}) {
    const textures = [],
      materials = [],
      swatches = [];
    const gradient = new T.DataTexture(
      new Uint8Array([92, 174, 239, 255]),
      4,
      1,
      T.RedFormat,
    );
    gradient.minFilter = gradient.magFilter = T.NearestFilter;
    gradient.needsUpdate = true;
    textures.push(gradient);
    function swatch(index) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = index === 0 ? "#c6b48e" : "#eee5d7";
      ctx.fillRect(0, 0, 512, 512);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      swatches.push({ index, canvas, texture });
      textures.push(texture);
      return texture;
    }
    const maps = {
      carpet: swatch(0),
      paint: swatch(1),
      wood: swatch(2),
      paper: swatch(3),
    };
    function paintAtlas() {
      if (!image?.naturalWidth) return;
      for (const s of swatches) {
        const w = image.naturalWidth / 2,
          h = image.naturalHeight / 2;
        s.canvas
          .getContext("2d")
          .drawImage(
            image,
            (s.index % 2) * w,
            Math.floor(s.index / 2) * h,
            w,
            h,
            0,
            0,
            512,
            512,
          );
        const ctx = s.canvas.getContext("2d");
        ctx.globalAlpha = s.index === 0 ? 0.68 : s.index === 2 ? 0.38 : 0.25;
        ctx.fillStyle =
          s.index === 0 ? "#d7c9ac" : s.index === 2 ? "#cfb188" : "#f5ecdd";
        ctx.fillRect(0, 0, 512, 512);
        ctx.globalAlpha = 1;
        s.texture.needsUpdate = true;
      }
      invalidate();
    }
    image?.addEventListener("load", paintAtlas);
    paintAtlas();
    function toon(color, map = null, options = {}) {
      const material = new T.MeshToonMaterial({
        color,
        map,
        gradientMap: gradient,
        ...options,
      });
      materials.push(material);
      return material;
    }
    function ink() {
      const material = new T.MeshBasicMaterial({
        color: "#1c242b",
        side: T.BackSide,
      });
      materials.push(material);
      return material;
    }
    function basic(color, options = {}) {
      const m = new T.MeshBasicMaterial({ color, ...options });
      materials.push(m);
      return m;
    }
    function canvasTexture(canvas) {
      const t = new T.CanvasTexture(canvas);
      t.colorSpace = T.SRGBColorSpace;
      textures.push(t);
      return t;
    }
    return Object.freeze({
      maps,
      toon,
      ink,
      basic,
      canvasTexture,
      dispose() {
        image?.removeEventListener("load", paintAtlas);
        textures.forEach((t) => t.dispose());
        materials.forEach((m) => m.dispose());
      },
    });
  }
  A.Materials3D = Object.freeze({ create });
})();
