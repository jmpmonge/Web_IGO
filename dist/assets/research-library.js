(function () {
  var root = document.querySelector('[data-research-library]');
  if (!root) return;
  var form = root.querySelector('form');
  var query = document.getElementById('research-q');
  var area = document.getElementById('research-area');
  var empty = document.getElementById('research-empty');
  var count = document.getElementById('research-count');
  var cards = Array.prototype.slice.call(root.querySelectorAll('.research-card'));
  var zero = root.getAttribute('data-zero');
  var one = root.getAttribute('data-one');
  var many = root.getAttribute('data-many');

  function fold(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function label(n) {
    if (n === 0) return zero;
    if (n === 1) return one;
    return many.replace('{count}', String(n));
  }
  function apply() {
    var words = fold(query.value).trim();
    var selected = area.value;
    var n = 0;
    cards.forEach(function (card) {
      var matches = (!selected || card.getAttribute('data-area') === selected)
        && (!words || card.getAttribute('data-search').indexOf(words) !== -1);
      card.hidden = !matches;
      if (matches) n += 1;
    });
    empty.hidden = n !== 0;
    count.textContent = label(n);
  }

  form.addEventListener('submit', function (event) { event.preventDefault(); apply(); });
  query.addEventListener('input', apply);
  area.addEventListener('change', apply);
  form.addEventListener('reset', function () { setTimeout(apply, 0); });
})();
