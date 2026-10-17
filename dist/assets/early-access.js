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
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var opened = Date.now();
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
          showDone(email);
        })
        .catch(function () { say(msg('error'), 'error'); })
        .then(function () { busy(false); opened = Date.now(); });
    }, wait);
  });
})();
