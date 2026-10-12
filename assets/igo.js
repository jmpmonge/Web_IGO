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
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
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
  function setState(playing) {
    toggle.textContent = playing ? 'Pause video' : 'Play video';
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
