'use strict';
/* Shows a Buy on Amazon link only when the operaciones panel has stored an https URL for that line. */
(function () {
  var textos = { es: 'Comprar en Amazon', en: 'Buy on Amazon', fr: 'Acheter sur Amazon' };
  var lang = (document.documentElement.lang || 'es').slice(0, 2);
  var etiqueta = textos[lang] || textos.es;
  var panel;
  try { panel = JSON.parse(localStorage.getItem('igo-operaciones-v1') || 'null'); }
  catch (err) { return; }
  if (!panel || !Array.isArray(panel.productos)) return;

  function urlDe(linea) {
    var id = linea === 'vision' ? 'gafas' : 'anillo';
    var producto = panel.productos.filter(function (p) {
      return p.id === id || String(p.linea || '').toLowerCase() === linea;
    })[0];
    var url = producto && String(producto.amazon || '').trim();
    return /^https:\/\//.test(url) ? url : '';
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-amazon-linea]'), function (nodo) {
    var url = urlDe(nodo.getAttribute('data-amazon-linea'));
    if (!url) return;
    var enlace = document.createElement('a');
    enlace.className = 'cta';
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.textContent = etiqueta;
    nodo.hidden = false;
    nodo.appendChild(enlace);
  });
})();
