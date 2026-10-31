'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const api = require('../assets/support-consult.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memoria() {
  const m = new Map();
  return {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); }
  };
}

function escuchar(responder) {
  const srv = http.createServer(responder);
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}
function cerrar(srv) { return new Promise((resolve) => srv.close(resolve)); }
function leer(req) {
  return new Promise((resolve) => {
    const trozos = [];
    req.on('data', (c) => trozos.push(c));
    req.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')));
  });
}

test('el contrato solo envía la consulta, conserva el identificador y no enseña el borrador', async () => {
  const vistos = [];
  const srv = await escuchar(async (req, res) => {
    const texto = await leer(req);
    vistos.push({ method: req.method, url: req.url, headers: req.headers, texto });
    const n = vistos.length;
    if (n === 1) { res.writeHead(500, { 'content-type': 'application/json' }); res.end('{"codigo":"ERROR"}'); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      recibida: true,
      conversacion_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      duplicada: n > 2,
      token: n === 2 ? 'token-de-prueba' : undefined,
      respuesta_propuesta: 'BORRADOR-NO-VISIBLE',
      auditoria: { veredicto: 'ok' },
      estado: 'pending_review'
    }));
  });
  const url = 'http://127.0.0.1:' + srv.address().port + '/v1/consultas';
  const storage = memoria();
  const identidad = api.crearIdentidad();
  const consulta = '¿Cómo se carga el anillo?';
  try {
    const id = identidad.para(consulta);
    await assert.rejects(() => api.enviar({ url, consulta, idioma: 'es', producto: 'wellness-ring', idExterno: id, storage, fetch }), { codigo: 'RECHAZADA' });
    const primero = await api.enviar({ url, consulta, idioma: 'es', producto: 'wellness-ring', idExterno: identidad.para(consulta), storage, fetch });
    assert.strictEqual(primero.recibida, true);
    assert.strictEqual(primero.token, 'token-de-prueba');
    assert.strictEqual(primero.respuesta_propuesta, undefined);
    assert.strictEqual(primero.estado, undefined);
    assert.strictEqual(identidad.para(consulta), id);
    const sesion = api.leerSesion(storage);
    assert.strictEqual(sesion.token, 'token-de-prueba');
    assert.notStrictEqual(sesion.conversacion_id, sesion.token);
    const segundo = await api.enviar({
      url, consulta: '¿Y el estuche?', idioma: 'es', producto: 'wellness-ring',
      idExterno: identidad.para('¿Y el estuche?'), sesion, storage, fetch
    });
    assert.strictEqual(segundo.duplicada, true);
    assert.strictEqual(segundo.token, undefined);
    assert.strictEqual(api.leerSesion(storage).token, 'token-de-prueba');
    const cuerpos = vistos.map((v) => JSON.parse(v.texto));
    assert.strictEqual(cuerpos[0].id_externo, cuerpos[1].id_externo);
    assert.notStrictEqual(cuerpos[2].id_externo, cuerpos[0].id_externo);
    assert.strictEqual(cuerpos[2].conversacion_id, sesion.conversacion_id);
    assert.strictEqual(cuerpos[2].token, 'token-de-prueba');
    cuerpos.forEach((c) => {
      assert.deepStrictEqual(Object.keys(c).filter((k) => !['conversacion_id', 'token'].includes(k)).sort(), ['consulta', 'id_externo', 'idioma', 'producto_id', 'trampa']);
      assert.strictEqual(c.producto_id, 'wellness-ring');
      assert.ok(UUID.test(c.id_externo));
      assert.strictEqual(c.email, undefined);
    });
    vistos.forEach((v) => {
      assert.strictEqual(v.method, 'POST');
      assert.strictEqual(v.headers.authorization, undefined);
      assert.strictEqual(v.headers['x-igo-receptor'], undefined);
      assert.ok(!v.url.includes('token'));
    });
  } finally {
    await cerrar(srv);
  }
});

test('un doble envío, otro producto, el puerto del panel y una trampa no crean otra petición', async () => {
  let n = 0;
  const srv = await escuchar(async (req, res) => {
    n += 1;
    await leer(req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"recibida":true,"conversacion_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","duplicada":false,"token":"otro-token"}');
  });
  const url = 'http://127.0.0.1:' + srv.address().port + '/v1/consultas';
  const candado = api.crearCandado();
  try {
    assert.strictEqual(candado.tomar(), true);
    assert.strictEqual(candado.tomar(), false);
    candado.soltar();
    assert.strictEqual(api.destinoValido('http://127.0.0.1:8787/v1/consultas'), false);
    assert.strictEqual(api.destinoValido('http://127.0.0.1:8787/api/consultas'), false);
    assert.strictEqual(api.destinoValido('https://example.test/api/bandeja'), false);
    assert.strictEqual(api.destinoValido('http://example.test/v1/consultas'), false);
    assert.strictEqual(api.destinoValido(url), true);
    const base = { url, consulta: 'hola', idioma: 'es', idExterno: '11111111-1111-4111-8111-111111111111', fetch };
    await assert.rejects(() => api.enviar(Object.assign({}, base, { producto: 'otro-producto' })), { codigo: 'PRODUCTO' });
    await assert.rejects(() => api.enviar(Object.assign({}, base, { trampa: 'http://spam.example' })), { codigo: 'RECHAZADA' });
    await assert.rejects(() => api.enviar(Object.assign({}, base, { url: 'http://127.0.0.1:8787/v1/consultas' })), { codigo: 'DESTINO' });
    await assert.rejects(() => api.enviar(Object.assign({}, base, { sesion: { conversacion_id: 'x', token: 'y', idioma: 'en' } })), { codigo: 'IDIOMA_DISTINTO' });
    const storage = memoria();
    api.guardarSesion(storage, { idioma: 'es', conversacion_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', token: '' });
    assert.strictEqual(api.leerSesion(storage), null);
    assert.strictEqual(n, 0);
    const lento = escuchar(() => {});
    const colgado = await lento;
    await assert.rejects(() => api.enviar({
      url: 'http://127.0.0.1:' + colgado.address().port + '/v1/consultas',
      consulta: 'hola', idioma: 'es', idExterno: base.idExterno, esperaMs: 40, fetch
    }), { codigo: 'TIEMPO' });
    await cerrar(colgado);
  } finally {
    await cerrar(srv);
  }
});

test('la lectura pide solo el token, ignora borradores y no trata el vacío como un fallo', async () => {
  const vistos = [];
  const srv = await escuchar(async (req, res) => {
    const texto = await leer(req);
    vistos.push({ url: req.url, texto });
    const cuerpo = JSON.parse(texto);
    if (cuerpo.token === 'malo') {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end('{"codigo":"CONTINUACION_NO_AUTORIZADA"}');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    if (!cuerpo.cursor) {
      res.end(JSON.stringify({
        respuestas: [{
          id: '11111111-1111-4111-8111-111111111111',
          texto: 'Texto definitivo.',
          publicada: '2026-11-01T00:00:00.000Z',
          consulta_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          estado: 'approved',
          borrador: 'NO-MOSTRAR',
          auditoria: { veredicto: 'ok' },
          token: 'no-repetir'
        }],
        siguiente: '11111111-1111-4111-8111-111111111111'
      }));
      return;
    }
    res.end(JSON.stringify({
      respuestas: [{
        id: '22222222-2222-4222-8222-222222222222',
        texto: 'Segunda respuesta.',
        publicada: '2026-11-01T00:01:00.000Z',
        consulta_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      }],
      siguiente: null
    }));
  });
  const url = 'http://127.0.0.1:' + srv.address().port + '/v1/consultas';
  const storage = memoria();
  const sesion = {
    idioma: 'es',
    conversacion_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    token: 'token-de-prueba'
  };
  try {
    assert.strictEqual(api.rutaLectura(url), 'http://127.0.0.1:' + srv.address().port + '/v1/respuestas/consultar');
    api.guardarSesion(storage, sesion);
    const anotada = api.anotarPregunta(storage, { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', texto: '¿Cómo se carga el anillo?' });
    assert.strictEqual(anotada.token, 'token-de-prueba');
    assert.strictEqual(anotada.preguntas.length, 1);
    assert.ok(!JSON.stringify(anotada.preguntas).includes('token-de-prueba'));
    const vacio = await api.consultar({
      url, sesion, fetch, esperaMs: 1000
    });
    assert.strictEqual(vacio.length, 2);
    assert.deepStrictEqual(Object.keys(vacio[0]).sort(), ['consulta_id', 'id', 'publicada', 'texto']);
    assert.strictEqual(vacio[0].texto, 'Texto definitivo.');
    assert.strictEqual(vacio[1].texto, 'Segunda respuesta.');
    assert.ok(!JSON.stringify(vacio).includes('NO-MOSTRAR'));
    assert.ok(!JSON.stringify(vacio).includes('approved'));
    assert.ok(!JSON.stringify(vacio).includes('no-repetir'));
    vistos.forEach((v) => {
      assert.ok(v.url.startsWith('/v1/respuestas/consultar'));
      assert.ok(!v.url.includes('token'));
      const cuerpo = JSON.parse(v.texto);
      assert.ok(!cuerpo.estado);
      assert.ok(!cuerpo.borrador);
    });
    const otra = await api.consultar({ url, sesion, fetch });
    assert.strictEqual(otra.length, 2);
    await assert.rejects(() => api.consultar({ url, sesion: Object.assign({}, sesion, { token: 'malo' }), fetch }), { codigo: 'NO_AUTORIZADA' });
    api.olvidarSesion(storage);
    assert.strictEqual(api.leerSesion(storage), null);
    const antes = vistos.length;
    await assert.rejects(() => api.consultar({ url, sesion: null, fetch }), { codigo: 'NO_AUTORIZADA' });
    assert.strictEqual(vistos.length, antes);
    const caido = await escuchar((req, res) => { res.destroy(); });
    await assert.rejects(() => api.consultar({
      url: 'http://127.0.0.1:' + caido.address().port + '/v1/consultas',
      sesion, fetch, esperaMs: 1000
    }), { codigo: 'CONEXION' });
    await cerrar(caido);
    const mudo = await escuchar(async (req, res) => {
      await leer(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"respuestas":[],"siguiente":null}');
    });
    const pendiente = await api.consultar({
      url: 'http://127.0.0.1:' + mudo.address().port + '/v1/consultas',
      sesion, fetch
    });
    assert.deepStrictEqual(pendiente, []);
    await cerrar(mudo);
  } finally {
    await cerrar(srv);
  }
});

test('la página queda fuera del menú, sin clave y sin dirección de envío; Formspree no cambia', () => {
  for (const lang of ['en', 'es', 'fr']) {
    const html = fs.readFileSync(path.join(DIST, lang, 'support', 'index.html'), 'utf8');
    assert.ok(html.includes('lang="' + lang + '"'), lang);
    assert.ok(html.includes('name="robots" content="noindex, follow"'), lang);
    assert.ok(html.includes('data-endpoint=""'), lang);
    assert.ok(html.includes('name="consulta"'), lang);
    assert.ok(html.includes('value="wellness-ring"'), lang);
    assert.ok(!html.includes('name="email"'), lang);
    assert.ok(!html.includes('name="name"'), lang);
    assert.ok(!html.includes('8787'), lang);
    assert.ok(!html.includes('8788'), lang);
    assert.ok(!/sk-|OPENAI|GEMINI|api_key|IGO_SUPPORT_RECEPTOR_SECRETO/i.test(html), lang);
    assert.ok(!html.includes('formspree.io'), lang);
    assert.ok(!html.includes('respuesta_propuesta'), lang);
    assert.ok(html.includes('support.privacy') === false);
  }
  const home = fs.readFileSync(path.join(DIST, 'en', 'index.html'), 'utf8');
  const origen = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  assert.ok(home.includes('https://formspree.io/f/xnpjwkwj'));
  assert.ok(home.includes('data-ea-form'));
  assert.ok(home.includes('name="email"'));
  assert.ok(!home.includes('support/index.html'));
  assert.ok(origen.includes('data-ea-form'));
  assert.ok(!origen.includes('data-support-form'));
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('Disallow: /'));
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes('support'));
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'site.json'), 'utf8'));
  assert.strictEqual(site.supportEndpoint, '');
  assert.strictEqual(site.formEndpoint, 'https://formspree.io/f/xnpjwkwj');
  assert.strictEqual(site.seo.publish, false);
  assert.strictEqual(site.seo.pages.support.index, false);
});
