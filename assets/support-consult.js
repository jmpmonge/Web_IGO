'use strict';
/* IGO Support conversation. Posts a question, then reads only published answers.
   The continuation token lives only in this browser's localStorage under one key.
   It is never put in the address, never sent by email, never written into the page,
   and never used as a list of other people's conversations.
   The question text is stored in that same key so this device can show its own history.
   Anyone who can use this browser can read that key. Clearing site data removes it;
   there is no way to recover the thread. A published answer is not shown as instant. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') api.montar(document);
  root.IgoSupportConsult = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var PRODUCTO = 'wellness-ring';
  var IDIOMAS = { es: true, en: true, fr: true };
  var CLAVE = 'igo-support-web-v1';
  var CLAVE_RECUPERACION = 'igo-support-recuperacion-v1';
  var RECEPTOR_LOCAL = 'http://127.0.0.1:8788/v1/consultas';
  var CREDENCIAL = /^[A-Za-z0-9_-]{43,128}$/;
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

  function endpointDe(atributo, loc) {
    var explicito = String(atributo || '').trim();
    if (explicito) return explicito;
    var host = loc && loc.hostname;
    if (host === '127.0.0.1' || host === 'localhost') return RECEPTOR_LOCAL;
    return '';
  }

  function credencialNueva() {
    var bytes = new Uint8Array(32);
    if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function leerRecuperacion(storage) {
    try {
      var data = JSON.parse(storage.getItem(CLAVE_RECUPERACION) || 'null');
      if (!data || data.v !== 1 || typeof data.credencial !== 'string' || !CREDENCIAL.test(data.credencial)) return null;
      var primera = null;
      if (data.primera && typeof data.primera.id === 'string' && typeof data.primera.texto === 'string' && IDIOMAS[data.primera.idioma]) {
        var texto = data.primera.texto.trim();
        if (texto && texto.length <= 4000) primera = { id: data.primera.id, texto: texto, idioma: data.primera.idioma };
      }
      return { credencial: data.credencial, primera: primera };
    } catch (e) { return null; }
  }

  function guardarRecuperacion(storage, datos) {
    var credencial = datos && datos.credencial;
    if (!CREDENCIAL.test(credencial)) return null;
    var primera = null;
    if (datos.primera && typeof datos.primera.id === 'string' && typeof datos.primera.texto === 'string' && IDIOMAS[datos.primera.idioma]) {
      var texto = datos.primera.texto.trim();
      if (texto && texto.length <= 4000) primera = { id: datos.primera.id, texto: texto, idioma: datos.primera.idioma };
    }
    storage.setItem(CLAVE_RECUPERACION, JSON.stringify({ v: 1, credencial: credencial, primera: primera }));
    return leerRecuperacion(storage);
  }

  function asegurarRecuperacion(storage) {
    var actual = leerRecuperacion(storage);
    if (actual) return actual;
    return guardarRecuperacion(storage, { credencial: credencialNueva(), primera: null });
  }

  function destinoValido(url) {
    var u;
    try { u = new URL(url); } catch (e) { return false; }
    if (u.username || u.password || u.search || u.hash) return false;
    if (u.port === '8787' || u.pathname.indexOf('/api/') !== -1) return false;
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  }

  function preguntasDe(lista) {
    if (!Array.isArray(lista)) return [];
    var salida = [];
    for (var i = 0; i < lista.length && salida.length < 40; i += 1) {
      var p = lista[i];
      if (!p || typeof p.id !== 'string' || typeof p.texto !== 'string') continue;
      var texto = p.texto.trim();
      if (!texto || texto.length > 4000) continue;
      if (salida.some(function (x) { return x.id === p.id; })) continue;
      salida.push({ id: p.id, texto: texto });
    }
    return salida;
  }

  function leerSesion(storage) {
    try {
      var data = JSON.parse(storage.getItem(CLAVE) || 'null');
      if (!data || data.v !== 1 || data.producto_id !== PRODUCTO || !IDIOMAS[data.idioma]) return null;
      if (typeof data.conversacion_id !== 'string' || typeof data.token !== 'string' || !data.token) return null;
      return {
        conversacion_id: data.conversacion_id,
        token: data.token,
        idioma: data.idioma,
        producto_id: PRODUCTO,
        preguntas: preguntasDe(data.preguntas)
      };
    } catch (e) { return null; }
  }

  function guardarSesion(storage, sesion) {
    var previa = leerSesion(storage);
    storage.setItem(CLAVE, JSON.stringify({
      v: 1,
      producto_id: PRODUCTO,
      idioma: sesion.idioma,
      conversacion_id: sesion.conversacion_id,
      token: sesion.token,
      preguntas: preguntasDe(sesion.preguntas || (previa && previa.preguntas))
    }));
  }

  function anotarPregunta(storage, item) {
    var sesion = leerSesion(storage);
    if (!sesion || !item) return null;
    var preguntas = sesion.preguntas.slice();
    if (!preguntas.some(function (p) { return p.id === item.id; })) {
      preguntas.push({ id: item.id, texto: item.texto });
    }
    guardarSesion(storage, {
      idioma: sesion.idioma,
      conversacion_id: sesion.conversacion_id,
      token: sesion.token,
      preguntas: preguntas
    });
    return leerSesion(storage);
  }

  function olvidarSesion(storage) {
    storage.removeItem(CLAVE);
    storage.removeItem(CLAVE_RECUPERACION);
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
    if (typeof entrada.recuperacion === 'string' && CREDENCIAL.test(entrada.recuperacion)) cuerpo.recuperacion = entrada.recuperacion;
    return cuerpo;
  }

  function rutaLectura(url) {
    var u = new URL(url);
    if (!/\/v1\/consultas\/?$/.test(u.pathname)) throw fallo('DESTINO');
    u.pathname = u.pathname.replace(/\/v1\/consultas\/?$/, '/v1/respuestas/consultar');
    u.search = '';
    u.hash = '';
    return u.toString();
  }

  function normalizarRespuesta(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (typeof item.id !== 'string' || typeof item.texto !== 'string' || !item.texto) return null;
    if (typeof item.publicada !== 'string' || typeof item.consulta_id !== 'string') return null;
    return { id: item.id, texto: item.texto, publicada: item.publicada, consulta_id: item.consulta_id };
  }

  function consultar(entrada) {
    if (!destinoValido(entrada.url)) return Promise.reject(fallo('DESTINO'));
    if (!entrada.sesion || typeof entrada.sesion.token !== 'string' || !entrada.sesion.token || typeof entrada.sesion.conversacion_id !== 'string') {
      return Promise.reject(fallo('NO_AUTORIZADA'));
    }
    var fetchImpl = entrada.fetch || globalThis.fetch;
    var acumulado = [];
    var cursor = '';
    var paginas = 0;
    function paso() {
      if (paginas >= 5) return Promise.resolve(acumulado);
      paginas += 1;
      var cuerpo = { conversacion_id: entrada.sesion.conversacion_id, token: entrada.sesion.token, trampa: '' };
      if (cursor) cuerpo.cursor = cursor;
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, entrada.esperaMs || ESPERA_MS);
      var direccion;
      try { direccion = rutaLectura(entrada.url); }
      catch (err) { clearTimeout(timer); return Promise.reject(err); }
      return fetchImpl(direccion, {
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
          if (!json || typeof json !== 'object' || Array.isArray(json) || !Array.isArray(json.respuestas)) throw fallo('RESPUESTA_INVALIDA');
          json.respuestas.forEach(function (item) {
            var limpio = normalizarRespuesta(item);
            if (limpio && !acumulado.some(function (x) { return x.id === limpio.id; })) acumulado.push(limpio);
          });
          if (typeof json.siguiente === 'string' && json.siguiente && json.siguiente !== cursor) {
            cursor = json.siguiente;
            return paso();
          }
          return acumulado;
        });
      }).catch(function (err) {
        if (err && err.codigo) throw err;
        throw fallo(err && err.name === 'AbortError' ? 'TIEMPO' : 'CONEXION');
      }).finally(function () { clearTimeout(timer); });
    }
    return paso();
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
      sesion: entrada.sesion || null,
      recuperacion: entrada.recuperacion
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
          throw fallo(res.status === 429 ? 'LIMITE' : res.status === 403 ? 'NO_AUTORIZADA' : res.status === 413 ? 'GRANDE' : res.status === 409 ? 'CONFLICTO' : 'RECHAZADA');
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
    var thread = doc.querySelector('[data-support-thread]');
    var turns = doc.querySelector('[data-support-turns]');
    var threadStatus = doc.querySelector('[data-support-thread-status]');
    var storage = doc.defaultView && doc.defaultView.localStorage;
    var identidad = crearIdentidad();
    var candado = crearCandado();

    function msg(key) { return form.getAttribute('data-msg-' + key) || ''; }
    function say(key, kind) {
      if (!status) return;
      status.textContent = key ? msg(key) : '';
      if (kind) status.setAttribute('data-kind', kind); else status.removeAttribute('data-kind');
    }
    function sayThread(key, kind) {
      if (!threadStatus) return;
      threadStatus.textContent = key ? msg(key) : '';
      if (kind) threadStatus.setAttribute('data-kind', kind); else threadStatus.removeAttribute('data-kind');
    }
    function parrafo(clase, texto) {
      var p = doc.createElement('p');
      if (clase) p.className = clase;
      p.textContent = texto;
      return p;
    }
    function pintarHilo(respuestas) {
      if (!thread || !turns) return;
      var guardada = sesion();
      var preguntas = guardada ? guardada.preguntas : [];
      var publicadas = Array.isArray(respuestas) ? respuestas : [];
      thread.hidden = preguntas.length === 0 && publicadas.length === 0;
      while (turns.firstChild) turns.removeChild(turns.firstChild);
      var vistas = {};
      function turno(pregunta, respuesta) {
        var li = doc.createElement('li');
        li.className = 'support__turn';
        if (pregunta) {
          li.appendChild(parrafo('support__who', msg('you')));
          li.appendChild(parrafo('support__question', pregunta));
        }
        if (respuesta) {
          li.appendChild(parrafo('support__who', msg('answer')));
          li.appendChild(parrafo('support__answer', respuesta));
          vistas[respuesta] = true;
        } else {
          li.appendChild(parrafo('support__pending', msg('pending')));
        }
        turns.appendChild(li);
      }
      preguntas.forEach(function (p) {
        var publicada = null;
        for (var i = 0; i < publicadas.length; i += 1) {
          if (publicadas[i].consulta_id === p.id) { publicada = publicadas[i]; break; }
        }
        if (publicada) vistas[publicada.id] = true;
        turno(p.texto, publicada ? publicada.texto : '');
      });
      publicadas.forEach(function (r) {
        if (vistas[r.id]) return;
        turno('', r.texto);
        vistas[r.id] = true;
      });
    }
    function urlActiva() {
      var loc = doc.defaultView && doc.defaultView.location;
      return endpointDe(form.getAttribute('data-endpoint') || '', loc);
    }
    function refrescar() {
      var guardada = sesion();
      var url = urlActiva();
      if (!guardada || !destinoValido(url)) {
        pintarHilo([]);
        return Promise.resolve([]);
      }
      if (thread) thread.setAttribute('aria-busy', 'true');
      sayThread('checking');
      return consultar({ url: url, sesion: guardada }).then(function (respuestas) {
        pintarHilo(respuestas);
        sayThread('');
        return respuestas;
      }).catch(function (err) {
        sayThread(claveEstado(err && err.codigo), 'error');
        return [];
      }).finally(function () {
        if (thread) thread.removeAttribute('aria-busy');
      });
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
    pintarHilo([]);
    if (sesion()) refrescar();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!candado.tomar()) return;
      say('sending');
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      var guardada = sesion();
      var pregunta = texto();
      var idioma = idiomaElegido();
      var rec = storage ? asegurarRecuperacion(storage) : null;
      var idExterno = identidad.para(pregunta);
      var limpia = String(pregunta || '').trim();
      if (!guardada && rec && rec.primera && rec.primera.texto === limpia && rec.primera.idioma === idioma) idExterno = rec.primera.id;
      if (!guardada && rec && limpia && IDIOMAS[idioma]) {
        guardarRecuperacion(storage, { credencial: rec.credencial, primera: { id: idExterno, texto: limpia, idioma: idioma } });
      }
      enviar({
        url: urlActiva(),
        consulta: pregunta,
        idioma: idioma,
        producto: productoElegido(),
        trampa: trampa(),
        idExterno: idExterno,
        recuperacion: rec ? rec.credencial : '',
        sesion: guardada,
        storage: storage
      }).then(function () {
        if (storage) anotarPregunta(storage, { id: idExterno, texto: pregunta });
        identidad.cerrar();
        var campo = form.querySelector('[name="consulta"]');
        if (campo) campo.value = '';
        say('received');
        pintarContinuacion();
        return refrescar();
      }).catch(function (err) {
        if (err && err.codigo === 'CONFLICTO' && storage) {
          var previa = leerRecuperacion(storage);
          if (previa) guardarRecuperacion(storage, { credencial: previa.credencial, primera: null });
        }
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
      sayThread('');
      pintarHilo([]);
      mostrarFormulario();
    }
    var refresh = doc.querySelector('[data-support-refresh]');
    if (refresh) refresh.addEventListener('click', function () { refrescar(); });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-support-fresh]'), function (el) {
      el.addEventListener('click', nueva);
    });
    var another = doc.querySelector('[data-support-another]');
    if (another) another.addEventListener('click', function () { mostrarFormulario(); });
  }

  return {
    PRODUCTO: PRODUCTO,
    destinoValido: destinoValido,
    endpointDe: endpointDe,
    credencialNueva: credencialNueva,
    leerRecuperacion: leerRecuperacion,
    asegurarRecuperacion: asegurarRecuperacion,
    leerSesion: leerSesion,
    guardarSesion: guardarSesion,
    olvidarSesion: olvidarSesion,
    crearIdentidad: crearIdentidad,
    crearCandado: crearCandado,
    preparar: preparar,
    enviar: enviar,
    rutaLectura: rutaLectura,
    consultar: consultar,
    anotarPregunta: anotarPregunta,
    montar: montar
  };
});
