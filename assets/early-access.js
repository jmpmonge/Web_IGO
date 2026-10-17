'use strict';
/* IGO early access form: posts to the form-handling endpoint (form[data-endpoint]) with fetch.
   Anti-spam: honeypot field (_gotcha) and a minimum fill time (the send waits, a real person is never rejected).
   Without JavaScript the form posts to the same endpoint through its action attribute. */
(function () {
  var form = document.querySelector('[data-ea-form]');
  if (!form) return;
  var status = form.querySelector('[data-ea-status]');
  var button = form.querySelector('button[type="submit"]');
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var opened = Date.now();
  var MIN_FILL_MS = 2500;
  var sending = false;

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

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false');
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
    var trap = form.elements['_gotcha'];
    if (trap && trap.value) { say(msg('success'), 'success'); form.reset(); return; }   /* bot: pretend, send nothing */
    if (!/^https:\/\//.test(endpoint)) { say(msg('unavailable'), 'error'); return; }

    busy(true);
    say(msg('sending'));
    var wait = Math.max(0, MIN_FILL_MS - (Date.now() - opened));
    setTimeout(function () {
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          form.reset();
          Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
          say(msg('success'), 'success');
        })
        .catch(function () { say(msg('error'), 'error'); })
        .then(function () { busy(false); opened = Date.now(); });
    }, wait);
  });
})();
