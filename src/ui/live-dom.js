/* Keep live buttons and rows instead of replacing the timing tower each tick. */
(() => {
  'use strict';
  const last = new WeakMap();
  const key = node => node.nodeType === 1 && node.hasAttribute('data-action') ? `${node.tagName}:${node.dataset.action}:${node.dataset.value || ''}` : null;
  function patch(parent, incoming) {
    const old = [...parent.childNodes], keyed = new Map(old.filter(key).map(node => [key(node), node]));
    let cursor = parent.firstChild;
    for (const source of [...incoming.childNodes]) {
      const id = key(source);
      let target = id ? keyed.get(id) : cursor && !key(cursor) && cursor.nodeType === source.nodeType && cursor.nodeName === source.nodeName ? cursor : null;
      if (!target || target.nodeName !== source.nodeName) target = source.cloneNode(true);
      if (target !== cursor) parent.insertBefore(target, cursor);
      if (target.nodeType === 3) { if (target.nodeValue !== source.nodeValue) target.nodeValue = source.nodeValue; }
      else if (target.nodeType === 1) {
        for (const attr of [...target.attributes]) if (!source.hasAttribute(attr.name)) target.removeAttribute(attr.name);
        for (const attr of [...source.attributes]) if (target.getAttribute(attr.name) !== attr.value) target.setAttribute(attr.name, attr.value);
        patch(target, source);
      }
      cursor = target.nextSibling;
    }
    while (cursor) { const next = cursor.nextSibling; parent.removeChild(cursor); cursor = next; }
  }
  function setHTML(root, html) {
    if (!root || last.get(root) === html) return;
    const template = document.createElement('template'); template.innerHTML = html;
    patch(root, template.content); last.set(root, html);
  }
  globalThis.CGPLiveDOM = Object.freeze({ setHTML });
})();
