'use strict';
/* Switches the IGO Vision sheet between Sport Casual and Sport Mask. No cart. */
(function () {
  var root = document.querySelector('[data-sale]');
  if (!root) return;
  var top = root.querySelector('[data-sale-top]') || root;
  var photo = root.querySelector('[data-sale-photo]');
  var nameEl = root.querySelector('[data-sale-name]');
  var lineEl = root.querySelector('[data-sale-line]');
  var radios = root.querySelectorAll('input[name="sale-model"]');
  var cards = root.querySelectorAll('[data-sale-model]');

  function apply(input) {
    if (!input) return;
    var src = input.getAttribute('data-src');
    if (src && photo && photo.getAttribute('src') !== src) photo.setAttribute('src', src);
    var label = input.parentNode && input.parentNode.querySelector('span');
    if (nameEl && label) nameEl.textContent = label.textContent;
    var line = input.getAttribute('data-line');
    if (lineEl && line) lineEl.textContent = line;
    cards.forEach(function (card) {
      var on = card.getAttribute('data-sale-model') === input.value;
      card.classList.toggle('is-on', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  radios.forEach(function (input) {
    input.addEventListener('change', function () { apply(input); });
  });

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var input = root.querySelector('input[name="sale-model"][value="' + card.getAttribute('data-sale-model') + '"]');
      if (!input) return;
      input.checked = true;
      apply(input);
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
