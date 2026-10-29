'use strict';
/* Title, description, internal links, routes and the future-SEO registry.
   Length issues warn. Empty metadata and broken local links fail the build.
   Claims of kind confirmed or supplier require an https source. */
const fs = require('fs');
const path = require('path');

const CLAIM_KINDS = new Set(['confirmed', 'supplier', 'hypothesis']);
const LANGS = new Set(['es', 'en', 'fr']);
const ARRAYS = ['keywords', 'clusters', 'categories', 'schemaTypes', 'images', 'editorial', 'claims'];

function posix(p) { return p.split(path.sep).join('/'); }

function decode(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function inspectMeta(html) {
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || ['', ''])[1]);
  const description = decode((html.match(/<meta name="description" content="([^"]*)"/) || ['', ''])[1]);
  return { title, description };
}

function metaFindings(files, dist, seo) {
  const warnings = [];
  const titles = new Map();
  const titleOff = [];
  const descriptionOff = [];
  files.forEach((file) => {
    const rel = posix(path.relative(dist, file));
    const match = rel.match(/^(en|es|fr)\/(.+)$/);
    if (!match) return;
    const meta = inspectMeta(fs.readFileSync(file, 'utf8'));
    if (!meta.title.trim()) throw new Error(rel + ': empty title');
    if (!meta.description.trim()) throw new Error(rel + ': empty description');
    if (match[1] !== 'en') return;
    const id = match[2];
    const titleLen = Array.from(meta.title).length;
    const descriptionLen = Array.from(meta.description).length;
    if (titleLen < seo.title.warnMin || titleLen > seo.title.warnMax) titleOff.push(id + ' (' + titleLen + ')');
    if (descriptionLen < seo.description.warnMin || descriptionLen > seo.description.warnMax) descriptionOff.push(id + ' (' + descriptionLen + ')');
    if (!titles.has(meta.title)) titles.set(meta.title, []);
    titles.get(meta.title).push(id);
  });
  if (titleOff.length) warnings.push('SEO titles outside ' + seo.title.warnMin + '–' + seo.title.warnMax + ' characters, left unchanged: ' + titleOff.join(', '));
  if (descriptionOff.length) warnings.push('SEO descriptions outside ' + seo.description.warnMin + '–' + seo.description.warnMax + ' characters, left unchanged: ' + descriptionOff.join(', '));
  const dupes = [];
  titles.forEach((ids, title) => { if (ids.length > 1) dupes.push(ids.join(' = ') + ' "' + title + '"'); });
  if (dupes.length) warnings.push('SEO duplicate English titles, left unchanged: ' + dupes.join('; '));
  return warnings;
}

function checkLinks(files, dist) {
  const errors = [];
  const ids = new Map();
  function idsOf(file) {
    if (!ids.has(file)) {
      const found = new Set();
      const html = fs.readFileSync(file, 'utf8');
      const re = /\sid=["']([^"']+)["']/g;
      let mark;
      while ((mark = re.exec(html))) found.add(mark[1]);
      ids.set(file, found);
    }
    return ids.get(file);
  }
  function inside(target) {
    const rel = path.relative(dist, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }
  files.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const refs = [];
    const attr = /(?:href|src|poster)=["']([^"']+)["']/g;
    let mark;
    while ((mark = attr.exec(html))) refs.push(mark[1]);
    const srcset = /srcset=["']([^"']+)["']/g;
    while ((mark = srcset.exec(html))) {
      mark[1].split(',').forEach((part) => {
        const url = part.trim().split(/\s+/)[0];
        if (url) refs.push(url);
      });
    }
    refs.forEach((ref) => {
      const clean = ref.replace(/&amp;/g, '&');
      if (/^(https?:|\/\/|mailto:|tel:|data:|javascript:)/i.test(clean)) return;
      let pathPart = clean;
      let fragment = '';
      const hash = pathPart.indexOf('#');
      if (hash >= 0) {
        fragment = pathPart.slice(hash + 1);
        pathPart = pathPart.slice(0, hash);
      }
      const query = pathPart.indexOf('?');
      if (query >= 0) pathPart = pathPart.slice(0, query);
      if (pathPart.startsWith('/')) {
        errors.push(posix(path.relative(dist, file)) + ': root-relative URL ' + ref);
        return;
      }
      let decoded = pathPart;
      try { decoded = decodeURIComponent(pathPart); }
      catch (e) { errors.push(posix(path.relative(dist, file)) + ': bad encoding ' + ref); return; }
      let target = decoded ? path.resolve(path.dirname(file), decoded) : file;
      if (decoded && fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      const where = posix(path.relative(dist, file));
      if (!inside(target)) { errors.push(where + ': link leaves dist ' + ref); return; }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { errors.push(where + ': missing ' + ref); return; }
      if (!fragment || !target.endsWith('.html')) return;
      let decodedFragment = fragment;
      try { decodedFragment = decodeURIComponent(fragment); }
      catch (e) { errors.push(where + ': bad fragment ' + ref); return; }
      if (!idsOf(target).has(decodedFragment)) errors.push(where + ': missing fragment ' + ref);
    });
  });
  return errors;
}

function loadRegistry(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertRegistry(data, knownIds, fileExists) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('SEO registry must be an object');
  if (data.version !== 1) throw new Error('SEO registry version must be 1');
  ARRAYS.forEach((key) => {
    if (!Array.isArray(data[key])) throw new Error('SEO registry.' + key + ' must be an array');
  });
  if (!Array.isArray(data.languages) || data.languages.length !== LANGS.size || data.languages.some((lang) => !LANGS.has(lang))) {
    throw new Error('SEO registry languages must be es, en and fr');
  }
  function pageOk(item, label) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(label + ' must be an object');
    if (item.route !== undefined || item.url !== undefined || item.path !== undefined) {
      throw new Error(label + ' must not invent a URL; use pageId of a page the build already emits');
    }
    if (item.pageId !== undefined && (!knownIds || !knownIds.has(item.pageId))) {
      throw new Error(label + ' pageId is not a real page: ' + item.pageId);
    }
  }
  data.keywords.forEach((item, i) => pageOk(item, 'keywords[' + i + ']'));
  data.clusters.forEach((item, i) => pageOk(item, 'clusters[' + i + ']'));
  data.categories.forEach((item, i) => pageOk(item, 'categories[' + i + ']'));
  data.editorial.forEach((item, i) => pageOk(item, 'editorial[' + i + ']'));
  data.schemaTypes.forEach((item, i) => {
    pageOk(item, 'schemaTypes[' + i + ']');
    if (item.type !== undefined && typeof item.type !== 'string') throw new Error('schemaTypes[' + i + '].type must be a string');
  });
  data.images.forEach((item, i) => {
    pageOk(item, 'images[' + i + ']');
    if (item.src === undefined) return;
    if (!/^assets\/[A-Za-z0-9_./-]+$/.test(item.src)) throw new Error('images[' + i + '].src must be a relative assets/ path');
    if (fileExists && !fileExists(item.src)) throw new Error('images[' + i + '].src does not exist: ' + item.src);
  });
  data.claims.forEach((claim, i) => {
    const label = 'claims[' + i + ']';
    pageOk(claim, label);
    if (!CLAIM_KINDS.has(claim.kind)) throw new Error(label + ' kind must be confirmed, supplier or hypothesis');
    if (typeof claim.statement !== 'string' || !claim.statement.trim()) throw new Error(label + ' needs a statement');
    const source = claim.source || '';
    if (source && !/^https:\/\/\S+$/.test(source)) throw new Error(label + ' source must be an https URL');
    if ((claim.kind === 'confirmed' || claim.kind === 'supplier') && !/^https:\/\/\S+$/.test(source)) {
      throw new Error(label + ' needs a verified https source');
    }
    if (claim.kind === 'hypothesis' && claim.publishable === true) throw new Error(label + ' hypothesis cannot be publishable');
  });
}

module.exports = { inspectMeta, metaFindings, checkLinks, loadRegistry, assertRegistry };
