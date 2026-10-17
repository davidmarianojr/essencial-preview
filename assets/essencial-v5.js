/* Essencial v5 core (Claude pass, 2026-10-16). Replaces site.js + global-v5.js for the
   v5 build only. Disclosures inside the menu stay in navigation-v5.js, whose capture-phase
   Escape handler runs first: Escape closes an open disclosure, a second Escape the menu.
   No frame loops; reveals run once and are skipped for reduced motion or ?capture=1. */
(() => {
  const root = document.documentElement;
  const stillCapture = new URLSearchParams(window.location.search).get('capture') === '1';
  if (stillCapture) root.classList.add('is-still');

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  // Must match the collapsed-menu breakpoint in essencial-v5.css and navigation-v5.js.
  const collapsed = window.matchMedia('(max-width: 1200px)');

  function setMenu(open, returnFocus = false) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    nav.classList.toggle('open', open);
    header?.classList.toggle('menu-open', open);
    if (!open && returnFocus) toggle.focus();
  }
  const isOpen = () => Boolean(nav?.classList.contains('open'));

  toggle?.addEventListener('click', () => setMenu(!isOpen()));
  nav?.addEventListener('click', event => { if (event.target.closest('a[href]')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) setMenu(false, true);
  });
  document.addEventListener('pointerdown', event => {
    if (isOpen() && !event.target.closest('.header-inner')) setMenu(false);
  }, { passive: true });
  // Keyboard users leaving the open menu with Tab close it, so it never covers the page.
  nav?.addEventListener('focusout', event => {
    if (isOpen() && collapsed.matches && event.relatedTarget && !event.relatedTarget.closest('.header-inner')) setMenu(false);
  });
  collapsed.addEventListener?.('change', () => { if (!collapsed.matches) setMenu(false); });

  // Round 6: the header starts integrated over the hero and becomes the floating capsule
  // once the page moves (pages without a hero keep the capsule). rAF only when scrolled.
  if (header) {
    const solid = document.body.classList.contains('header-solid');
    let queued = false;
    // Round 17b: continuous progress instead of a binary switch; colours flip at the middle.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      queued = false;
      const raw = solid ? 1 : Math.min(1, Math.max(0, (window.scrollY - 8) / 140));
      const progress = reducedMotion.matches ? (raw > 0 ? 1 : 0) : raw;
      header.style.setProperty('--hdr-p', progress.toFixed(3));
      header.classList.toggle('is-floating', progress >= .5);
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Platform screens on Tecnologia e Indicadores (Genilton, 17/10): accessible tabs. Without
  // JavaScript the panels are simply stacked.
  document.querySelectorAll('[data-pf]').forEach(box => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const select = (index, focus) => {
      tabs.forEach((tab, i) => { const on = i === index; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; panels[i].hidden = !on; });
      if (focus) tabs[index].focus();
    };
    box.classList.add('is-tabs');
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select((next + tabs.length) % tabs.length, true);
      });
    });
    select(Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')), false);
  });

  // Round 17o: the clients rail loops on its own (CSS) and can also be dragged with a finger
  // or the mouse. While dragging, the CSS animation is replaced by a manual offset (wrapped,
  // so the loop never ends); on release the animation resumes from that exact point via a
  // negative delay. Vertical gestures are left to the page (touch-action: pan-y).
  const rail = document.querySelector('.trust-rail');
  const track = rail?.querySelector('.trust-track');
  if (rail && track && !stillCapture && !reduced.matches) {
    let drag = null;
    const half = () => track.scrollWidth / 2 || 1;
    const offsetNow = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
    const wrap = x => { const h = half(); return ((x % h) - h) % h; };
    const end = () => {
      if (!drag) return;
      if (drag.moved) {
        const duration = parseFloat(getComputedStyle(track).animationDuration) * 1000 || 42000;
        const progress = -drag.x / half();
        track.style.transform = '';
        track.style.animation = '';
        track.style.animationDelay = `${-(progress * duration).toFixed(0)}ms`;
      }
      track.style.animationPlayState = '';
      rail.classList.remove('is-dragging');
      drag = null;
    };
    rail.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, base: offsetNow(), x: 0, moved: false };
      track.style.animationPlayState = 'paused';
    });
    rail.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x0, dy = event.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag.moved = false; end(); return; } // a vertical scroll
        drag.moved = true;
        rail.classList.add('is-dragging');
        track.style.animation = 'none';
        try { rail.setPointerCapture(drag.id); } catch { /* keep dragging without capture */ }
      }
      drag.x = wrap(drag.base + dx);
      track.style.transform = `translate3d(${drag.x.toFixed(1)}px,0,0)`;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => rail.addEventListener(type, end));
  }

  if (stillCapture || reduced.matches || !('IntersectionObserver' in window)) return;
  // Round 17g (David): every section animates whenever it comes into view, also when
  // scrolling back up, without a reload. Blocks marked data-reveal rise in; every <section>
  // of <main> (except the fixed hero) gets .is-inview, which drives section-specific
  // animations in CSS. An element is reset only once it is completely off screen, so the
  // reset is never seen. Animations use fill-mode `backwards`, so after they end each
  // component's own styles (hover lifts, transitions) apply again.
  root.classList.add('js-anim');
  const blocks = [...document.querySelectorAll('[data-reveal]')];
  const sections = [...document.querySelectorAll('main section:not(.hx)')];
  blocks.forEach(el => el.classList.add('reveal'));
  sections.forEach(el => el.classList.add('anim-sec'));
  const targets = [...blocks, ...sections];
  // Count-up for the 12 / 20+ facts (visual only; the final text is already in the HTML).
  const counters = [...document.querySelectorAll('.about-stats .stat strong')].map(el => {
    const node = el.firstChild;
    const match = node && node.nodeType === 3 ? node.nodeValue.match(/^(\d+)(\D*)$/) : null;
    return match ? { node, end: Number(match[1]), suffix: match[2], section: el.closest('section') } : null;
  }).filter(Boolean);
  function count(section) {
    counters.filter(item => item.section === section).forEach(item => {
      const start = performance.now(), duration = 1300;
      const step = now => {
        const t = Math.min(1, (now - start) / duration);
        item.node.nodeValue = `${Math.round(item.end * (1 - Math.pow(1 - t, 3)))}${item.suffix}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  const enter = el => { if (el.classList.contains('is-inview')) return; el.classList.add('is-inview'); if (el.classList.contains('anim-sec')) count(el); };
  // Already on screen at load: shown at once (animated), no hidden frame.
  targets.forEach(el => { const box = el.getBoundingClientRect(); if (box.top < window.innerHeight && box.bottom > 0) enter(el); });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) enter(entry.target);
      else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) entry.target.classList.remove('is-inview');
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  targets.forEach(el => observer.observe(el));
  const showAll = () => { observer.disconnect(); root.classList.remove('js-anim'); counters.forEach(item => { item.node.nodeValue = `${item.end}${item.suffix}`; }); };
  reduced.addEventListener?.('change', () => { if (reduced.matches) showAll(); });
  // Anchor jumps and find-in-page should never land on hidden content.
  window.addEventListener('hashchange', showAll, { once: true });
  window.addEventListener('beforeprint', showAll);
})();
