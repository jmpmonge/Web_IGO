'use strict';
/* IGO early access form: posts to the form-handling endpoint (form[data-endpoint]) with fetch.
   On success the form is replaced by a confirmation panel that stays until the page is reloaded or the visitor asks to send another request.
   Anti-spam: honeypot field (_gotcha) and a minimum fill time (the send waits, a real person is never rejected).
   Without JavaScript the form posts to the same endpoint through its action attribute. */
(function () {
  var form = document.querySelector('[data-ea-form]');
  if (!form) return;
  var status = form.querySelector('[data-ea-status]');
  var button = form.querySelector('button[type="submit"]');
  var done = document.querySelector('[data-ea-done]');
  var doneEmail = done && done.querySelector('[data-ea-email]');
  var again = done && done.querySelector('[data-ea-again]');
  var known = document.querySelector('[data-ea-known]');
  var knownEmail = known && known.querySelector('[data-ea-known-email]');
  var other = known && known.querySelector('[data-ea-other]');
  var phaseEl = document.querySelector('[data-ea-phase]');
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var opened = Date.now();
  var CLAVE_REG = 'igo-registros-v1';
  var CLAVE_VISITA = 'igo-visitante-correo';
  var MIN_FILL_MS = 2500;
  var sending = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function msg(key) { return form.getAttribute('data-msg-' + key) || ''; }
  function say(text, kind) {
    status.textContent = text;
    if (kind) status.setAttribute('data-kind', kind); else status.removeAttribute('data-kind');
  }
  function mark() {
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      if (el.type === 'hidden' || el.name === '_gotcha') return;
      el.setAttribute('aria-invalid', el.checkValidity() ? 'false' : 'true');
    });
  }
  function busy(on) {
    sending = on;
    button.disabled = on;
    button.setAttribute('aria-busy', String(on));
  }
  function correoDe(valor) { return String(valor || '').trim().toLowerCase(); }
  function leerRegistros() {
    try {
      var lista = JSON.parse(localStorage.getItem(CLAVE_REG) || '[]');
      return Array.isArray(lista) ? lista : [];
    } catch (err) { return []; }
  }
  function yaExiste(email) {
    var clave = correoDe(email);
    return leerRegistros().some(function (r) { return correoDe(r.email) === clave; });
  }
  function faseActual() {
    try {
      var panel = JSON.parse(localStorage.getItem('igo-operaciones-v1') || 'null');
      return panel && panel.faseComercial ? String(panel.faseComercial) : '';
    } catch (err) { return ''; }
  }
  function mostrarFase() {
    if (!phaseEl) return;
    var fase = faseActual();
    if (!fase) { phaseEl.hidden = true; return; }
    phaseEl.hidden = false;
    phaseEl.textContent = (form.getAttribute('data-msg-phase') || 'Fase') + ': ' + fase;
  }
  function showKnown(email) {
    say('');
    form.hidden = true;
    if (done) done.hidden = true;
    if (!known) return;
    if (knownEmail) knownEmail.textContent = email;
    known.hidden = false;
    known.focus({ preventScroll: true });
  }
  function guardarRegistro(ficha) {
    if (yaExiste(ficha.email)) return;
    var lista = leerRegistros();
    lista.push(ficha);
    localStorage.setItem(CLAVE_REG, JSON.stringify(lista));
    localStorage.setItem(CLAVE_VISITA, ficha.email);
  }
  function showDone(email) {
    say('');
    if (!done) return;
    if (doneEmail) doneEmail.textContent = email;     /* textContent: never parsed as HTML */
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    done.focus({ preventScroll: true });
  }

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false');
  });

  mostrarFase();
  var visita = '';
  try { visita = localStorage.getItem(CLAVE_VISITA) || ''; } catch (err) { visita = ''; }
  if (visita && yaExiste(visita)) showKnown(visita);

  if (other) other.addEventListener('click', function () {
    try { localStorage.removeItem(CLAVE_VISITA); } catch (err) {}
    if (known) known.hidden = true;
    form.hidden = false;
    opened = Date.now();
    var first = form.elements['name'];
    if (first) first.focus();
  });

  if (again) again.addEventListener('click', function () {
    done.hidden = true;
    form.hidden = false;
    opened = Date.now();
    var first = form.elements['name'];
    if (first) first.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    mark();
    if (!form.checkValidity()) {
      say(msg('invalid'), 'error');
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    var email = (form.elements['email'].value || '').trim();
    var trap = form.elements['_gotcha'];
    if (trap && trap.value) { form.reset(); showDone(email); return; }   /* bot: pretend, send nothing */
    if (yaExiste(email)) {
      try { localStorage.setItem(CLAVE_VISITA, email); } catch (err) {}
      showKnown(email);
      return;
    }
    if (!/^https:\/\//.test(endpoint)) { say(msg('unavailable'), 'error'); return; }
    var ficha = {
      email: email,
      nombre: (form.elements['name'].value || '').trim(),
      interes: form.elements['interest'] ? form.elements['interest'].value : '',
      consentimiento: true,
      origen: 'web',
      campana: '',
      fase: faseActual(),
      en: new Date().toISOString()
    };

    busy(true);
    say(msg('sending'));
    var wait = Math.max(0, MIN_FILL_MS - (Date.now() - opened));
    setTimeout(function () {
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          form.reset();
          Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
          guardarRegistro(ficha);
          showDone(email);
        })
        .catch(function () { say(msg('error'), 'error'); })
        .then(function () { busy(false); opened = Date.now(); });
    }, wait);
  });
})();
