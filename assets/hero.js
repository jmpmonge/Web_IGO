'use strict';
/* IGO Home · Hero interactions: translucent header after ~50px, and the film modal (source added later). */
(function () {
  var header = document.querySelector('.site-header');
  if (header) {
    var ticking = false;
    var update = function () { header.classList.toggle('is-scrolled', window.scrollY > 50); ticking = false; };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  var dialog = document.getElementById('film-modal');
  var openBtn = document.querySelector('[data-film-open]');
  if (!dialog || !openBtn) return;
  if (typeof dialog.showModal !== 'function') { openBtn.hidden = true; return; }

  var video = dialog.querySelector('video');
  var empty = dialog.querySelector('.film-modal__empty');
  var closeBtn = dialog.querySelector('[data-film-close]');
  var src = dialog.getAttribute('data-film-src') || '';   /* set this attribute when the film exists */

  function open() {
    if (src && video) {
      if (!video.getAttribute('src')) video.setAttribute('src', src);
      video.hidden = false; if (empty) empty.hidden = true;
    } else {
      if (video) video.hidden = true; if (empty) empty.hidden = false;
    }
    dialog.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
    if (closeBtn) closeBtn.focus();
  }
  function stop() {
    if (video && !video.hidden) { video.pause(); }
    openBtn.setAttribute('aria-expanded', 'false');
  }
  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', stop);              /* Escape and the close button both land here; focus returns to the trigger */
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });  /* backdrop click */
})();
