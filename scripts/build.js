#!/usr/bin/env node
'use strict';
/* IGO static multilingual build. No dependencies (Node ≥ 18).
   src/ pages (*.html) (one template per page) + locales/<lang>.json  →  dist/<lang>/ pages, dist/index.html (neutral entry), dist/assets (only what is referenced).
   Run:  node scripts/build.js      Originals (index.html, products/, assets/, vision/…) are never modified.
   Template tokens:  {{a.b.c}} escaped text · {{lines:a.b|class}} one <span class="class"> per line ("\n" in the JSON) · {{link:pageId}} relative link to a page in the same language
                     {{root}} relative path to dist/ · {{lang}} · {{seo}} canonical + hreflang · {{langMenu}} / {{langInline}} language selectors. No HTML is allowed inside the JSON. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(ROOT, 'locales');
const DIST = path.join(ROOT, 'dist');

const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR' }
];
const SOURCE = 'en';   /* editorial source language and fallback */
const PAGES = [
  { id: 'home', file: 'index.html' },
  { id: 'products', file: 'products/index.html' }
  /* next: vision, wellness, technology, about (add a template in src/ and a block in each locale) */
];
const COPY_AS_IS = ['vision', 'wellness', 'technology', 'about'];   /* src/<name>/index.html: provisional pages, copied unchanged (not translated yet) to dist/<name>/ */

const siteUrl = (JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8')).siteUrl || '').replace(/\/+$/, '');
const posix = (p) => p.split(path.sep).join('/');

/* ---------- locales ---------- */
function flatten(obj, prefix, out) {
  Object.keys(obj).forEach((k) => {
    const key = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = String(obj[k]);
  });
  return out;
}
let dict = {};
let warnings = [];
function loadLocales() {
  dict = {};
  LANGS.forEach((l) => { dict[l.code] = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES, l.code + '.json'), 'utf8')), '', {}); });
  Object.keys(dict[SOURCE]).forEach((k) => {
    LANGS.forEach((l) => {
      if (/[<>]/.test(dict[l.code][k] || '')) throw new Error('HTML is not allowed in locale values: ' + l.code + ' ' + k);
      if (l.code !== SOURCE && dict[l.code][k] === undefined) warnings.push('missing ' + l.code + ': ' + k + ' (falling back to ' + SOURCE + ')');
    });
  });
}
function t(lang, key) {
  if (dict[lang][key] !== undefined) return dict[lang][key];
  if (dict[SOURCE][key] !== undefined) return dict[SOURCE][key];
  throw new Error('Unknown locale key: ' + key);
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- helpers ---------- */
const depth = (page) => page.file.split('/').length - 1;
const rootOf = (page) => '../'.repeat(depth(page) + 1);                      /* from dist/<lang>/<page> to dist/ */
function link(from, to) {                                                       /* same language, page → page */
  const rel = posix(path.relative(path.dirname(from.file), to.file));
  return rel || 'index.html';
}
function langHref(page, code) { return rootOf(page) + code + '/' + page.file; }
function absUrl(code, page) { return siteUrl + '/' + code + '/' + page.file.replace(/index\.html$/, ''); }

function seo(page, lang) {
  const out = ['<!-- SEO: ' + (siteUrl ? 'absolute URLs from scripts/site.json' : 'relative URLs; set "siteUrl" in scripts/site.json once the domain is final') + ' -->'];
  out.push('<link rel="canonical" href="' + (siteUrl ? absUrl(lang, page) : 'index.html') + '">');
  LANGS.forEach((l) => out.push('<link rel="alternate" hreflang="' + l.code + '" href="' + (siteUrl ? absUrl(l.code, page) : langHref(page, l.code)) + '">'));
  out.push('<link rel="alternate" hreflang="x-default" href="' + (siteUrl ? siteUrl + '/' : rootOf(page) + 'index.html') + '">');
  return out.join('\n');
}
function langMenu(page, lang) {
  const items = LANGS.map((l) => '<li><a href="' + langHref(page, l.code) + '" lang="' + l.code + '" hreflang="' + l.code + '" data-lang-switch="' + l.code + '"' + (l.code === lang ? ' aria-current="true"' : '') + '>' + l.label + '</a></li>').join('');
  const cur = LANGS.find((l) => l.code === lang);
  return '<details class="lang" data-lang-menu><summary aria-label="' + esc(t(lang, 'common.langLabel')) + ': ' + cur.label + '"><span class="lang__current" aria-hidden="true">' + cur.short + '</span><svg class="lang__caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.25"/></svg></summary><ul class="lang__list" role="list">' + items + '</ul></details>';
}
function langInline(page, lang) {
  const items = LANGS.map((l) => '<a href="' + langHref(page, l.code) + '" lang="' + l.code + '" hreflang="' + l.code + '" data-lang-switch="' + l.code + '" aria-label="' + l.label + '"' + (l.code === lang ? ' aria-current="true"' : '') + '>' + l.short + '</a>').join('');
  return '<span class="lang-inline" role="group" aria-label="' + esc(t(lang, 'common.langLabel')) + '">' + items + '</span>';
}

function render(page, lang, tpl) {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, tok) => {
    if (tok === 'lang') return lang;
    if (tok === 'root') return rootOf(page);
    if (tok === 'seo') return seo(page, lang);
    if (tok === 'langMenu') return langMenu(page, lang);
    if (tok === 'langInline') return langInline(page, lang);
    if (tok.startsWith('link:')) {
      const target = PAGES.find((p) => p.id === tok.slice(5));
      if (!target) throw new Error('Unknown page id in ' + m);
      return link(page, target);
    }
    if (tok.startsWith('lines:')) {
      const [key, cls] = tok.slice(6).split('|');
      return t(lang, key).split('\n').map((ln) => '<span class="' + cls + '">' + esc(ln) + '</span>').join(' ');
    }
    return esc(t(lang, tok));
  });
}

/* ---------- output ---------- */
function write(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); }
function build() {
  warnings = [];
  loadLocales();
  const generated = [];

  PAGES.forEach((page) => {
    const tpl = fs.readFileSync(path.join(SRC, page.file), 'utf8');
    LANGS.forEach((l) => {
      const html = render(page, l.code, tpl);
      const left = html.match(/\{\{[^}]*\}\}/);
      if (left) throw new Error('Unresolved token ' + left[0] + ' in ' + l.code + '/' + page.file);
      const out = path.join(DIST, l.code, page.file);
      write(out, html);
      generated.push(out);
    });
  });

  /* neutral entry: detects the language, never overrides a specific URL */
  const codes = LANGS.map((l) => l.code);
  const entry = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex, nofollow">\n<title>IGO</title>\n'
    + '<link rel="icon" href="assets/igo/igo-logo.svg" type="image/svg+xml">\n'
    + LANGS.map((l) => '<link rel="alternate" hreflang="' + l.code + '" href="' + (siteUrl ? siteUrl + '/' + l.code + '/' : l.code + '/index.html') + '">').join('\n') + '\n'
    + '<link rel="alternate" hreflang="x-default" href="' + (siteUrl ? siteUrl + '/en/' : 'en/index.html') + '">\n'
    + '<noscript><meta http-equiv="refresh" content="0;url=' + SOURCE + '/index.html"></noscript>\n'
    + '<script>\n(function () {\n  var supported = ' + JSON.stringify(codes) + ', fallback = ' + JSON.stringify(SOURCE) + ', pick = fallback;\n'
    + '  try { var saved = localStorage.getItem("igo-lang"); if (saved && supported.indexOf(saved) > -1) pick = saved; else throw 0; }\n'
    + '  catch (e) {\n    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || fallback];\n'
    + '    for (var i = 0; i < prefs.length; i++) { var c = String(prefs[i]).toLowerCase().split("-")[0]; if (supported.indexOf(c) > -1) { pick = c; break; } }\n  }\n'
    + '  location.replace(pick + "/index.html" + location.hash);\n})();\n</script>\n</head>\n<body>\n'
    + '<p style="font:16px/1.5 system-ui,sans-serif;padding:2rem"><a href="en/index.html">English</a> · <a href="es/index.html">Español</a> · <a href="fr/index.html">Français</a></p>\n</body>\n</html>\n';
  write(path.join(DIST, 'index.html'), entry);
  generated.push(path.join(DIST, 'index.html'));

  /* pages not migrated yet: copied unchanged (same relative layout, so ../assets keeps working) */
  COPY_AS_IS.forEach((name) => {
    const from = path.join(SRC, name, 'index.html');
    if (!fs.existsSync(from)) { warnings.push('not found, skipped: src/' + name + '/index.html'); return; }
    const to = path.join(DIST, name, 'index.html');
    write(to, fs.readFileSync(from));
    generated.push(to);
  });

  /* copy only the assets that the generated pages reference */
  const refs = new Set(['assets/igo/igo-logo.svg', 'assets/igo/igo-logo-white.svg']);
  generated.forEach((f) => {
    const text = fs.readFileSync(f, 'utf8');
    (text.match(/assets\/[^"'\s,)<>]+/g) || []).forEach((r) => refs.add(r));
  });
  let copied = 0;
  refs.forEach((r) => {
    const from = path.join(ROOT, r);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) { warnings.push('missing asset: ' + r); return; }
    const to = path.join(DIST, r);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    copied++;
  });


  console.log('Built ' + generated.length + ' pages (' + LANGS.map((l) => l.code).join(', ') + '), copied ' + copied + ' assets → dist/');
  warnings.forEach((w) => console.warn('warning: ' + w));

}

/* ---------- run / watch ---------- */
build();
if (process.argv.includes('--watch')) {
  /* Watches templates, locales, scripts/site.json and assets. dist/ is never watched, so a build cannot trigger another build.
     The build only writes inside dist/: it never modifies src/ or locales/. */
  const targets = [SRC, LOCALES, path.join(ROOT, 'assets'), path.join(__dirname, 'site.json')];
  let timer = null;
  const trigger = (why) => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { build(); } catch (e) { console.error('build failed: ' + e.message); } }, 200);
  };
  targets.forEach((tg) => {
    if (!fs.existsSync(tg)) return;
    try { fs.watch(tg, { recursive: fs.statSync(tg).isDirectory() }, (ev, name) => { if (name && /\.DS_Store$/.test(name)) return; trigger(name); }); }
    catch (e) { console.error('cannot watch ' + tg + ': ' + e.message); }
  });
  console.log('Watching src/, locales/, assets/ and scripts/site.json… (Ctrl+C to stop)');
}
