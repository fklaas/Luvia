(() => {
  'use strict';
  const registry = new Map();
  const stack = [];
  let sequence = 0;
  function register(name, handler) { if (!name || typeof handler !== 'function') throw new Error('UI-Dialog benötigt Name und Handler.'); registry.set(name, handler); return () => registry.delete(name); }
  async function open(name, payload) { const handler = registry.get(name); if (!handler) throw new Error(`UI-Dialog nicht registriert: ${name}`); return handler(payload); }
  function mount({ name = 'dialog', content, className = '', closeOnBackdrop = true, closeOnEscape = true, onClose } = {}) {
    if (!(content instanceof HTMLElement)) throw new Error('UI-Overlay benötigt ein HTMLElement.');
    const id = `${name}-${++sequence}`, overlay = document.createElement('div');
    overlay.className = `luvia-ui-overlay ${className}`.trim(); overlay.dataset.luviaUiOverlay = id; overlay.appendChild(content); document.body.appendChild(overlay); document.documentElement.classList.add('luvia-ui-open');
    const previousFocus = document.activeElement;
    const close = reason => { const index = stack.findIndex(item => item.id === id); if (index >= 0) stack.splice(index, 1); overlay.remove(); if (!stack.length) document.documentElement.classList.remove('luvia-ui-open'); document.removeEventListener('keydown', onKeyDown, true); try { previousFocus?.focus?.({ preventScroll: true }); } catch (_) {} onClose?.(reason); };
    const onKeyDown = event => { if (event.key === 'Escape' && closeOnEscape && stack.at(-1)?.id === id) { event.preventDefault(); close('escape'); } };
    if (closeOnBackdrop) overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close('backdrop'); });
    overlay.querySelectorAll('[data-ui-close]').forEach(button => button.addEventListener('click', () => close('button'))); document.addEventListener('keydown', onKeyDown, true); stack.push({ id, name, overlay, close });
    queueMicrotask(() => overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus?.({ preventScroll: true }));
    return Object.freeze({ id, overlay, close });
  }
  function closeTop(reason = 'api') { stack.at(-1)?.close(reason); }
  function closeAll(reason = 'api') { [...stack].reverse().forEach(item => item.close(reason)); }
  function diagnostics() { return { registered: [...registry.keys()], open: stack.map(item => ({ id: item.id, name: item.name })) }; }
  const style = document.createElement('style'); style.textContent = `.luvia-ui-overlay{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:20px;background:rgba(31,43,54,.56);backdrop-filter:blur(12px)}html.luvia-ui-open{overflow:hidden}@media(max-width:760px){.luvia-ui-overlay{padding:0;place-items:stretch}}`; document.head.appendChild(style);
  window.LuviaUI = Object.freeze({ version: '1.0.0', register, open, mount, closeTop, closeAll, diagnostics }); window.dispatchEvent(new CustomEvent('luvia:ui-ready'));
})();
