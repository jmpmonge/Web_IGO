'use strict';
/* IGO language selector: remembers a manual choice and closes the desktop menu. Pages work without it (the selector is plain links). */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lang-switch]');
    if (!a) return;
    try { localStorage.setItem('igo-lang', a.getAttribute('data-lang-switch')); } catch (err) {}
    if (location.hash && a.getAttribute('href').indexOf('#') < 0) a.setAttribute('href', a.getAttribute('href') + location.hash);
  });
  var menu = document.querySelector('[data-lang-menu]');
  if (!menu) return;
  document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) { menu.open = false; var s = menu.querySelector('summary'); if (s) s.focus(); }
  });
})();
