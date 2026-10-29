'use strict';
/* IGO Home: mobile menu, anchor focus, motion (3 types) and video-ready hero. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Menu ---- */
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  var mobile = window.matchMedia('(max-width: 47.99em)');
  function setMenu(open) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);                     /* CSS locks the page scroll while the menu is open (mobile) */
  }
  function focusFirstLink() {
    var links = nav.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].offsetParent === null) continue;               /* skip links that are not displayed */
      links[i].focus();
      return;
    }
  }
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) focusFirstLink();                                 /* keyboard and screen-reader users land inside the menu */
    });
    nav.addEventListener('focusout', function (e) {               /* Tab leaving the open menu closes it */
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      var to = e.relatedTarget;
      if (to && !nav.contains(to) && to !== btn) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !btn.contains(e.target)) setMenu(false);
    });
    var onBp = function () { if (!mobile.matches) setMenu(false); };
    if (mobile.addEventListener) mobile.addEventListener('change', onBp); else mobile.addListener(onBp);
  }

  /* ---- In-page anchors: close menu, move focus to target ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var t = id && document.getElementById(id);
    setMenu(false);
    if (!t) return;
    setTimeout(function () {
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }, 0);
  });

  /* ---- Motion ---- */
  var items = document.querySelectorAll('[data-motion]');
  var scenes = document.querySelectorAll('.scene');
  var io = null, ticking = false;
  function showAll() { items.forEach(function (el) { el.classList.add('is-in'); }); }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      scenes.forEach(function (s) {
        var r = s.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.6)));
        s.style.setProperty('--p', p.toFixed(3));
      });
      ticking = false;
    });
  }
  function startMotion() {
    if (reduce.matches || !('IntersectionObserver' in window)) { stopMotion(); return; }
    root.classList.add('motion');
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    requestAnimationFrame(function () {
      root.classList.add('motion-ready');
      requestAnimationFrame(function () { items.forEach(function (el) { if (io && !el.classList.contains('is-in')) io.observe(el); }); });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  function stopMotion() {
    if (io) { io.disconnect(); io = null; }
    window.removeEventListener('scroll', onScroll);
    root.classList.remove('motion', 'motion-ready');
    scenes.forEach(function (s) { s.style.removeProperty('--p'); });
    showAll();
  }
  startMotion();
  var onReduce = function () { if (reduce.matches) stopMotion(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce); else reduce.addListener(onReduce);

  /* ---- Breathing band ring (inactive if [data-ring] is missing): turns -12° → 12°, lifts 20px → -20px and settles 0.96 → 1
     with the scroll progress of its band, only while the band is in view. Transform only; no pinning; static with reduced motion. ---- */
  var ring = document.querySelector('[data-ring]');
  var ringBand = ring && (ring.closest('.scene') || ring.parentNode);
  var ringIo = null, ringOn = false, ringTick = false;
  function ringFrame() {
    ringTick = false;
    var vh = window.innerHeight;
    var r = ringBand.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, 1 - (r.top + r.height / 2) / vh));    /* centre of the band: 0 at the bottom edge of the viewport · 1 at the top edge */
    var s = Math.min(1, p * 2); s = 1 - (1 - s) * (1 - s);                    /* scale reaches 1 at mid-way, ease-out */
    ring.style.transform = 'translate3d(0,' + (20 - 40 * p).toFixed(2) + 'px,0) rotate(' + (-12 + 24 * p).toFixed(2) + 'deg) scale(' + (0.96 + 0.04 * s).toFixed(4) + ')';
  }
  function onRingScroll() {
    if (ringTick) return; ringTick = true;
    requestAnimationFrame(ringFrame);
  }
  function startRing() {
    if (!ring || ringIo || reduce.matches || !('IntersectionObserver' in window)) return;
    ringIo = new IntersectionObserver(function (entries) {
      var visible = entries[entries.length - 1].isIntersecting;
      if (visible && !ringOn) { ringOn = true; window.addEventListener('scroll', onRingScroll, { passive: true }); window.addEventListener('resize', onRingScroll, { passive: true }); onRingScroll(); }
      else if (!visible && ringOn) { ringOn = false; window.removeEventListener('scroll', onRingScroll); window.removeEventListener('resize', onRingScroll); }
    }, { rootMargin: '10% 0px' });
    ringIo.observe(ringBand);
    ringFrame();                                                  /* start pose before the band is reached, no jump on entry */
  }
  function stopRing() {
    if (ringIo) { ringIo.disconnect(); ringIo = null; }
    ringOn = false;
    window.removeEventListener('scroll', onRingScroll);
    window.removeEventListener('resize', onRingScroll);
    if (ring) ring.style.removeProperty('transform');
  }
  if (ring) {
    startRing();
    var onReduceRing = function () { if (reduce.matches) stopRing(); else startRing(); };
    if (reduce.addEventListener) reduce.addEventListener('change', onReduceRing); else reduce.addListener(onReduceRing);
  }

  /* ---- Ecosystem cards carousel: native horizontal scroll + prev/next; no scroll-jacking; respects prefers-reduced-motion ---- */
  var cardsRoot = document.querySelector('[data-cards]');
  if (cardsRoot) {
    var track = cardsRoot.querySelector('[data-cards-track]');
    var prevBtn = cardsRoot.querySelector('[data-cards-prev]');
    var nextBtn = cardsRoot.querySelector('[data-cards-next]');
    function cardStep() {
      var card = track && track.querySelector('.ccard');
      if (!card) return 320;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 20;
      return card.getBoundingClientRect().width + gap;
    }
    function updateCardsNav() {
      if (!track || !prevBtn || !nextBtn) return;
      var max = Math.max(0, track.scrollWidth - track.clientWidth - 1);
      prevBtn.disabled = track.scrollLeft <= 1;
      nextBtn.disabled = track.scrollLeft >= max;
    }
    function scrollCards(dir) {
      if (!track) return;
      var behavior = reduce.matches ? 'auto' : 'smooth';
      track.scrollBy({ left: dir * cardStep(), behavior: behavior });
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { scrollCards(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scrollCards(1); });
    if (track) {
      track.addEventListener('scroll', updateCardsNav, { passive: true });
      window.addEventListener('resize', updateCardsNav, { passive: true });
      updateCardsNav();
      if ('ResizeObserver' in window) new ResizeObserver(updateCardsNav).observe(track);
    }
  }

  /* ---- Hero video (inactive until data-video-src is set) ---- */
  var media = document.querySelector('[data-hero-media]');
  if (!media) return;
  var video = media.querySelector('video');
  var toggle = media.querySelector('.hero__toggle');
  var narrow = window.matchMedia('(max-width: 47.99em)');
  var src = (narrow.matches && media.getAttribute('data-video-src-mobile')) || media.getAttribute('data-video-src');
  var conn = navigator.connection || {};
  if (!video || !toggle || !src || reduce.matches || conn.saveData || /2g/.test(conn.effectiveType || '')) return;

  var userPaused = false;
  try { userPaused = sessionStorage.getItem('igo-hero-paused') === '1'; } catch (e) {}
  var VIDEO_TXT = { es: ['Pausar vídeo', 'Reproducir vídeo'], fr: ['Mettre la vidéo en pause', 'Lire la vidéo'], en: ['Pause video', 'Play video'] };
  var videoTxt = VIDEO_TXT[(document.documentElement.lang || 'en').slice(0, 2).toLowerCase()] || VIDEO_TXT.en;
  function setState(playing) {
    toggle.textContent = playing ? videoTxt[0] : videoTxt[1];
  }
  function play() {
    var pr = video.play();
    if (pr && pr.then) pr.then(function () { video.hidden = false; setState(true); }, function () { video.hidden = true; setState(false); });
  }
  video.src = src;
  video.preload = 'metadata';
  toggle.hidden = false;
  setState(false);
  video.addEventListener('canplay', function () { if (!userPaused && !document.hidden) play(); }, { once: true });
  toggle.addEventListener('click', function () {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); setState(false); }
    try { sessionStorage.setItem('igo-hero-paused', userPaused ? '1' : '0'); } catch (e) {}
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) { if (!video.paused) { video.pause(); setState(false); } }
      else if (!userPaused && video.paused && video.readyState > 2) play();
    }).observe(media);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { video.pause(); setState(false); } else if (!userPaused) play();
  });
  var onReduceVideo = function () { if (reduce.matches) { video.pause(); video.hidden = true; setState(false); } };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduceVideo);
})();

/* ---- Ecosystem video cards: muted loops that play on their own while visible (no controls).
   Paused off screen and in background tabs; with reduced motion only the poster is shown. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('[data-card-video]'));
  if (!vids.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visible = new Set();
  function play(v) {
    if (reduce.matches || document.hidden) return;
    if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  vids.forEach(function (v) { v.muted = true; v.defaultMuted = true; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { visible.add(e.target); play(e.target); }
        else { visible.delete(e.target); e.target.pause(); }
      });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { io.observe(v); });
  } else { vids.forEach(play); }
  document.addEventListener('visibilitychange', function () {
    vids.forEach(function (v) { if (document.hidden) v.pause(); else if (visible.has(v)) play(v); });
  });
  var onReduce = function () { if (reduce.matches) vids.forEach(function (v) { v.pause(); }); else visible.forEach(play); };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce);
})();
