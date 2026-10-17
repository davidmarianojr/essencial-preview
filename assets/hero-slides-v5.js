(() => {
const hero = document.querySelector('[data-hx]');
if (!hero) return;
const slides = [...hero.querySelectorAll('[data-hx-slide]')];
const area = hero.querySelector('.hx-slides');
const controls = hero.querySelector('.hx-controls');
const bar = hero.querySelector('.hx-bar');
const dots = [...hero.querySelectorAll('[data-hx-go]')];
const play = hero.querySelector('[data-hx-play]');
const playLabel = hero.querySelector('[data-hx-play-label]');
const status = hero.querySelector('[data-hx-status]');
const cover = document.querySelector('.home-cover');
const menuToggle = document.querySelector('.menu-toggle');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const params = new URLSearchParams(window.location.search);
const still = params.get('capture') === '1';
const interval = Math.max(6000, Number(hero.dataset.interval) || 8000);
if (slides.length < 2 || !area || !controls || !play) return;
let current = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
const requested = Number(params.get('slide'));
if (Number.isInteger(requested) && requested >= 1 && requested <= slides.length) current = requested - 1;
let timer = 0, leaveTimer = 0, switchTimer = 0, frame = 0, measureQueued = false, turns = 0;
const glass = hero.querySelector('.hx-stage .hx-glass');
const scrollTimeline = window.CSS?.supports?.('animation-timeline: scroll()') === true;
function placeGlass(animated) {
if (!glass) return;
const subject = slides[current].querySelector('.hx-figure, .hx-phone, .p5-portal-scene');
if (!subject || !subject.offsetWidth) return;
let x = 0, y = 0;
for (let node = subject; node && node !== area; node = node.offsetParent) { x += node.offsetLeft; y += node.offsetTop; }
const w = subject.offsetWidth, h = subject.offsetHeight;
const phone = subject.classList.contains('hx-phone');
const size = w * (phone ? (window.innerWidth < 900 ? 1.12 : 1.3) : 1.1);
const top = subject.classList.contains('hx-figure') ? y + h * .04 : phone ? y + h * .04 : y - h * .03;
x -= (size - w) / 2;
if (!animated) hero.classList.add('is-placing');
glass.style.setProperty('--gx', `${x.toFixed(1)}px`);
glass.style.setProperty('--gy', `${top.toFixed(1)}px`);
glass.style.setProperty('--gs', (size / 1000).toFixed(4));
glass.style.setProperty('--gr', `${turns * 360}deg`);
if (!animated) { void glass.getBoundingClientRect(); hero.classList.remove('is-placing'); }
hero.classList.add('is-staged');
}
function enter(slide, intro) {
window.clearTimeout(switchTimer);
slides.forEach(item => item.classList.remove('is-entering'));
if (reduced.matches || still) { hero.classList.remove('is-intro', 'is-switching'); return; }
void slide.offsetWidth;
slide.classList.add('is-entering');
hero.classList.toggle('is-intro', intro);
switchTimer = window.setTimeout(() => { slide.classList.remove('is-entering'); hero.classList.remove('is-switching', 'is-intro'); }, 2800);
}
let userPaused = false, focusHold = false, covered = false, obscured = false, navOpen = false, swipe = null;
hero.style.setProperty('--hx-interval', `${interval}ms`);
controls.hidden = false;
slides.forEach(slide => { slide.hidden = false; });
const menuOpen = () => menuToggle?.getAttribute('aria-expanded') === 'true';
const canPlay = () => !userPaused && !reduced.matches && !still && !focusHold && !covered && !obscured && !navOpen && !menuOpen() && !document.hidden;
function render() {
slides.forEach((slide, index) => {
const active = index === current;
slide.classList.toggle('is-active', active);
slide.setAttribute('aria-hidden', String(!active));
slide.inert = !active;
});
dots.forEach((dot, index) => {
if (index === current) dot.setAttribute('aria-current', 'true');
else dot.removeAttribute('aria-current');
});
}
function updatePlay() {
const fixed = reduced.matches || still;
play.disabled = fixed;
play.dataset.state = userPaused || fixed ? 'paused' : 'playing';
playLabel.textContent = fixed ? (still ? 'Captura' : 'Movimento reduzido') : userPaused ? 'Retomar' : 'Pausar';
play.setAttribute('aria-label', fixed ? 'Apresentação automática desativada' : userPaused ? 'Retomar apresentação automática' : 'Pausar apresentação automática');
hero.classList.toggle('is-playing', canPlay());
}
function schedule() {
window.clearTimeout(timer);
timer = 0;
updatePlay();
dots.forEach(dot => dot.removeAttribute('data-run'));
if (!canPlay()) return;
const dot = dots[current];
if (dot) { void dot.offsetWidth; dot.setAttribute('data-run', ''); } // restart progress bar
timer = window.setTimeout(() => { timer = 0; if (canPlay()) show(current + 1, false); }, interval);
}
function show(index, manual = true) {
const next = (index + slides.length) % slides.length;
if (next !== current) {
const previous = slides[current];
const instant = reduced.matches || still;
const forward = index > current ? 1 : -1;
window.clearTimeout(leaveTimer);
slides.forEach(slide => slide.classList.remove('is-leaving'));
hero.classList.remove('is-switching', 'is-intro');
current = next;
if (!instant) {
hero.style.setProperty('--hx-dir', String(forward));
turns += forward;
hero.classList.add('is-switching');
previous.classList.add('is-leaving');
leaveTimer = window.setTimeout(() => previous.classList.remove('is-leaving'), 1000);
}
enter(slides[current], false);
render();
placeGlass(!instant);
}
render();
if (manual) status.textContent = `${slides[current].getAttribute('aria-label')}.`;
if (typeof updateCover === 'function') updateCover(); // new slide's CTAs may sit under the surface
schedule();
}
hero.querySelector('[data-hx-prev]')?.addEventListener('click', () => show(current - 1));
hero.querySelector('[data-hx-next]')?.addEventListener('click', () => show(current + 1));
dots.forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.hxGo))));
play.addEventListener('click', () => {
if (reduced.matches || still) return;
userPaused = !userPaused;
status.textContent = userPaused ? 'Apresentação automática pausada.' : 'Apresentação automática retomada.';
schedule();
});
hero.addEventListener('focusin', event => {
focusHold = Boolean(event.target.closest('.hx-slide')) && event.target.matches(':focus-visible');
schedule();
});
hero.addEventListener('focusout', event => {
if (!event.relatedTarget || !event.relatedTarget.closest?.('.hx-slide')) { focusHold = false; schedule(); }
});
area.addEventListener('pointerdown', event => {
if (!event.isPrimary || !['touch', 'pen'].includes(event.pointerType) || event.target.closest('a, button')) return;
swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
}, { passive: true });
area.addEventListener('pointerup', event => {
if (!swipe || event.pointerId !== swipe.id) return;
const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
swipe = null;
if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.35) show(current + (dx < 0 ? 1 : -1));
}, { passive: true });
area.addEventListener('pointercancel', () => { swipe = null; }, { passive: true });
let pointerFrame = 0, pointerX = 0, pointerY = 0;
function writePointer() {
pointerFrame = 0;
hero.style.setProperty('--mx', pointerX.toFixed(3));
hero.style.setProperty('--my', pointerY.toFixed(3));
}
hero.addEventListener('pointermove', event => {
if (event.pointerType !== 'mouse' || !fine.matches || reduced.matches || still) return;
const box = hero.getBoundingClientRect();
pointerX = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - .5) * 2));
pointerY = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height - .5) * 2));
if (!pointerFrame) pointerFrame = requestAnimationFrame(writePointer);
}, { passive: true });
hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; if (!pointerFrame) pointerFrame = requestAnimationFrame(writePointer); }, { passive: true });
hero.addEventListener('keydown', event => {
if (event.altKey || event.metaKey || event.ctrlKey) return;
const target = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1 }[event.key];
if (target === undefined || !event.target.closest('.hx-controls')) return;
event.preventDefault();
show(target);
dots[current]?.focus({ preventScroll: true });
});
function fits(slide) {
const copy = slide.querySelector('.hx-copy');
const visual = slide.querySelector('.hx-visual');
if (!copy || !visual) return true;
const top = parseFloat(getComputedStyle(slide).paddingTop) || 0;
const copyTop = copy.offsetTop;
const copyBottom = copyTop + copy.offsetHeight - (parseFloat(getComputedStyle(copy).paddingBottom) || 0);
const limit = slide.clientHeight - (bar?.offsetHeight || 0);
return copyTop >= top - 2 && copyBottom <= limit + 2 && visual.offsetHeight >= 140;
}
let layered = false;
function measure() {
measureQueued = false;
hero.classList.remove('hx-flow');
if (getComputedStyle(hero).position !== 'sticky') { layered = false; return; } // CSS short-viewport fallback
hero.classList.toggle('hx-flow', !slides.every(fits));
layered = !hero.classList.contains('hx-flow');
}
function queueMeasure() { if (!measureQueued) { measureQueued = true; requestAnimationFrame(() => { measure(); if (!hero.classList.contains('is-switching')) placeGlass(false); updateCover(); schedule(); }); } }
const focusables = [...hero.querySelectorAll('a[href], button')];
const siteHeader = document.querySelector('.site-header');
const landings = [...(cover ? cover.querySelectorAll(':scope > section') : []), document.querySelector('.site-footer')].filter(Boolean);
function visibleAmount(region) {
const top = Math.max(0, siteHeader?.getBoundingClientRect().bottom || 0);
const box = region.getBoundingClientRect();
return { visible: Math.min(box.bottom, window.innerHeight) - Math.max(box.top, top), height: box.height };
}
const meaningful = region => { const { visible, height } = visibleAmount(region); return visible >= Math.min(96, height); };
function visibleLanding() {
let fallback = null, fallbackVisible = 0;
for (const region of landings) {
const { visible, height } = visibleAmount(region);
if (visible >= Math.min(96, height)) return region; // topmost meaningfully visible
if (visible > fallbackVisible) { fallback = region; fallbackVisible = visible; }
}
return fallback; // e.g. the surface has only just started to rise
}
const supportsScrollEnd = 'onscrollend' in window;
let relocatedTo = null, settleTimer = 0;
function moveFocusTo(target) {
if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
target.focus({ preventScroll: true });
relocatedTo = document.activeElement === target ? target : null;
}
function relocateFocusFrom(container) {
const focused = document.activeElement;
if (!focused || focused === document.body || !container.contains(focused)) return;
const target = visibleLanding();
if (!target) { focused.blur(); relocatedTo = null; return; }
moveFocusTo(target);
}
function settleRelocated(final) {
window.clearTimeout(settleTimer);
if (!relocatedTo) return;
if (document.activeElement !== relocatedTo) { relocatedTo = null; return; } // user moved on
if (!meaningful(relocatedTo)) {
const target = visibleLanding();
if (target && target !== relocatedTo) moveFocusTo(target);
}
if (final) relocatedTo = null;
}
if (supportsScrollEnd) window.addEventListener('scrollend', () => settleRelocated(true), { passive: true });
document.addEventListener('keydown', event => { if (event.key === 'Tab' && relocatedTo) settleRelocated(false); }, true);
function setCovered(element, isCovered) {
if (isCovered && !element.hasAttribute('data-hx-covered')) {
relocateFocusFrom(element);
element.setAttribute('data-hx-covered', '');
element.inert = true;
} else if (!isCovered && element.hasAttribute('data-hx-covered')) {
element.removeAttribute('data-hx-covered');
element.inert = false;
}
}
function updateCover() {
frame = 0;
let nextObscured = false, nextCovered = false;
if (layered && cover) {
const coverTop = cover.getBoundingClientRect().top;
focusables.forEach(element => {
const box = element.getBoundingClientRect();
setCovered(element, box.height > 0 && box.bottom > coverTop - 2);
});
nextObscured = coverTop < window.innerHeight - 2;
nextCovered = coverTop < window.innerHeight * .4;
if (!scrollTimeline && !reduced.matches && !still) {
const progress = Math.min(1, Math.max(0, 1 - coverTop / window.innerHeight));
hero.classList.add('is-js-parallax');
hero.style.setProperty('--hx-p', progress.toFixed(3));
}
} else {
focusables.forEach(element => setCovered(element, false));
const box = hero.getBoundingClientRect();
const visible = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
nextObscured = visible < Math.min(box.height, window.innerHeight) * .4;
}
let changed = false;
if (nextCovered !== covered) {
covered = nextCovered;
if (covered) relocateFocusFrom(hero);
hero.inert = covered;
if (covered) hero.setAttribute('aria-hidden', 'true'); else hero.removeAttribute('aria-hidden');
changed = true;
}
if (nextObscured !== obscured) { obscured = nextObscured; changed = true; }
if (changed) schedule();
}
window.addEventListener('scroll', () => {
if (!frame) frame = requestAnimationFrame(updateCover);
if (relocatedTo && !supportsScrollEnd) { window.clearTimeout(settleTimer); settleTimer = window.setTimeout(() => settleRelocated(true), 160); }
}, { passive: true });
window.addEventListener('resize', queueMeasure, { passive: true });
window.visualViewport?.addEventListener('resize', queueMeasure, { passive: true });
window.addEventListener('pageshow', queueMeasure);
document.addEventListener('visibilitychange', schedule);
document.addEventListener('essencial:navigation-state', event => { navOpen = event.detail?.open === true; schedule(); });
if (menuToggle && 'MutationObserver' in window) new MutationObserver(schedule).observe(menuToggle, { attributes: true, attributeFilter: ['aria-expanded'] });
reduced.addEventListener?.('change', () => { queueMeasure(); schedule(); });
document.fonts?.ready.then(queueMeasure);
hero.querySelectorAll('img').forEach(image => { if (!image.complete) image.addEventListener('load', queueMeasure, { once: true }); });
window.addEventListener('load', () => hero.querySelectorAll('img').forEach(image => image.decode?.().catch(() => {})), { once: true });
render();
measure();
placeGlass(false);
enter(slides[current], true);
updateCover();
schedule();
})();
