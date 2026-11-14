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
    function listen(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    }
    function clear() {
      held.clear();
      pointers.clear();
      root
        .querySelectorAll("[data-drive]")
        .forEach((button) => button.classList.remove("is-held"));
    }
    listen(window, "keydown", (event) => {
      if (
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
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, button.dataset.drive);
        button.classList.add("is-held");
      });
      const release = (event) => {
        pointers.delete(event.pointerId);
        button.classList.remove("is-held");
      };
      listen(button, "pointerup", release);
      listen(button, "pointercancel", release);
      listen(button, "lostpointercapture", release);
    });
    const blur = () => {
      clear();
      onBlur();
    };
    listen(window, "blur", blur);
    listen(document, "visibilitychange", () => {
      if (document.hidden) blur();
    });
    const active = (key) =>
      Object.entries(keys).some(
        ([code, action]) => action === key && held.has(code),
      ) || [...pointers.values()].includes(key);
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
