/* Disclosure navigation with ordinary links; intentionally no ARIA menu roles.
   QA r2 (Claude): panels no longer open on focus. Focus-to-open raced with the button's
   own activation (focusin opened the group, the click that followed closed it), which made
   assistive "press" activations end closed. Now a button activation — pointer, Enter/Space
   or an assistive press — always follows the button's current aria-expanded state, and a
   click on a panel that only opened on mouse hover pins it open instead of closing it. */
(() => {
  const nav = document.querySelector('#primary-nav.navigation-v5');
  if (!nav) return;
  const header = nav.closest('.site-header');
  // Must match the collapsed-menu breakpoint in essencial-v5.css and essencial-v5.js.
  const mobile = window.matchMedia('(max-width: 1200px)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const groups = [...nav.querySelectorAll('[data-n5-group]')].map(element => ({ element, button: element.querySelector('.n5-disclosure'), panel: element.querySelector('.n5-panel'), heading: element.querySelector('.n5-group-heading'), openedBy: null, pointerInside: false }));
  if (!groups.length || groups.some(group => !group.button || !group.panel)) return;
  let active = null;
  let closeTimer = 0;
  let layoutFrame = 0;

  function announceState() {
    const open = Boolean(active);
    document.body.classList.toggle('v5-dropdown-open', open);
    document.dispatchEvent(new CustomEvent('essencial:navigation-state', { detail: { open } }));
  }
  function setState(group, open) {
    group.element.classList.toggle('is-open', open);
    group.button.setAttribute('aria-expanded', String(open));
    group.button.setAttribute('aria-label', `${open ? 'Recolher' : 'Expandir'} ${group.button.dataset.n5Label}`);
    group.panel.setAttribute('aria-hidden', String(!open));
    group.panel.inert = !open;
    if (!open) group.openedBy = null;
  }
  function closeAll(returnFocus = false) {
    window.clearTimeout(closeTimer);
    const previous = active;
    groups.forEach(group => setState(group, false));
    active = null;
    if (previous) announceState();
    if (returnFocus && previous) previous.button.focus({ preventScroll: true });
  }
  function fit() {
    layoutFrame = 0;
    const viewportHeight = window.innerHeight;
    const headerBottom = header?.getBoundingClientRect().bottom || 80;
    nav.style.setProperty('--n5-available-height', `${Math.floor(Math.max(60, viewportHeight - headerBottom - 24))}px`);
    if (!active || mobile.matches) return;
    const panel = active.panel;
    const anchor = active.element.getBoundingClientRect();
    const naturalLeft = anchor.left + anchor.width / 2 - panel.offsetWidth / 2;
    const rect = panel.getBoundingClientRect();
    const padding = 16;
    const naturalRight = naturalLeft + panel.offsetWidth;
    const shift = naturalLeft < padding ? padding - naturalLeft : naturalRight > window.innerWidth - padding ? window.innerWidth - padding - naturalRight : 0;
    panel.style.setProperty('--n5-shift', `${Math.round(shift)}px`);
    active.element.style.setProperty('--n5-shift', `${Math.round(shift)}px`);
    panel.style.setProperty('--n5-panel-max', `${Math.floor(Math.max(60, viewportHeight - rect.top - padding))}px`);
  }
  function queueFit() { if (!layoutFrame) layoutFrame = requestAnimationFrame(fit); }
  // reason: 'hover' (mouse only, transient), 'click' (button activation), 'key' (arrow keys).
  function open(group, reason) {
    window.clearTimeout(closeTimer);
    if (mobile.matches && !nav.classList.contains('open')) return;
    const changed = active !== group;
    // Hover never downgrades a panel that was opened explicitly.
    const keep = !changed && reason === 'hover' && group.openedBy && group.openedBy !== 'hover';
    groups.forEach(item => { if (item !== group) setState(item, false); });
    setState(group, true);
    group.openedBy = keep ? group.openedBy : reason;
    active = group;
    if (changed) announceState();
    fit();
  }
  function delayedClose(group) {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (active !== group || group.element.contains(document.activeElement)) return;
      closeAll();
    }, 180);
  }
  function panelLinks(group) { return [...group.panel.querySelectorAll('a[href]')]; }

  groups.forEach(group => {
    group.button.hidden = false;
    group.panel.hidden = false;
    setState(group, false);
    group.button.addEventListener('click', () => {
      if (active !== group) { open(group, 'click'); return; }
      if (group.openedBy === 'hover') { group.openedBy = 'click'; return; }
      closeAll();
    });
    group.element.addEventListener('pointerenter', event => {
      group.pointerInside = true;
      window.clearTimeout(closeTimer);
      if (!mobile.matches && hover.matches && event.pointerType === 'mouse') open(group, 'hover');
    });
    group.element.addEventListener('pointerleave', event => {
      group.pointerInside = false;
      if (!mobile.matches && event.pointerType === 'mouse' && group.openedBy === 'hover') delayedClose(group);
    });
    // Focus entering the group only cancels a pending close; it never opens a panel.
    group.element.addEventListener('focusin', () => { window.clearTimeout(closeTimer); });
    group.element.addEventListener('focusout', event => {
      if (active !== group || group.element.contains(event.relatedTarget)) return;
      if (event.relatedTarget === null && group.pointerInside) return;
      delayedClose(group);
    });
    group.heading.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      open(group, 'key');
      const links = panelLinks(group);
      (event.key === 'ArrowUp' ? links.at(-1) : links[0])?.focus({ preventScroll: true });
    });
    group.panel.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
      const links = panelLinks(group);
      const index = links.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links[next]?.focus();
    });
  });
  nav.addEventListener('click', event => { if (event.target.closest('a[href]')) closeAll(); });
  document.addEventListener('pointerdown', event => { if (!nav.contains(event.target)) closeAll(); }, { passive: true });
  // Capture precedes essencial-v5.js's document Escape handler. First Escape collapses
  // the disclosure and restores focus; a second reaches the main mobile menu.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeAll(true);
  }, true);
  if ('MutationObserver' in window) new MutationObserver(() => {
    if (mobile.matches && !nav.classList.contains('open')) closeAll();
    queueFit();
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  mobile.addEventListener?.('change', () => { closeAll(); queueFit(); });
  hover.addEventListener?.('change', () => closeAll());
  window.addEventListener('resize', queueFit, { passive: true });
  window.visualViewport?.addEventListener('resize', queueFit, { passive: true });
  window.addEventListener('scroll', () => { if (active) queueFit(); }, { passive: true });
  header?.addEventListener('transitionend', event => { if (active && ['height', 'width', 'top'].includes(event.propertyName)) queueFit(); });
  document.fonts?.ready.then(queueFit);
  fit();
})();
