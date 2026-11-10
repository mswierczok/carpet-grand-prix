/* Read-only cards; focus actions use the game's existing event handler. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gap = value => /^[+~]?\d+\.\d+$/.test(String(value)) ? `${value} s` : String(value || '—');
  const fields = card => ({ position: `P${card.position}`, name: card.name,
    status: card.status || 'AUF DER STRECKE', front: gap(card.front), rear: gap(card.rear),
    frontLabel: `Vorn${card.frontName ? ' · ' + card.frontName : ''}`,
    rearLabel: `Hinten${card.rearName ? ' · ' + card.rearName : ''}` });
  const label = card => `${card.name} auf der Strecke ${card.focused ? 'nicht mehr hervorheben' : 'hervorheben'}`;

  function render(cards) {
    return cards.map(card => {
      const f = fields(card), color = /^#[\da-f]{3,8}$/i.test(card.color || '') ? card.color : '#a2dcc1';
      return `<button type="button" class="team-driver-card${card.focused ? ' is-focused' : ''}" data-action="focus-driver" data-value="${esc(card.id)}" aria-pressed="${!!card.focused}" aria-label="${esc(label(card))}" style="--driver-color:${color}">
        <span class="team-driver-position" data-field="position">${esc(f.position)}</span>
        <span class="team-driver-identity"><strong data-field="name">${esc(f.name)}</strong><small data-field="status">${esc(f.status)}</small></span>
        <span class="team-driver-metrics"><span class="team-driver-gap"><small data-field="frontLabel">${esc(f.frontLabel)}</small><b data-field="front">${esc(f.front)}</b></span>
        <span class="team-driver-gap"><small data-field="rearLabel">${esc(f.rearLabel)}</small><b data-field="rear">${esc(f.rear)}</b></span></span>
      </button>`;
    }).join('');
  }

  function update(root, cards) {
    if (!root) return;
    root.hidden = !cards.length;
    const ids = JSON.stringify(cards.map(card => card.id));
    if (root.dataset.drivers !== ids) {
      root.innerHTML = render(cards); root.dataset.drivers = ids;
      return;
    }
    // Stable buttons remain clickable and retain keyboard focus during live updates.
    cards.forEach((card, i) => {
      const button = root.children[i];
      button.classList.toggle('is-focused', !!card.focused);
      button.setAttribute('aria-pressed', String(!!card.focused));
      button.setAttribute('aria-label', label(card));
      for (const [key, value] of Object.entries(fields(card))) {
        const node = button.querySelector(`[data-field="${key}"]`);
        if (node.textContent !== String(value)) node.textContent = value;
      }
    });
  }

  globalThis.CGPTeamDriverHud = Object.freeze({ render, update });
})();
