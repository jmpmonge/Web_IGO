'use strict';
/* Indexing policy for the draft site. Routes come from templates that exist.
   publish:false keeps every page out of the index even if a page is marked index:true.
   exclude:true drops a real page from this build. It does not reserve a future URL. */
const fs = require('fs');
const path = require('path');

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalize(raw) {
  const seo = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const pages = seo.pages && typeof seo.pages === 'object' && !Array.isArray(seo.pages) ? seo.pages : {};
  return {
    publish: seo.publish === true,
    title: {
      warnMin: num(seo.title && seo.title.warnMin, 30),
      warnMax: num(seo.title && seo.title.warnMax, 60)
    },
    description: {
      warnMin: num(seo.description && seo.description.warnMin, 70),
      warnMax: num(seo.description && seo.description.warnMax, 160)
    },
    pages
  };
}

function resolvePage(seo, page) {
  const key = page && page.articleId ? 'scienceArticle' : (page && page.id);
  const pages = seo.pages || {};
  const entry = key && Object.prototype.hasOwnProperty.call(pages, key) ? pages[key] : {};
  return {
    key,
    configured: !!(key && Object.prototype.hasOwnProperty.call(pages, key)),
    provisional: entry.provisional !== false,
    index: entry.index === true,
    follow: entry.follow !== false
  };
}

function robotsDirective(seo, page, opts) {
  const policy = resolvePage(seo, page);
  const preview = !!(opts && opts.preview);
  let index = seo.publish === true && policy.index === true && policy.provisional === false;
  if (page && page.articleId && preview) index = false;
  return (index ? 'index' : 'noindex') + ', ' + (policy.follow ? 'follow' : 'nofollow');
}

function isIndexable(seo, page, opts) {
  return robotsDirective(seo, page, opts).startsWith('index,');
}

/* Throws if seo.pages names a route the build does not emit.
   Returns ids of live pages that have no entry (they stay provisional). */
function assertConfig(seo, pages) {
  const allowed = new Set(pages.map((page) => page.id));
  allowed.add('scienceArticle');
  Object.keys(seo.pages).forEach((id) => {
    if (!allowed.has(id)) throw new Error('seo.pages.' + id + ' is not a page this build emits');
    const entry = seo.pages[id];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('seo.pages.' + id + ' must be an object');
    Object.keys(entry).forEach((key) => {
      if (key !== 'provisional' && key !== 'index' && key !== 'follow' && key !== 'exclude') throw new Error('seo.pages.' + id + '.' + key + ' is not a supported flag');
      if (typeof entry[key] !== 'boolean') throw new Error('seo.pages.' + id + '.' + key + ' must be boolean');
    });
    if (entry.exclude === true && entry.index === true) throw new Error('seo.pages.' + id + ' cannot be both excluded and indexable');
  });
  const missing = [];
  pages.forEach((page) => {
    if (page.articleId) return;
    if (!Object.prototype.hasOwnProperty.call(seo.pages, page.id)) missing.push(page.id);
  });
  return missing;
}

/* index.html files under src/ that the build does not already list. Article templates are not routes. */
function discoverPages(srcDir, knownFiles) {
  const found = [];
  walkIndex(srcDir, srcDir, found);
  const known = new Set(knownFiles);
  return found.filter((file) => !known.has(file)).map((file) => ({
    id: file === 'index.html' ? 'home' : file.replace(/\/index\.html$/, '').replace(/\//g, '-'),
    file: file,
    discovered: true
  }));
}

function walkIndex(dir, base, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((ent) => {
    if (ent.name.startsWith('.')) return;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkIndex(full, base, out);
    else if (ent.name === 'index.html') out.push(path.relative(base, full).split(path.sep).join('/'));
  });
}

module.exports = { normalize, resolvePage, robotsDirective, isIndexable, assertConfig, discoverPages };
