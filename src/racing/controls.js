(() => {
  "use strict";
  const A = (globalThis.CGPArcade = globalThis.CGPArcade || {});
  function attach(root, { pause, recover, onBlur }) {
    const held = new Set(),
      pointers = new Map(),
      listeners = [];
    const keys = {
      ArrowUp: "throttle",
      KeyW: "throttle",
      ArrowDown: "brake",
      KeyS: "brake",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
    };
    const editable = (target) =>
      target?.closest?.('input,textarea,select,[contenteditable="true"]');
    const blocked = () => !!root.querySelector("dialog[open]");
    function listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      listeners.push(() => target.removeEventListener(type, handler, options));
    }
    function clear() {
      held.clear();
      const captures = [...pointers];
      pointers.clear();
      for (const [id, button] of captures)
        if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
      root
        .querySelectorAll("[data-drive]")
        .forEach((button) => button.classList.remove("is-held"));
    }
    listen(window, "keydown", (event) => {
      if (
        blocked() ||
        editable(event.target) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (keys[event.code]) {
        event.preventDefault();
        held.add(event.code);
      } else if (
        !event.repeat &&
        (event.code === "KeyP" ||
          (event.code === "Space" && !event.target.closest?.("button,a")))
      ) {
        event.preventDefault();
        pause();
      } else if (!event.repeat && event.code === "KeyR") {
        event.preventDefault();
        recover();
      }
    });
    listen(window, "keyup", (event) => {
      if (keys[event.code]) held.delete(event.code);
    });
    root.querySelectorAll("[data-drive]").forEach((button) => {
      listen(button, "pointerdown", (event) => {
        if (
          blocked() || button.disabled ||
          (event.pointerType === "mouse" && event.button !== 0)
        ) return;
        event.preventDefault();
        pointers.set(event.pointerId, button);
        try {
          button.setPointerCapture(event.pointerId);
        } catch {
          // Global release handlers still release input if capture is unavailable.
        }
        button.classList.add("is-held");
      });
      listen(button, "lostpointercapture", release);
    });
    function release(event) {
      const button = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      if (button && ![...pointers.values()].includes(button))
        button.classList.remove("is-held");
    }
    listen(window, "pointerup", release);
    listen(window, "pointercancel", release);
    for (const area of root.querySelectorAll(".drive-view, .race-toolbar")) {
      for (const type of ["contextmenu", "selectstart", "dragstart"])
        listen(area, type, (event) => event.preventDefault());
    }
    for (const area of root.querySelectorAll(".drive-view")) {
      for (const type of ["touchstart", "touchmove"])
        listen(area, type, (event) => event.preventDefault(), { passive: false });
    }
    const blur = () => {
      clear();
      onBlur();
    };
    listen(window, "blur", blur);
    listen(window, "pagehide", blur);
    listen(document, "visibilitychange", () => {
      if (document.hidden) blur();
    });
    const active = (key) =>
      Object.entries(keys).some(
        ([code, action]) => action === key && held.has(code),
      ) || [...pointers.values()].some((button) => button.dataset.drive === key);
    return Object.freeze({
      read: () => ({
        throttle: Number(active("throttle")),
        brake: Number(active("brake")),
        steer: Number(active("right")) - Number(active("left")),
      }),
      clear,
      destroy() {
        clear();
        listeners.forEach((remove) => remove());
      },
    });
  }
  A.Controls = Object.freeze({ attach });
})();
