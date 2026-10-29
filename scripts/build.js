#!/usr/bin/env node
'use strict';
/* IGO static multilingual build. No dependencies (Node ≥ 18).
   src/ pages (*.html) (one template per page) + locales/<lang>.json  →  dist/<lang>/ pages, dist/index.html (neutral entry), dist/assets (only what is referenced).
   Run:  node scripts/build.js      Originals (index.html, products/, assets/, vision/…) are never modified.
   Template tokens:  {{a.b.c}} escaped text · {{lines:a.b|class}} one <span class="class"> per line ("\n" in the JSON) · {{link:pageId}} relative link to a page in the same language
                     {{root}} relative path to dist/ · {{lang}} · {{seo}} canonical + hreflang + Open Graph · {{robots}} index policy · {{langMenu}} / {{langInline}} language selectors. No HTML is allowed inside the JSON. */
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
  { id: 'products', file: 'products/index.html' },
  { id: 'sale', file: 'sale/index.html' },
  { id: 'science', file: 'science/index.html' },
  { id: 'privacy', file: 'privacy/index.html' },
  { id: 'vision', file: 'vision/index.html' },
  { id: 'wellness', file: 'wellness/index.html' },
  { id: 'technology', file: 'technology/index.html' },
  { id: 'about', file: 'about/index.html' }
];
const COPY_AS_IS = [];   /* pages not migrated to templates yet: src/<name>/index.html copied unchanged to dist/<name>/ (vision, wellness, technology, about now use the shared template header) */
const COPY_DIRS = ['probador'];   /* <name>/ at the project root, copied as-is to dist/<name>/ (virtual try-on prototype) */

const research = require('./research');
const experiences = require('./experiences');
const seoPolicy = require('./seo/policy');
const seoEmit = require('./seo/emit');
const seoValidate = require('./seo/validate');
let seoState = seoPolicy.normalize(null);
/* Public origin used for canonical, hreflang, og:url and og:image. SITE_URL (environment) wins over "siteUrl" in scripts/site.json.
   Example:  SITE_URL=https://www.example.com node scripts/build.js      With NODE_ENV=production the build fails if it is empty. */
const siteUrl = String(process.env.SITE_URL || JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8')).siteUrl || '').trim().replace(/\/+$/, '');
if (siteUrl && !/^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/.test(siteUrl)) throw new Error('SITE_URL must be an absolute https:// URL without query or fragment, got: ' + siteUrl);
const bundleStyles = require('./css-bundle').bundleStyles;
/* One switch for Ciencia. Inactive categories are removed from the HTML, not hidden with CSS. */
const scienceSections = JSON.parse(fs.readFileSync(path.join(__dirname, 'science-sections.json'), 'utf8'));
/* Early access form endpoint (form-handling service). Read on every build so --watch picks up changes to scripts/site.json. */
const formEndpoint = () => String(JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8')).formEndpoint || '').trim();
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
let pageIndex = PAGES;
let preview = false;

/* ---------- helpers ---------- */
const depth = (page) => page.file.split('/').length - 1;
const rootOf = (page) => '../'.repeat(depth(page) + 1);                      /* from dist/<lang>/<page> to dist/ */
function link(from, to) {                                                       /* same language, page → page */
  const rel = posix(path.relative(path.dirname(from.file), to.file));
  return rel || 'index.html';
}
function langHref(page, code) { return seoEmit.langHref(page.file, code); }
function absUrl(code, page) { return seoEmit.pageUrl(siteUrl, code, page.file); }

function metaFor(page, lang) {
  const fromArticle = research.pageMeta(page, lang);
  if (fromArticle) return fromArticle;
  if (page.id === 'scienceLibrary') {
    return { title: t(lang, 'science.libraryMeta.title'), description: t(lang, 'science.libraryMeta.description') };
  }
  return { title: t(lang, page.id + '.meta.title'), description: t(lang, page.id + '.meta.description') };
}
function imageFor(page) {
  if (page.id === 'sale') return 'assets/images/images_igo/card_vision-1000.webp';
  if (['home', 'products', 'privacy', 'vision', 'wellness', 'technology', 'about'].includes(page.id)) return 'assets/images/images_igo/home_hero.webp';
  return 'assets/research/research-hero-concept-1200.webp';
}
function seo(page, lang) {
  const meta = metaFor(page, lang);
  const imagePath = imageFor(page);
  const image = siteUrl ? siteUrl + '/' + imagePath : rootOf(page) + imagePath;
  const out = ['<!-- SEO: ' + (siteUrl ? 'absolute URLs from SITE_URL / scripts/site.json' : 'relative URLs; set "siteUrl" in scripts/site.json once the domain is final') + ' -->'];
  out.push('<link rel="canonical" href="' + (siteUrl ? absUrl(lang, page) : 'index.html') + '">');
  LANGS.forEach((l) => out.push('<link rel="alternate" hreflang="' + l.code + '" href="' + (siteUrl ? absUrl(l.code, page) : langHref(page, l.code)) + '">'));
  out.push('<link rel="alternate" hreflang="x-default" href="' + seoEmit.hubHref(page.file, siteUrl) + '">');
  out.push('<meta property="og:title" content="' + esc(meta.title) + '">');
  out.push('<meta property="og:description" content="' + esc(meta.description) + '">');
  out.push('<meta property="og:type" content="' + (page.articleId ? 'article' : 'website') + '">');
  out.push('<meta property="og:image" content="' + image + '">');
  if (siteUrl) out.push('<meta property="og:url" content="' + absUrl(lang, page) + '">');
  out.push('<meta name="twitter:card" content="summary_large_image">');
  out.push('<meta name="twitter:title" content="' + esc(meta.title) + '">');
  out.push('<meta name="twitter:description" content="' + esc(meta.description) + '">');
  out.push('<meta name="twitter:image" content="' + image + '">');
  /* No Organization, WebSite or Product JSON-LD until there is a final siteUrl and a real offer. */
  return out.join('\n');
}
function applySections(tpl) {
  return tpl.replace(/\{\{#section:([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/section:\1\}\}/g, (m, name, body) => {
    if (!Object.prototype.hasOwnProperty.call(scienceSections, name)) throw new Error('Unknown science section: ' + name);
    return scienceSections[name] ? body : '';
  });
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

/* Home cards: configured in scripts/site.json -> homeCards { style: "producto"|"video", columns: 2|3|4, heading: "titulo"|"etiqueta"|"ninguno", cards: [...], videos: [...] } */
const CARD_IDS = ['vision', 'shield', 'wellness', 'app'];
const VIDEO_IDS = ['camara', 'manoslibres', 'captura', 'sensores', 'app'];
function homeCards() {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8')).homeCards || {};
  const columns = [2, 3, 4].includes(Number(c.columns)) ? Number(c.columns) : 4;
  const heading = ['titulo', 'etiqueta', 'ninguno'].includes(c.heading) ? c.heading : 'titulo';
  const cards = Array.isArray(c.cards) ? c.cards.filter((id) => CARD_IDS.includes(id)) : CARD_IDS.slice();
  if (!cards.length) throw new Error('site.json homeCards.cards needs at least one card');
  const style = c.style === 'video' ? 'video' : 'producto';
  const videos = Array.isArray(c.videos) ? c.videos.filter((id) => VIDEO_IDS.includes(id)) : VIDEO_IDS.slice();
  if (style === 'video' && !videos.length) throw new Error('site.json homeCards.videos needs at least one card');
  return { style, columns, heading, cards, videos };
}
function applyCards(tpl) {
  const cfg = homeCards();
  tpl = tpl.replace(/\{\{#style:([a-z]+)\}\}([\s\S]*?)\{\{\/style:\1\}\}/g, (m, st, body) => (st === cfg.style ? body : ''));
  tpl = tpl.replace(/\{\{#vcard:([a-z]+)\}\}([\s\S]*?)\{\{\/vcard:\1\}\}/g, (m, id, body) => {
    if (!VIDEO_IDS.includes(id)) throw new Error('Unknown video card: ' + id);
    return cfg.videos.includes(id) ? body : '';
  });
  return tpl.replace(/\{\{#card:([a-z]+)\}\}([\s\S]*?)\{\{\/card:\1\}\}/g, (m, id, body) => {
    if (!CARD_IDS.includes(id)) throw new Error('Unknown home card: ' + id);
    return cfg.cards.includes(id) ? body : '';
  });
}
const CARD_HEAD_CLASS = { titulo: 'band__title cband__title', etiqueta: 'kicker cband__kicker', ninguno: 'visually-hidden' };
function render(page, lang, tpl) {
  tpl = applySections(tpl);
  tpl = applyCards(tpl);
  const cards = homeCards();
  const xp = page.id === 'home' ? experiences.prepare(lang, { t, esc, assetRoot: rootOf(page), webRoot: ROOT }) : null;
  tpl = tpl.replace(/\{\{#experiences\}\}([\s\S]*?)\{\{\/experiences\}\}/g, (m, body) => (xp ? body : ''));
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, tok) => {
    if (tok === 'lang') return lang;
    if (tok === 'root') return rootOf(page);
    if (tok === 'experiences:list') return xp ? xp.html : '';
    if (tok === 'experiences:note') return xp && xp.note ? '<p class="xband__note">' + esc(t(lang, 'home.experiences.note')) + '</p>' : '';
    if (tok === 'experiences:motion') return xp ? xp.motion : 'manual';
    if (tok === 'seo') return seo(page, lang);
    if (tok === 'robots') return seoPolicy.robotsDirective(seoState, page, { preview });
    if (tok === 'formAction') return esc(formEndpoint());
    if (tok === 'cards:columns') return String(cards.columns);
    if (tok === 'cards:heading') return cards.heading;
    if (tok === 'cards:style') return cards.style;
    if (tok === 'cards:headClass') return CARD_HEAD_CLASS[cards.heading];
    if (tok === 'cards:headText') return esc(t(lang, cards.heading === 'titulo' ? 'home.cards.heading' : 'home.cards.title'));
    if (tok === 'langMenu') return langMenu(page, lang);
    if (tok === 'langInline') return langInline(page, lang);
    if (tok.startsWith('link:')) {
      const target = pageIndex.find((p) => p.id === tok.slice(5));
      if (!target) throw new Error('Unknown page id in ' + m);
      return link(page, target);
    }
    if (tok.startsWith('research:')) {
      return research.token(tok.slice(9), page, lang, { esc, t, link, pages: pageIndex, preview });
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
function emit(page, generated) {
  const tpl = fs.readFileSync(path.join(SRC, page.template || page.file), 'utf8');
  LANGS.forEach((l) => {
    const html = render(page, l.code, tpl);
    const left = html.match(/\{\{[^}]*\}\}/);
    if (left) throw new Error('Unresolved token ' + left[0] + ' in ' + l.code + '/' + page.file);
    const out = path.join(DIST, l.code, page.file);
    write(out, html);
    generated.push(out);
  });
}
function cleanScience(kept) {
  LANGS.forEach((l) => {
    const dir = path.join(DIST, l.code, 'science');
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((name) => {
      if (name === 'index.html' || name === 'library') return;
      if (!kept.has(name)) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    });
  });
}
function build() {
  warnings = [];
  loadLocales();
  preview = process.argv.includes('--preview');
  research.load(ROOT);
  research.assertFilter();
  pageIndex = PAGES.concat(research.extraPages(preview));
  seoPolicy.discoverPages(SRC, pageIndex.map((page) => page.file)).forEach((page) => {
    warnings.push('unregistered page ' + page.file + ' stays provisional and noindex; add seo.pages.' + page.id + ' in scripts/site.json when it is ready');
    pageIndex.push(page);
  });
  seoState = seoPolicy.normalize(JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8')).seo);
  if (seoState.publish && !siteUrl) throw new Error('seo.publish requires SITE_URL or "siteUrl" in scripts/site.json');
  seoPolicy.assertConfig(seoState, pageIndex).forEach((id) => warnings.push('seo.pages.' + id + ' is missing; the page stays provisional and noindex'));
  const excluded = pageIndex.filter((page) => !page.articleId && seoState.pages[page.id] && seoState.pages[page.id].exclude === true);
  pageIndex = pageIndex.filter((page) => !excluded.includes(page));
  excluded.forEach((page) => {
    warnings.push('excluded, not generated: ' + page.id);
    LANGS.forEach((l) => {
      const stale = path.join(DIST, l.code, page.file);
      if (fs.existsSync(stale)) fs.rmSync(stale, { force: true });
    });
  });
  if (!/^https:\/\//.test(formEndpoint())) warnings.push('formEndpoint is empty or not https in scripts/site.json: the early access form will NOT send until it is set');
  if (!siteUrl && process.env.NODE_ENV === 'production') throw new Error('SITE_URL (or "siteUrl" in scripts/site.json) is required when NODE_ENV=production: canonical and hreflang must be absolute');
  if (!siteUrl) warnings.push('SITE_URL / siteUrl is empty: canonical and hreflang stay relative (draft). Set SITE_URL=https://your-domain before publishing');
  const generated = [];

  pageIndex.forEach((page) => emit(page, generated));
  cleanScience(research.slugs(preview));
  const cssBundles = process.argv.includes('--no-bundle') ? [] : bundleStyles({ files: generated, root: ROOT, dist: DIST });

  /* neutral entry: detects the language, never overrides a specific URL */
  const codes = LANGS.map((l) => l.code);
  const entry = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex, follow">\n<title>IGO</title>\n'
    + '<link rel="icon" href="assets/igo/igo-logo.svg" type="image/svg+xml">\n'
    + LANGS.map((l) => '<link rel="alternate" hreflang="' + l.code + '" href="' + (siteUrl ? siteUrl + '/' + l.code + '/' : l.code + '/index.html') + '">').join('\n') + '\n'
    + '<link rel="alternate" hreflang="x-default" href="' + (siteUrl ? siteUrl + '/' : 'index.html') + '">\n'
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
  /* assets that stylesheets point to with url() (fonts, images); bundles live in dist/, the other sheets in the sources */
  Array.from(refs).filter((r) => /\.css$/.test(r)).forEach((r) => {
    const sheet = /^assets\/bundle-/.test(r) ? path.join(DIST, r) : path.join(ROOT, r);
    if (!fs.existsSync(sheet)) return;
    (fs.readFileSync(sheet, 'utf8').match(/url\(\s*["']?[^"')]+/g) || []).forEach((u) => {
      const ref = u.replace(/^url\(\s*["']?/, '');
      if (/^(data:|https?:|#|\/)/.test(ref)) return;
      refs.add(posix(path.posix.normalize('assets/' + ref.split(/[?#]/)[0])));
    });
  });
  let copied = 0;
  refs.forEach((r) => {
    if (/^assets\/bundle-/.test(r)) return;                       /* generated straight into dist/ */
    const from = path.join(ROOT, r);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) { warnings.push('missing asset: ' + r); return; }
    const to = path.join(DIST, r);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    copied++;
  });

  /* static tools copied verbatim (self-contained, own relative vendor/ paths): <name>/ -> dist/<name>/ */
  COPY_DIRS.forEach((name) => {
    const from = path.join(ROOT, name);
    if (!fs.existsSync(from)) { warnings.push('not found, skipped: ' + name + '/'); return; }
    fs.cpSync(from, path.join(DIST, name), { recursive: true, filter: (f) => !/(^|[\\/])(\._[^\\/]*|\.DS_Store)$/.test(f) });
  });


  assertDraftHeads(generated);
  removeStaleRoots();
  const knownIds = new Set(pageIndex.filter((page) => !page.articleId).map((page) => page.id));
  knownIds.add('scienceArticle');
  const registry = seoValidate.loadRegistry(path.join(__dirname, 'seo', 'registry.json'));
  seoValidate.assertRegistry(registry, knownIds, (rel) => fs.existsSync(path.join(ROOT, rel)));
  const linkErrors = seoValidate.checkLinks(generated, DIST);
  if (linkErrors.length) throw new Error('internal links:\n' + linkErrors.slice(0, 20).join('\n'));
  seoValidate.metaFindings(generated, DIST, seoState).forEach((finding) => warnings.push(finding));
  const seoFiles = seoEmit.writeArtifacts({ dist: DIST, siteUrl, seo: seoState, pages: pageIndex, langs: LANGS.map((l) => l.code), preview });
  const indexable = pageIndex.filter((page) => seoPolicy.isIndexable(seoState, page, { preview })).length;
  console.log('SEO publish=' + seoState.publish + ', indexable pages=' + indexable + ', sitemap URLs=' + seoFiles.count + (seoState.publish ? '' : ', robots=Disallow /'));
  cssBundles.forEach((b) => console.log('CSS ' + b.rel + ': ' + b.files + ' sheets, ' + b.pages + ' pages, ' + (b.before / 1024).toFixed(1) + ' KB -> ' + (b.after / 1024).toFixed(1) + ' KB (' + b.dropped + ' unused rules dropped)'));
  console.log('Built ' + generated.length + ' pages (' + LANGS.map((l) => l.code).join(', ') + ')' + (preview ? ' [preview]' : '') + ', copied ' + copied + ' assets → dist/');
  warnings.forEach((w) => console.warn('warning: ' + w));

}

function removeStaleRoots() {
  const keep = new Set(['assets'].concat(COPY_DIRS, COPY_AS_IS, LANGS.map((l) => l.code)));
  if (!fs.existsSync(DIST)) return;
  fs.readdirSync(DIST, { withFileTypes: true }).forEach((ent) => {
    if (!ent.isDirectory() || keep.has(ent.name)) return;
    fs.rmSync(path.join(DIST, ent.name), { recursive: true, force: true });
    warnings.push('removed stale dist/' + ent.name + '/ (the build does not emit this route)');
  });
}

function assertDraftHeads(files) {
  const copied = new Set(COPY_AS_IS.map((name) => name + '/index.html'));
  files.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const rel = posix(path.relative(DIST, file));
    const fail = (msg) => { throw new Error(rel + ': ' + msg); };
    if (/"@type"\s*:\s*"Product"/.test(html)) fail('Product schema is not allowed');
    if (/"@type"\s*:\s*"(Organization|WebSite)"/.test(html)) fail('Organization schema waits for a final siteUrl');
    if (rel === 'index.html' || copied.has(rel)) {
      if (!html.includes('name="robots" content="noindex, follow"')) fail('hub must stay noindex, follow');
      if (rel === 'index.html' && !html.includes('hreflang="x-default" href="' + (siteUrl ? siteUrl + '/' : 'index.html') + '"')) fail('hub x-default should be the language selector');
      return;
    }
    const match = rel.match(/^(en|es|fr)\/(.+)$/);
    if (!match) fail('unexpected output path');
    const lang = match[1];
    const page = pageIndex.find((item) => item.file === match[2]);
    if (!page) fail('output has no page in the build index');
    const robots = seoPolicy.robotsDirective(seoState, page, { preview });
    if (!html.includes('name="robots" content="' + robots + '"')) fail('robots should be ' + robots);
    if ((html.match(/<title>/g) || []).length !== 1) fail('expected one title');
    if ((html.match(/name="description"/g) || []).length !== 1) fail('expected one description');
    if ((html.match(/rel="canonical"/g) || []).length !== 1) fail('expected one canonical');
    if ((html.match(/property="og:title"/g) || []).length !== 1) fail('expected one og:title');
    if ((html.match(/property="og:description"/g) || []).length !== 1) fail('expected one og:description');
    if ((html.match(/property="og:image"/g) || []).length !== 1) fail('expected one og:image');
    if ((html.match(/name="twitter:image"/g) || []).length !== 1) fail('expected one twitter:image');
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail('expected one h1');
    const canonical = siteUrl ? seoEmit.pageUrl(siteUrl, lang, page.file) : 'index.html';
    if (!html.includes('rel="canonical" href="' + canonical + '"')) fail('canonical should be ' + canonical);
    ['en', 'es', 'fr'].forEach((code) => {
      const href = siteUrl ? seoEmit.pageUrl(siteUrl, code, page.file) : seoEmit.langHref(page.file, code);
      if (!html.includes('hreflang="' + code + '" href="' + href + '"')) fail('hreflang ' + code + ' should be ' + href);
    });
    const xDefault = seoEmit.hubHref(page.file, siteUrl);
    if (!html.includes('hreflang="x-default" href="' + xDefault + '"')) fail('x-default should be ' + xDefault);
    if (siteUrl && !html.includes('property="og:url" content="' + canonical + '"')) fail('og:url should match canonical');
    if (!siteUrl && /property="og:url"/.test(html)) fail('og:url waits for SITE_URL');
    if (!siteUrl && /rel="canonical" href="https?:/.test(html)) fail('canonical must stay relative while siteUrl is empty');
  });
}

/* ---------- run / watch ---------- */
build();
if (process.argv.includes('--watch')) {
  /* Watches templates, locales, scripts/site.json and assets. dist/ is never watched, so a build cannot trigger another build.
     The build only writes inside dist/: it never modifies src/ or locales/. */
  const targets = [SRC, LOCALES, path.join(ROOT, 'assets'), path.join(ROOT, 'content', 'research'), path.join(__dirname, 'site.json'), path.join(__dirname, 'experiences.json'), path.join(__dirname, 'seo')];
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
  console.log('Watching src/, locales/, assets/, scripts/site.json and scripts/experiences.json… (Ctrl+C to stop)');
}
