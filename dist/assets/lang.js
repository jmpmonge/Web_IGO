'use strict';
/* IGO language selector: remembers a manual choice and closes the desktop menu. Pages work without it (the selector is plain links). */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lang-switch]');
    if (!a) return;
    try { localStorage.setItem('igo-lang', a.getAttribute('data-lang-switch')); } catch (err) {}
    var href = a.getAttribute('href');
    if (href.indexOf('#') > -1) return;
    var anchor = location.hash || currentSection();
    if (anchor) a.setAttribute('href', href + anchor);
  });
  /* Without a hash, keep the reader's place: the section (id) that is at the top of the viewport. Sections share ids in every language. */
  function currentSection() {
    if (window.scrollY < 80) return '';
    var found = '', list = document.querySelectorAll('main [id]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.tagName !== 'SECTION' && el.tagName !== 'ARTICLE') continue;
      if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) found = el.id; else break;
    }
    return found ? '#' + found : '';
  }
  var menu = document.querySelector('[data-lang-menu]');
  if (!menu) return;
  document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) { menu.open = false; var s = menu.querySelector('summary'); if (s) s.focus(); }
  });
})();
