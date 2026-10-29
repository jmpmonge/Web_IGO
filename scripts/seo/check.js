#!/usr/bin/env node
'use strict';
/* Checks the SEO policy without publishing the site. Pass --dist after a build. */
const fs = require('fs');
const path = require('path');
const policy = require('./policy');
const emit = require('./emit');
const validate = require('./validate');

const WEB = path.resolve(__dirname, '..', '..');
const SCRIPTS = path.join(WEB, 'scripts');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function pageIdsFromBuild() {
  const src = fs.readFileSync(path.join(SCRIPTS, 'build.js'), 'utf8');
  const start = src.indexOf('const PAGES = [');
  const end = src.indexOf('];', start);
  const block = src.slice(start, end);
  const ids = [...block.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
  if (!ids.includes('home') || !ids.includes('about')) throw new Error('could not read PAGES from build.js');
  return ids;
}

function unit() {
  const draft = policy.normalize({
    publish: false,
    pages: { home: { provisional: false, index: true, follow: true } }
  });
  assert(policy.robotsDirective(draft, { id: 'home' }) === 'noindex, follow', 'publish false holds pages');
  assert(policy.robotsDirective(policy.normalize({
    publish: false,
    pages: { home: { provisional: true, index: false, follow: false } }
  }), { id: 'home' }) === 'noindex, nofollow', 'follow can be turned off');
  assert(policy.robotsDirective(policy.normalize(null), { id: 'home' }) === 'noindex, follow', 'missing config stays provisional');

  const live = policy.normalize({
    publish: true,
    pages: {
      home: { provisional: false, index: true, follow: true },
      sale: { provisional: true, index: true, follow: true },
      products: { provisional: false, index: false, follow: true },
      scienceArticle: { provisional: false, index: true, follow: true }
    }
  });
  assert(policy.isIndexable(live, { id: 'home', file: 'index.html' }), 'home can be indexed when publish is on');
  assert(!policy.isIndexable(live, { id: 'sale', file: 'sale/index.html' }), 'provisional stays out');
  assert(!policy.isIndexable(live, { id: 'products', file: 'products/index.html' }), 'noindex stays out');
  assert(!policy.isIndexable(live, { id: 'science-x', articleId: 'x', file: 'science/x/index.html' }, { preview: true }), 'preview articles stay out');
  assert(policy.isIndexable(live, { id: 'science-x', articleId: 'x', file: 'science/x/index.html' }, { preview: false }), 'published articles follow scienceArticle');

  let refused = false;
  try {
    policy.assertConfig(policy.normalize({ pages: { tienda: { provisional: true, index: false, follow: true } } }), [{ id: 'home', file: 'index.html' }]);
  } catch (e) { refused = /tienda/.test(e.message); }
  assert(refused, 'unknown routes are refused');

  assert(emit.pageUrl('https://example.com/', 'en', 'index.html') === 'https://example.com/en/', 'home URL');
  assert(emit.pageUrl('https://example.com', 'es', 'science/library/index.html') === 'https://example.com/es/science/library/', 'nested URL');
  assert(emit.langHref('science/library/index.html', 'fr') === '../../../fr/science/library/index.html', 'relative hreflang');
  assert(emit.hubHref('sale/index.html', '') === '../../index.html', 'relative hub');
  assert(emit.hubHref('sale/index.html', 'https://example.com') === 'https://example.com/', 'absolute hub');

  const pages = [
    { id: 'home', file: 'index.html' },
    { id: 'sale', file: 'sale/index.html' },
    { id: 'products', file: 'products/index.html' }
  ];
  const published = emit.sitemapDocument({ siteUrl: 'https://example.com', seo: live, pages, langs: ['en', 'es', 'fr'], preview: false });
  assert(published.count === 3, 'only the indexable language versions, got ' + published.count);
  assert(published.xml.includes('https://example.com/en/'), 'home loc');
  assert(published.xml.includes('https://example.com/fr/'), 'french home');
  assert(!published.xml.includes('/sale/'), 'provisional excluded');
  assert(!published.xml.includes('/products/'), 'noindex excluded');
  assert(!published.xml.includes('tienda'), 'no invented route');
  const held = emit.sitemapDocument({ siteUrl: 'https://example.com', seo: draft, pages, langs: ['en', 'es', 'fr'], preview: false });
  assert(held.count === 0 && !held.xml.includes('<loc>'), 'draft sitemap is empty');
  const noOrigin = emit.sitemapDocument({ siteUrl: '', seo: live, pages, langs: ['en', 'es', 'fr'], preview: false });
  assert(noOrigin.count === 0, 'no sitemap URLs without SITE_URL');

  const draftRobots = emit.robotsTxt(draft, 'https://example.com');
  assert(/^Disallow: \/$/m.test(draftRobots), 'draft robots blocks the site');
  assert(!draftRobots.includes('Sitemap:'), 'draft robots does not advertise a host');
  const liveRobots = emit.robotsTxt(live, 'https://example.com');
  assert(liveRobots.includes('Disallow: /probador/'), 'try-on stays out of crawl when published');
  assert(liveRobots.includes('Sitemap: https://example.com/sitemap.xml'), 'sitemap URL');
  assert(!/^Disallow: \/$/m.test(liveRobots), 'publish mode does not block the whole site');

  const known = new Set(['home', 'scienceArticle']);
  validate.assertRegistry({
    version: 1,
    languages: ['es', 'en', 'fr'],
    keywords: [],
    clusters: [],
    categories: [],
    schemaTypes: [],
    images: [],
    editorial: [],
    claims: []
  }, known);
  let bare = false;
  try {
    validate.assertRegistry({
      version: 1,
      languages: ['es', 'en', 'fr'],
      keywords: [],
      clusters: [],
      categories: [],
      schemaTypes: [],
      images: [],
      editorial: [],
      claims: [{ kind: 'confirmed', statement: 'Unstated sensor range' }]
    }, known);
  } catch (e) { bare = /https source/.test(e.message); }
  assert(bare, 'confirmed claims need a source');
  let hypothesis = false;
  try {
    validate.assertRegistry({
      version: 1,
      languages: ['es', 'en', 'fr'],
      keywords: [],
      clusters: [],
      categories: [],
      schemaTypes: [],
      images: [],
      editorial: [],
      claims: [{ kind: 'hypothesis', statement: 'Maybe', publishable: true }]
    }, known);
  } catch (e) { hypothesis = /cannot be publishable/.test(e.message); }
  assert(hypothesis, 'hypothesis is not publishable');
  let invented = false;
  try {
    validate.assertRegistry({
      version: 1,
      languages: ['es', 'en', 'fr'],
      keywords: [{ pageId: 'tienda' }],
      clusters: [],
      categories: [],
      schemaTypes: [],
      images: [],
      editorial: [],
      claims: []
    }, known);
  } catch (e) { invented = /not a real page/.test(e.message); }
  assert(invented, 'registry cannot name a missing page');

  policy.assertConfig(policy.normalize({
    pages: { home: { provisional: true, index: false, follow: true, exclude: true } }
  }), [{ id: 'home', file: 'index.html' }]);
  let both = false;
  try {
    policy.assertConfig(policy.normalize({
      pages: { home: { provisional: false, index: true, follow: true, exclude: true } }
    }), [{ id: 'home', file: 'index.html' }]);
  } catch (e) { both = /excluded and indexable/.test(e.message); }
  assert(both, 'exclude and index conflict');

  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'igo-seo-'));
  fs.mkdirSync(path.join(dir, 'vision'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'science'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '');
  fs.writeFileSync(path.join(dir, 'vision', 'index.html'), '');
  fs.writeFileSync(path.join(dir, 'science', 'article.html'), '');
  const found = policy.discoverPages(dir, ['index.html']);
  assert(found.length === 1 && found[0].file === 'vision/index.html' && found[0].id === 'vision', 'discover only real index.html routes');
  fs.rmSync(dir, { recursive: true, force: true });
}

function source() {
  const ids = pageIdsFromBuild();
  const site = JSON.parse(fs.readFileSync(path.join(SCRIPTS, 'site.json'), 'utf8'));
  const seo = policy.normalize(site.seo);
  const keys = Object.keys(seo.pages);
  ids.forEach((id) => assert(keys.includes(id), 'site.json missing seo.pages.' + id));
  ['scienceLibrary', 'scienceArticle'].forEach((id) => assert(keys.includes(id), 'site.json missing seo.pages.' + id));
  keys.forEach((key) => assert(ids.includes(key) || key === 'scienceLibrary' || key === 'scienceArticle', 'unknown seo page ' + key));
  const pages = ids.map((id) => ({ id, file: id + '/index.html' }));
  pages.push({ id: 'scienceLibrary', file: 'science/library/index.html' });
  policy.assertConfig(seo, pages);
  const registry = validate.loadRegistry(path.join(__dirname, 'registry.json'));
  validate.assertRegistry(registry, new Set(ids.concat(['scienceLibrary', 'scienceArticle'])));
  assert(registry.claims.length === 0, 'registry must not ship claims in this phase');
  assert(registry.keywords.length === 0 && registry.clusters.length === 0, 'registry slots stay empty');
  JSON.parse(fs.readFileSync(path.join(__dirname, 'registry.schema.json'), 'utf8'));

  const templates = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) templates.push(full);
    });
  })(path.join(WEB, 'src'));
  assert(templates.length > 0, 'no templates');
  templates.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(WEB, file);
    assert(html.includes('content="{{robots}}"'), rel + ' must take robots from the build');
    assert(!html.includes('noindex, nofollow'), rel + ' still hardcodes robots');
  });
}

function dist() {
  const site = JSON.parse(fs.readFileSync(path.join(SCRIPTS, 'site.json'), 'utf8'));
  const seo = policy.normalize(site.seo);
  const robots = fs.readFileSync(path.join(WEB, 'dist', 'robots.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(WEB, 'dist', 'sitemap.xml'), 'utf8');
  const home = fs.readFileSync(path.join(WEB, 'dist', 'en', 'index.html'), 'utf8');
  const hub = fs.readFileSync(path.join(WEB, 'dist', 'index.html'), 'utf8');
  ['en', 'es', 'fr', 'x-default'].forEach((code) => assert(home.includes('hreflang="' + code + '"'), 'missing hreflang ' + code));
  assert(home.includes('property="og:title"') && home.includes('property="og:description"') && home.includes('property="og:image"'), 'Open Graph');
  assert(home.includes('name="twitter:card"') && home.includes('name="twitter:image"'), 'Twitter card');
  assert((home.match(/<h1[\s>]/g) || []).length === 1, 'home keeps a single h1');
  assert(!home.includes('"@type"'), 'home has no JSON-LD in this phase');
  assert(hub.includes('<title>IGO</title>'), 'hub title');
  assert(hub.includes('name="robots" content="noindex, follow"'), 'hub robots');
  if (!site.siteUrl && !process.env.SITE_URL) {
    assert(home.includes('rel="canonical" href="index.html"'), 'draft canonical stays relative');
    assert(!/property="og:url"/.test(home), 'og:url waits for SITE_URL');
    assert(hub.includes('hreflang="x-default" href="index.html"'), 'hub x-default is the selector');
  }
  if (!seo.publish) {
    assert(/^Disallow: \/$/m.test(robots), 'dist robots is draft');
    assert(!robots.includes('Sitemap:'), 'dist robots has no sitemap host');
    assert(!sitemap.includes('<loc>'), 'dist sitemap has no URLs');
    assert(!/tienda|\/blog\/|opiniones|vision\/sport/.test(sitemap), 'sitemap invented a route');
    assert(home.includes('name="robots" content="noindex, follow"'), 'provisional pages are noindex, follow');
  }
}

try {
  unit();
  source();
  if (process.argv.includes('--dist')) dist();
  console.log('PASS seo check' + (process.argv.includes('--dist') ? ' (dist)' : ''));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
