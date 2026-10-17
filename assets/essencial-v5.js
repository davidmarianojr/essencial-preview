(() => {
const root = document.documentElement;
const stillCapture = new URLSearchParams(window.location.search).get('capture') === '1';
if (stillCapture) root.classList.add('is-still');
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#primary-nav');
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
nav?.addEventListener('focusout', event => {
if (isOpen() && collapsed.matches && event.relatedTarget && !event.relatedTarget.closest('.header-inner')) setMenu(false);
});
collapsed.addEventListener?.('change', () => { if (!collapsed.matches) setMenu(false); });
if (header) {
const solid = document.body.classList.contains('header-solid');
let queued = false;
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
if (document.body.classList.contains('home-page')) {
const body = document.body;
const update = () => { body.classList.toggle('fab-ready', window.scrollY > window.innerHeight * 0.55); };
update();
window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update, { passive: true });
}
document.querySelectorAll('[data-directions]').forEach(menu => {
const item = menu.querySelector('[data-share-item]');
const button = menu.querySelector('[data-share-address]');
const label = button && button.querySelector('span');
if (item && button && (navigator.share || navigator.clipboard)) {
if (!navigator.share) label.textContent = 'Copiar endereço';
item.hidden = false;
button.addEventListener('click', async () => {
const { shareTitle: title, shareText: text, shareUrl: url } = button.dataset;
try {
if (navigator.share) await navigator.share({ title, text: `${title}\n${text}`, url });
else { await navigator.clipboard.writeText(`${text}\n${url}`); label.textContent = 'Endereço copiado'; setTimeout(() => { label.textContent = 'Copiar endereço'; }, 2200); }
} catch (error) { /* share sheet dismissed */ }
});
}
document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
menu.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
});
document.querySelectorAll('[data-tp]').forEach(box => {
const tabs = [...box.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const glass = box.querySelector('.tp-glass');
const pause = box.querySelector('.tp-pause');
const label = pause && pause.querySelector('.tp-pause-label');
const duration = 7000;
let index = 0, turn = 0, timer = 0, paused = false, visible = false, leaving = null, leaveTimer = 0;
const clearLeaving = () => { clearTimeout(leaveTimer); if (leaving) { leaving.classList.remove('is-leaving'); if (!leaving.classList.contains('is-active')) leaving.hidden = true; } leaving = null; };
const playing = () => visible && !paused && !reduced.matches && !document.hidden;
const schedule = () => {
clearTimeout(timer);
box.classList.remove('is-playing');
if (!playing()) return;
void box.offsetWidth; // restart the progress bar of the selected tab
box.classList.add('is-playing');
timer = setTimeout(() => select(index + 1, false), duration);
};
const select = (next, focus) => {
next = (next + tabs.length) % tabs.length;
if (next !== index) {
const animate = !reduced.matches;
const previous = panels[index];
clearLeaving();
panels.forEach(panel => panel.classList.remove('is-entering'));
previous.classList.remove('is-active');
if (animate) { leaving = previous; previous.classList.add('is-leaving'); previous.addEventListener('animationend', function gone(event) { if (event.target !== previous) return; previous.removeEventListener('animationend', gone); if (leaving === previous) clearLeaving(); }); leaveTimer = setTimeout(clearLeaving, 2500); } else previous.hidden = true;
const panel = panels[next];
panel.hidden = false;
panel.classList.add('is-active');
if (animate) { panel.classList.add('is-entering'); panel.addEventListener('animationend', function done(event) { if (event.target !== panel) return; panel.classList.remove('is-entering'); panel.removeEventListener('animationend', done); }); }
turn += next > index || (index === tabs.length - 1 && next === 0) ? 120 : -120;
if (glass) glass.style.setProperty('--tp-r', `${turn}deg`);
index = next;
}
tabs.forEach((tab, i) => { const on = i === index; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; });
if (focus) tabs[index].focus();
schedule();
};
box.classList.add('is-live');
panels.forEach((panel, i) => { panel.hidden = i !== 0; panel.classList.toggle('is-active', i === 0); });
tabs.forEach((tab, i) => {
tab.addEventListener('click', () => select(i, false));
tab.addEventListener('keydown', event => {
const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
if (next === undefined) return;
event.preventDefault();
select(next, true);
});
});
const syncPause = () => {
if (!pause) return;
pause.hidden = reduced.matches;
pause.classList.toggle('is-paused', paused);
label.textContent = paused ? 'Retomar troca automática' : 'Pausar troca automática';
};
pause && pause.addEventListener('click', () => { paused = !paused; syncPause(); schedule(); });
reduced.addEventListener('change', () => { syncPause(); schedule(); });
document.addEventListener('visibilitychange', schedule);
const warm = () => box.querySelectorAll('.tp-panel img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) warm(); schedule(); }, { threshold: 0.35 }).observe(box.querySelector('.tp-stage'));
else warm();
syncPause();
schedule();
});
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
root.classList.add('js-anim');
const blocks = [...document.querySelectorAll('[data-reveal]')];
const sections = [...document.querySelectorAll('main section:not(.hx)')];
blocks.forEach(el => el.classList.add('reveal'));
sections.forEach(el => el.classList.add('anim-sec'));
const targets = [...blocks, ...sections];
const counters = [...document.querySelectorAll('.about-stats .stat strong, [data-count]')].map(el => {
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
setTimeout(() => { item.node.nodeValue = `${item.end}${item.suffix}`; }, duration + 250);
});
}
const enter = el => { if (el.classList.contains('is-inview')) return; el.classList.add('is-inview'); if (el.classList.contains('anim-sec')) count(el); };
const viewHeight = window.innerHeight;
targets.filter(el => { const box = el.getBoundingClientRect(); return box.top < viewHeight && box.bottom > 0; }).forEach(enter);
const observer = new IntersectionObserver(entries => {
entries.forEach(entry => {
if (entry.isIntersecting) enter(entry.target);
else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) entry.target.classList.remove('is-inview');
});
}, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
targets.forEach(el => observer.observe(el));
const showAll = () => { observer.disconnect(); root.classList.remove('js-anim'); counters.forEach(item => { item.node.nodeValue = `${item.end}${item.suffix}`; }); };
reduced.addEventListener?.('change', () => { if (reduced.matches) showAll(); });
window.addEventListener('hashchange', showAll, { once: true });
window.addEventListener('beforeprint', showAll);
})();
