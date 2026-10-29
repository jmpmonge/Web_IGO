'use strict';
/* IGOExperiences. One card every 7s, 700ms ease-in-out, then still.
   scripts/experiences.json motion "manual" keeps it static.
   prefers-reduced-motion never starts the automatic movement.
   A clone of the first visible cards exists only so the loop can pass the
   last card without a jump. It is hidden from assistive technology. */
(function () {
  var root = document.querySelector('[data-igo-experiences]');
  if (!root) return;
  var viewport = root.querySelector('[data-experiences]');
  var set = root.querySelector('[data-experiences-set]');
  var prev = root.querySelector('[data-experiences-prev]');
  var next = root.querySelector('[data-experiences-next]');
  var pauseBtn = root.querySelector('[data-experiences-pause]');
  var dotsBox = root.querySelector('[data-experiences-dots]');
  if (!viewport || !set) return;

  var INTERVAL = 7000;
  var DURATION = 700;
  var COOLDOWN = 10000;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wantAuto = root.getAttribute('data-experiences-motion') === 'auto';
  var dotLabel = dotsBox ? (dotsBox.getAttribute('data-dot-label') || '') : '';
  var timer = 0;
  var raf = 0;
  var animating = false;
  var lock = false;
  var userPaused = false;
  var hover = false;
  var focused = false;
  var hidden = document.hidden;
  var off = false;
  var coolUntil = 0;
  var cloneCount = -1;
  var drag = null;
  var touching = false;

  function realCards() { return set.querySelectorAll('.xcard:not([data-xp-clone])'); }
  function allCards() { return set.querySelectorAll('.xcard'); }

  function metrics() {
    var list = realCards();
    if (!list.length) return null;
    var gap = parseFloat(window.getComputedStyle(set).columnGap);
    if (!gap) gap = parseFloat(window.getComputedStyle(set).gap) || 0;
    var width = list[0].getBoundingClientRect().width;
    var step = width + gap;
    if (step < 1) return null;
    var visible = Math.max(1, Math.round((viewport.clientWidth + gap * 0.5) / step));
    if (visible > list.length) visible = list.length;
    return { step: step, visible: visible, count: list.length };
  }

  function logicalIndex(m) {
    var raw = Math.round(viewport.scrollLeft / m.step);
    if (raw < 0) raw = 0;
    return raw % m.count;
  }

  function alignLeft(index) {
    var card = allCards()[index];
    if (!card) return viewport.scrollLeft;
    return viewport.scrollLeft + card.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = 0; }
  }

  function stopAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    animating = false;
    viewport.style.scrollSnapType = '';
    viewport.style.scrollBehavior = '';
  }

  function jumpTo(index) {
    lock = true;
    viewport.style.scrollSnapType = 'none';
    viewport.style.scrollBehavior = 'auto';
    viewport.scrollLeft = alignLeft(index);
    viewport.style.scrollSnapType = '';
    viewport.style.scrollBehavior = '';
    lock = false;
  }

  function canMove() {
    var m = metrics();
    return !!(m && m.visible < m.count);
  }

  function canAuto() {
    if (!wantAuto || reduce.matches || userPaused || hover || hidden || off) return false;
    if (animating || lock || focusedBlock()) return false;
    if (Date.now() < coolUntil) return false;
    return canMove();
  }

  function focusedBlock() {
    if (!focused) return false;
    if (pauseBtn && document.activeElement === pauseBtn && !userPaused) return false;
    return true;
  }

  function schedule() {
    clearTimer();
    if (!wantAuto || reduce.matches || userPaused || hover || hidden || off || focusedBlock()) return;
    if (!canMove()) return;
    var wait = INTERVAL;
    var now = Date.now();
    if (now < coolUntil) wait = Math.max(INTERVAL, coolUntil - now);
    timer = setTimeout(function () {
      timer = 0;
      if (!canAuto()) { schedule(); return; }
      var m = metrics();
      if (!m) return;
      go(logicalIndex(m) + 1, false);
    }, wait);
  }

  function interact() {
    coolUntil = Date.now() + COOLDOWN;
    clearTimer();
  }

  function animateTo(target, done) {
    stopAnim();
    var from = viewport.scrollLeft;
    var delta = target - from;
    if (Math.abs(delta) < 1 || reduce.matches) {
      viewport.scrollLeft = target;
      if (done) done();
      return;
    }
    animating = true;
    viewport.style.scrollSnapType = 'none';
    viewport.style.scrollBehavior = 'auto';
    var start = 0;
    function frame(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / DURATION);
      viewport.scrollLeft = from + delta * ease(t);
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        raf = 0;
        animating = false;
        viewport.style.scrollSnapType = '';
        viewport.style.scrollBehavior = '';
        if (done) done();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function go(index, manual) {
    var m = metrics();
    if (!m || m.visible >= m.count) return;
    stopAnim();
    if (manual) interact();
    else clearTimer();
    var dest = index;
    if (dest < 0) {
      jumpTo(m.count);
      dest = m.count - 1;
    } else if (dest > m.count) dest = m.count;
    var target = alignLeft(dest);
    animateTo(target, function () {
      if (dest >= m.count) jumpTo(0);
      paint();
      schedule();
    });
  }

  function normalize() {
    if (animating || lock || drag || touching) return;
    var m = metrics();
    if (!m) return;
    var raw = Math.round(viewport.scrollLeft / m.step);
    if (raw >= m.count) jumpTo(raw - m.count);
  }

  function paint() {
    var m = metrics();
    if (!m) return;
    var i = logicalIndex(m);
    var can = m.visible < m.count;
    if (prev) prev.disabled = !can;
    if (next) next.disabled = !can;
    if (!dotsBox) return;
    var dots = dotsBox.querySelectorAll('.xband__dot');
    for (var d = 0; d < dots.length; d++) {
      var on = d === i;
      dots[d].classList.toggle('is-on', on);
      if (on) dots[d].setAttribute('aria-current', 'true');
      else dots[d].removeAttribute('aria-current');
    }
  }

  function syncPause() {
    if (!pauseBtn) return;
    var show = wantAuto && !reduce.matches && canMove();
    pauseBtn.hidden = !show;
    pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    var playLabel = pauseBtn.getAttribute('data-label-play') || 'Play';
    var pauseLabel = pauseBtn.getAttribute('data-label-pause') || 'Pause';
    pauseBtn.setAttribute('aria-label', userPaused ? playLabel : pauseLabel);
    var pauseIcon = pauseBtn.querySelector('[data-icon-pause]');
    var playIcon = pauseBtn.querySelector('[data-icon-play]');
    if (pauseIcon) pauseIcon.hidden = userPaused;
    if (playIcon) playIcon.hidden = !userPaused;
  }

  function setupClones(m) {
    var old = set.querySelectorAll('[data-xp-clone]');
    for (var c = 0; c < old.length; c++) old[c].remove();
    if (!m || m.visible >= m.count) { cloneCount = 0; return; }
    var list = realCards();
    for (var i = 0; i < m.visible; i++) {
      var clone = list[i].cloneNode(true);
      clone.setAttribute('data-xp-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      var links = clone.querySelectorAll('a, button');
      for (var k = 0; k < links.length; k++) links[k].tabIndex = -1;
      set.appendChild(clone);
    }
    cloneCount = m.visible;
  }

  function layout() {
    var m = metrics();
    if (!m) return;
    var need = m.visible < m.count ? m.visible : 0;
    if (need !== cloneCount) {
      var i = logicalIndex(m);
      stopAnim();
      setupClones(m);
      m = metrics();
      if (m) {
        lock = true;
        viewport.scrollLeft = i * m.step;
        lock = false;
      }
    }
    syncPause();
    paint();
    if (!timer && !animating) schedule();
  }

  function buildDots() {
    if (!dotsBox) return;
    var label = dotLabel.indexOf('{n}') === -1 ? 'Experience {n}' : dotLabel;
    var list = realCards();
    dotsBox.textContent = '';
    for (var i = 0; i < list.length; i++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'xband__dot';
      button.setAttribute('aria-label', label.replace('{n}', String(i + 1)));
      button.addEventListener('click', (function (index) {
        return function () { go(index, true); };
      })(i));
      dotsBox.appendChild(button);
    }
  }

  if (prev) prev.addEventListener('click', function () {
    var m = metrics();
    if (!m) return;
    go(logicalIndex(m) - 1, true);
  });
  if (next) next.addEventListener('click', function () {
    var m = metrics();
    if (!m) return;
    go(logicalIndex(m) + 1, true);
  });
  if (pauseBtn) pauseBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    hover = false;
    if (userPaused) clearTimer();
    syncPause();
    schedule();
  });

  root.addEventListener('mouseenter', function () { hover = true; clearTimer(); });
  root.addEventListener('mouseleave', function () { hover = false; schedule(); });
  root.addEventListener('focusin', function () { focused = true; clearTimer(); });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) { focused = false; schedule(); }
  });

  var scrollTick = false;
  viewport.addEventListener('scroll', function () {
    if (lock || animating) return;
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      normalize();
      paint();
    });
  }, { passive: true });

  viewport.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var m = metrics();
    if (!m) return;
    var i = logicalIndex(m);
    if (e.key === 'ArrowRight') { go(i + 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(i - 1, true); e.preventDefault(); }
    else if (e.key === 'Home') { go(0, true); e.preventDefault(); }
    else if (e.key === 'End') { go(m.count - 1, true); e.preventDefault(); }
  });

  viewport.addEventListener('touchstart', function () { touching = true; clearTimer(); }, { passive: true });
  viewport.addEventListener('touchend', function () {
    touching = false;
    interact();
    normalize();
    paint();
    schedule();
  }, { passive: true });
  viewport.addEventListener('touchcancel', function () { touching = false; schedule(); }, { passive: true });
  viewport.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    interact();
    schedule();
  }, { passive: true });

  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    if (e.target.closest && e.target.closest('a, button')) return;
    stopAnim();
    clearTimer();
    drag = { id: e.pointerId, x: e.clientX, left: viewport.scrollLeft, moved: false };
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      viewport.classList.add('is-dragging');
      if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
    }
    viewport.scrollLeft = drag.left - dx;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = drag.moved;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (moved) {
      interact();
      normalize();
      paint();
      schedule();
      viewport.addEventListener('click', function swallow(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        viewport.removeEventListener('click', swallow, true);
      }, true);
    } else schedule();
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    if (hidden) clearTimer();
    else schedule();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      off = !entries[entries.length - 1].isIntersecting;
      if (off) clearTimer();
      else schedule();
    }, { threshold: 0.25 }).observe(root);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', function () { syncPause(); if (reduce.matches) clearTimer(); else schedule(); });

  window.addEventListener('resize', layout);
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(viewport);
  window.addEventListener('pagehide', function () { clearTimer(); stopAnim(); });

  buildDots();
  layout();
})();
