'use strict';
/* IGO Support question form. Posts JSON to a configurable receptor URL.
   The continuation token lives only in this browser's localStorage under one key.
   It is never put in the address, never sent by email, and never used as a list of other people's conversations.
   Clearing site data removes it; there is no way to recover the thread.
   The conversation id is stored with the token and is not sent on its own. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') api.montar(document);
  root.IgoSupportConsult = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var PRODUCTO = 'wellness-ring';
  var IDIOMAS = { es: true, en: true, fr: true };
  var CLAVE = 'igo-support-web-v1';
  var ESPERA_MS = 12000;

  function uuid() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function fallo(codigo) {
    var err = new Error(codigo);
    err.codigo = codigo;
    return err;
  }

  function destinoValido(url) {
    var u;
    try { u = new URL(url); } catch (e) { return false; }
    if (u.username || u.password || u.search || u.hash) return false;
    if (u.port === '8787' || u.pathname.indexOf('/api/') !== -1) return false;
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  }

  function leerSesion(storage) {
    try {
      var data = JSON.parse(storage.getItem(CLAVE) || 'null');
      if (!data || data.v !== 1 || data.producto_id !== PRODUCTO || !IDIOMAS[data.idioma]) return null;
      if (typeof data.conversacion_id !== 'string' || typeof data.token !== 'string' || !data.token) return null;
      return { conversacion_id: data.conversacion_id, token: data.token, idioma: data.idioma, producto_id: PRODUCTO };
    } catch (e) { return null; }
  }

  function guardarSesion(storage, sesion) {
    storage.setItem(CLAVE, JSON.stringify({
      v: 1,
      producto_id: PRODUCTO,
      idioma: sesion.idioma,
      conversacion_id: sesion.conversacion_id,
      token: sesion.token
    }));
  }

  function olvidarSesion(storage) {
    storage.removeItem(CLAVE);
  }

  function crearIdentidad() {
    var actual = '';
    var texto = '';
    return {
      para: function (consulta) {
        var limpio = String(consulta || '').trim();
        if (!actual || texto !== limpio) {
          actual = uuid();
          texto = limpio;
        }
        return actual;
      },
      cerrar: function () { actual = ''; texto = ''; }
    };
  }

  function crearCandado() {
    var ocupado = false;
    return {
      tomar: function () {
        if (ocupado) return false;
        ocupado = true;
        return true;
      },
      soltar: function () { ocupado = false; }
    };
  }

  function cuerpoDe(entrada) {
    var cuerpo = {
      consulta: String(entrada.consulta || '').trim(),
      producto_id: PRODUCTO,
      idioma: entrada.idioma,
      id_externo: entrada.idExterno,
      trampa: ''
    };
    if (entrada.sesion) {
      cuerpo.conversacion_id = entrada.sesion.conversacion_id;
      cuerpo.token = entrada.sesion.token;
    }
    return cuerpo;
  }

  function recibo(json) {
    if (!json || typeof json !== 'object' || Array.isArray(json) || json.recibida !== true || typeof json.conversacion_id !== 'string') {
      throw fallo('RESPUESTA_INVALIDA');
    }
    var out = { recibida: true, conversacion_id: json.conversacion_id, duplicada: json.duplicada === true };
    if (typeof json.token === 'string' && json.token) out.token = json.token;
    return out;
  }

  function preparar(entrada) {
    var consulta = String(entrada.consulta || '').trim();
    if (entrada.trampa) throw fallo('RECHAZADA');
    if (!consulta) throw fallo('VACIA');
    if (entrada.producto && entrada.producto !== PRODUCTO) throw fallo('PRODUCTO');
    if (!IDIOMAS[entrada.idioma]) throw fallo('IDIOMA');
    if (!destinoValido(entrada.url)) throw fallo('DESTINO');
    if (entrada.sesion && entrada.sesion.idioma !== entrada.idioma) throw fallo('IDIOMA_DISTINTO');
    return cuerpoDe({
      consulta: consulta,
      idioma: entrada.idioma,
      idExterno: entrada.idExterno,
      sesion: entrada.sesion || null
    });
  }

  function enviar(entrada) {
    var cuerpo;
    try { cuerpo = preparar(entrada); }
    catch (err) { return Promise.reject(err); }
    var fetchImpl = entrada.fetch || globalThis.fetch;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, entrada.esperaMs || ESPERA_MS);
    return fetchImpl(entrada.url, {
      method: 'POST',
      redirect: 'error',
      credentials: 'omit',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: ctrl.signal
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        if (!res.ok) {
          throw fallo(res.status === 429 ? 'LIMITE' : res.status === 403 ? 'NO_AUTORIZADA' : res.status === 413 ? 'GRANDE' : 'RECHAZADA');
        }
        var hecho = recibo(json);
        if (entrada.storage) {
          var token = hecho.token || (entrada.sesion && entrada.sesion.token);
          if (token) guardarSesion(entrada.storage, { idioma: entrada.idioma, conversacion_id: hecho.conversacion_id, token: token });
        }
        return hecho;
      });
    }).catch(function (err) {
      if (err && err.codigo) throw err;
      throw fallo(err && err.name === 'AbortError' ? 'TIEMPO' : 'CONEXION');
    }).finally(function () { clearTimeout(timer); });
  }

  function montar(doc) {
    var form = doc.querySelector('[data-support-form]');
    if (!form) return;
    var status = form.querySelector('[data-support-status]');
    var button = form.querySelector('[data-support-submit]');
    var done = doc.querySelector('[data-support-done]');
    var continuing = doc.querySelector('[data-support-continuing]');
    var storage = doc.defaultView && doc.defaultView.localStorage;
    var identidad = crearIdentidad();
    var candado = crearCandado();

    function msg(key) { return form.getAttribute('data-msg-' + key) || ''; }
    function say(key, kind) {
      if (!status) return;
      status.textContent = key ? msg(key) : '';
      if (kind) status.setAttribute('data-kind', kind); else status.removeAttribute('data-kind');
    }
    function sesion() { return storage ? leerSesion(storage) : null; }
    function aplicarIdioma() {
      var campo = form.querySelector('[name="idioma"]');
      if (!campo) return;
      var guardada = sesion();
      campo.value = guardada ? guardada.idioma : (form.getAttribute('data-lang') || 'en');
    }
    function pintarContinuacion() {
      var hay = !!sesion();
      if (continuing) continuing.hidden = !hay;
      var enFormulario = form.querySelector('[data-support-fresh]');
      if (enFormulario) enFormulario.hidden = !hay;
    }
    function idiomaElegido() {
      var campo = form.querySelector('[name="idioma"]');
      return campo ? campo.value : form.getAttribute('data-lang');
    }
    function productoElegido() {
      var campo = form.querySelector('[name="producto_id"]');
      return campo ? campo.value : PRODUCTO;
    }
    function texto() {
      var campo = form.querySelector('[name="consulta"]');
      return campo ? campo.value : '';
    }
    function trampa() {
      var campo = form.querySelector('[name="trampa"]');
      return campo ? campo.value : '';
    }
    function mostrarHecho() {
      form.hidden = true;
      if (done) {
        done.hidden = false;
        if (done.focus) done.focus({ preventScroll: true });
      }
    }
    function mostrarFormulario() {
      if (done) done.hidden = true;
      form.hidden = false;
      say('');
      pintarContinuacion();
    }
    function claveEstado(codigo) {
      if (codigo === 'VACIA' || codigo === 'PRODUCTO' || codigo === 'IDIOMA') return 'invalid';
      if (codigo === 'DESTINO') return 'unavailable';
      if (codigo === 'LIMITE') return 'limited';
      if (codigo === 'NO_AUTORIZADA' || codigo === 'IDIOMA_DISTINTO') return 'unauthorized';
      if (codigo === 'CONEXION' || codigo === 'TIEMPO') return 'error';
      return 'rejected';
    }

    aplicarIdioma();
    pintarContinuacion();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!candado.tomar()) return;
      say('sending');
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      var guardada = sesion();
      enviar({
        url: (form.getAttribute('data-endpoint') || '').trim(),
        consulta: texto(),
        idioma: idiomaElegido(),
        producto: productoElegido(),
        trampa: trampa(),
        idExterno: identidad.para(texto()),
        sesion: guardada,
        storage: storage
      }).then(function () {
        identidad.cerrar();
        var campo = form.querySelector('[name="consulta"]');
        if (campo) campo.value = '';
        say('');
        mostrarHecho();
      }).catch(function (err) {
        say(claveEstado(err && err.codigo), 'error');
      }).finally(function () {
        candado.soltar();
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      });
    });

    function nueva() {
      if (storage) olvidarSesion(storage);
      identidad.cerrar();
      aplicarIdioma();
      mostrarFormulario();
    }
    Array.prototype.forEach.call(doc.querySelectorAll('[data-support-fresh]'), function (el) {
      el.addEventListener('click', nueva);
    });
    var another = doc.querySelector('[data-support-another]');
    if (another) another.addEventListener('click', function () { mostrarFormulario(); });
  }

  return {
    PRODUCTO: PRODUCTO,
    destinoValido: destinoValido,
    leerSesion: leerSesion,
    guardarSesion: guardarSesion,
    olvidarSesion: olvidarSesion,
    crearIdentidad: crearIdentidad,
    crearCandado: crearCandado,
    preparar: preparar,
    enviar: enviar,
    montar: montar
  };
});
