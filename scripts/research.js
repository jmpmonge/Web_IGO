'use strict';
/* IGO Research content. Drafts stay out of a production build.
   Texts are structured fields; this file escapes them and builds the markup. */
const fs = require('fs');
const path = require('path');

const AREAS = ['technology', 'health-wellness', 'artificial-intelligence', 'human-science', 'innovation'];
const TYPES = ['guide', 'technology-analysis', 'evidence-review', 'insight'];
const LANGS = ['en', 'es', 'fr'];
const PICKS = ['G01', 'G02', 'G03'];

let manifest = null;
let copy = null;

function assertPlain(value, where) {
  if (/[<>]/.test(value) || /\bS\d{2}\b/.test(value)) {
    throw new Error('Research text must not contain HTML or source codes: ' + where);
  }
}

function load(root) {
  const dir = path.join(root, 'content', 'research');
  manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  copy = {};
  LANGS.forEach((code) => {
    copy[code] = JSON.parse(fs.readFileSync(path.join(dir, code + '.json'), 'utf8'));
  });
  validate();
}

function validate() {
  const ids = manifest.articles.map((a) => a.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate research ids');
  manifest.articles.forEach((article) => {
    if (!AREAS.includes(article.area)) throw new Error('bad research area: ' + article.area);
    if (!TYPES.includes(article.type)) throw new Error('bad research type: ' + article.type);
    if (!article.articleId || !/^[a-z0-9-]+$/.test(article.articleId)) throw new Error('bad articleId: ' + article.articleId);
    article.sourceIds.forEach((id) => {
      const source = manifest.sources[id];
      if (!source) throw new Error('missing source ' + id);
      if (!/^https:\/\//.test(source.url)) throw new Error('source URL must be https: ' + id);
    });
    (article.relatedIds || []).forEach((id) => {
      if (!manifest.articles.some((a) => a.id === id)) throw new Error('missing related ' + id);
    });
    LANGS.forEach((code) => {
      const text = copy[code][article.id];
      if (!text || !text.title || !text.summary || !Array.isArray(text.sections) || !text.sections.length) {
        throw new Error('Research translation missing: ' + code + ' ' + article.id);
      }
      if (text.sections.length !== copy.en[article.id].sections.length) {
        throw new Error('section count mismatch: ' + code + ' ' + article.id);
      }
      assertPlain(text.title, code + ' ' + article.id);
      assertPlain(text.summary, code + ' ' + article.id);
      (text.tags || []).forEach((tag) => assertPlain(tag, code + ' ' + article.id));
      text.sections.forEach((section) => {
        assertPlain(section.heading, code + ' ' + article.id);
        section.paragraphs.forEach((item) => assertPlain(typeof item === 'string' ? item : item.text, code + ' ' + article.id));
      });
    });
  });
}

function isVisible(article, preview) {
  if (!article || article.status === 'withdrawn') return false;
  if (preview) return article.status === 'draft' || article.status === 'in-review' || article.status === 'approved' || article.status === 'published';
  return article.status === 'published';
}

function visible(preview) {
  return manifest.articles.filter((article) => isVisible(article, preview)).sort((a, b) => a.editorialOrder - b.editorialOrder);
}

function assertFilter() {
  const sample = [
    { status: 'draft', articleId: 'fixture-draft' },
    { status: 'published', articleId: 'fixture-published' },
    { status: 'withdrawn', articleId: 'fixture-withdrawn' }
  ];
  const prod = sample.filter((article) => isVisible(article, false));
  const prev = sample.filter((article) => isVisible(article, true));
  if (prod.length !== 1 || prod[0].articleId !== 'fixture-published' || prev.length !== 2) {
    throw new Error('publication filter failed');
  }
}

function extraPages(preview) {
  const pages = [{ id: 'scienceLibrary', file: 'science/library/index.html' }];
  visible(preview).forEach((article) => {
    pages.push({
      id: 'science-' + article.articleId,
      file: 'science/' + article.articleId + '/index.html',
      template: 'science/article.html',
      articleId: article.id
    });
  });
  return pages;
}

function slugs(preview) {
  return new Set(visible(preview).map((article) => article.articleId));
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function byId(id) {
  return manifest.articles.find((article) => article.id === id);
}

function textOf(lang, article) {
  const text = copy[lang] && copy[lang][article.id];
  if (!text) throw new Error('Research translation missing at render: ' + lang + ' ' + article.id);
  return text;
}

function sourceLink(esc, id) {
  const source = manifest.sources[id];
  return '<a href="' + esc(source.url) + '" rel="noopener noreferrer">' + esc(source.title) + '</a>';
}

function paragraph(esc, item) {
  const text = typeof item === 'string' ? item : item.text;
  const sources = typeof item === 'string' ? [] : (item.sources || []);
  let html = '<p>' + esc(text);
  if (sources.length) html += ' (' + sources.map((id) => sourceLink(esc, id)).join('; ') + ')';
  return html + '</p>';
}

function countLabel(t, lang, n) {
  if (n === 0) return t(lang, 'science.ui.resultsZero');
  if (n === 1) return t(lang, 'science.ui.resultsOne');
  return t(lang, 'science.ui.resultsMany').replace('{count}', String(n));
}

function card(helpers, from, lang, article) {
  const { esc, t, link, pages } = helpers;
  const target = pages.find((page) => page.articleId === article.id);
  if (!target) return '';
  const text = textOf(lang, article);
  const href = link(from, target);
  const search = fold([text.title, text.summary].concat(text.tags || []).join(' '));
  return '<article class="research-card" data-area="' + esc(article.area) + '" data-search="' + esc(search) + '">'
    + '<p class="research-card__meta">' + esc(t(lang, 'science.ui.area.' + article.area)) + ' · ' + esc(t(lang, 'science.ui.type.' + article.type)) + '</p>'
    + '<h3><a href="' + href + '">' + esc(text.title) + '</a></h3>'
    + '<p>' + esc(text.summary) + '</p>'
    + '<p class="research-more"><a href="' + href + '">' + esc(t(lang, 'science.ui.read')) + '</a></p>'
    + '</article>';
}

function titleLink(helpers, from, lang, id) {
  const article = byId(id);
  if (!isVisible(article, helpers.preview)) return '';
  const { esc, link, pages } = helpers;
  const target = pages.find((page) => page.articleId === article.id);
  if (!target) return '';
  const text = textOf(lang, article);
  return '<p class="research-more"><a href="' + link(from, target) + '">' + esc(text.title) + '</a></p>';
}

function labeledLink(helpers, from, lang, id, key) {
  const article = byId(id);
  if (!isVisible(article, helpers.preview)) return '';
  const { esc, t, link, pages } = helpers;
  const target = pages.find((page) => page.articleId === article.id);
  if (!target) return '';
  return '<p class="research-more"><a href="' + link(from, target) + '">' + esc(t(lang, key)) + '</a></p>';
}

function banner(helpers, lang) {
  if (!helpers.preview) return '';
  return '<p class="research-preview" role="status">' + helpers.esc(helpers.t(lang, 'science.ui.preview')) + '</p>';
}

function crumbs(helpers, page, lang) {
  const { esc, t, link, pages } = helpers;
  const home = pages.find((item) => item.id === 'home');
  const science = pages.find((item) => item.id === 'science');
  const library = pages.find((item) => item.id === 'scienceLibrary');
  const items = [
    '<li><a href="' + link(page, home) + '">' + esc(t(lang, 'nav.home')) + '</a></li>',
    '<li><a href="' + link(page, science) + '">' + esc(t(lang, 'nav.science')) + '</a></li>'
  ];
  if (page.articleId) items.push('<li><a href="' + link(page, library) + '">' + esc(t(lang, 'science.ui.libraryTitle')) + '</a></li>');
  return '<nav class="research-crumbs" aria-label="' + esc(t(lang, 'science.ui.crumbs')) + '"><ol>' + items.join('') + '</ol></nav>';
}

function libraryBlock(helpers, page, lang) {
  const list = visible(helpers.preview);
  const areas = [];
  list.forEach((article) => { if (!areas.includes(article.area)) areas.push(article.area); });
  const { esc, t } = helpers;
  const options = '<option value="">' + esc(t(lang, 'science.ui.filtersAll')) + '</option>'
    + areas.map((area) => '<option value="' + esc(area) + '">' + esc(t(lang, 'science.ui.area.' + area)) + '</option>').join('');
  const cards = list.map((article) => card(helpers, page, lang, article)).join('\n');
  const n = list.length;
  return '<div class="research-library" data-research-library data-zero="' + esc(t(lang, 'science.ui.resultsZero')) + '" data-one="' + esc(t(lang, 'science.ui.resultsOne')) + '" data-many="' + esc(t(lang, 'science.ui.resultsMany')) + '">'
    + '<form class="research-tools" role="search">'
    + '<div><label for="research-q">' + esc(t(lang, 'science.ui.searchLabel')) + '</label>'
    + '<input id="research-q" type="search" name="q" placeholder="' + esc(t(lang, 'science.ui.searchPlaceholder')) + '"></div>'
    + '<div><label for="research-area">' + esc(t(lang, 'science.ui.filtersArea')) + '</label>'
    + '<select id="research-area" name="area">' + options + '</select></div>'
    + '<button type="reset">' + esc(t(lang, 'science.ui.filtersClear')) + '</button>'
    + '<p id="research-count" aria-live="polite">' + esc(countLabel(t, lang, n)) + '</p>'
    + '</form>'
    + '<p id="research-empty" class="research-empty"' + (n ? ' hidden' : '') + '>' + esc(t(lang, 'science.ui.resultsZero')) + '</p>'
    + '<div class="research-cards">' + cards + '</div></div>';
}

function articleMain(helpers, page, lang) {
  const article = byId(page.articleId);
  const text = textOf(lang, article);
  const { esc, t } = helpers;
  const body = text.sections.map((section) => {
    return '<section><h2>' + esc(section.heading) + '</h2>' + section.paragraphs.map((item) => paragraph(esc, item)).join('') + '</section>';
  }).join('\n');
  const sources = '<section class="research-sources"><h2>' + esc(t(lang, 'science.ui.sources')) + '</h2><ul>'
    + article.sourceIds.map((id) => '<li>' + sourceLink(esc, id) + '</li>').join('') + '</ul></section>';
  const related = (article.relatedIds || []).map((id) => byId(id)).filter((item) => isVisible(item, helpers.preview));
  const relatedHtml = related.length
    ? '<section class="research-related"><h2>' + esc(t(lang, 'science.ui.related')) + '</h2><div class="research-cards">'
      + related.map((item) => card(helpers, page, lang, item)).join('') + '</div></section>'
    : '';
  let jsonld = '';
  if (article.status === 'published') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: text.title,
      description: text.summary,
      inLanguage: lang
    };
    jsonld = '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
  }
  return {
    seoTitle: esc(text.title + ' | IGO Research'),
    seoDescription: esc(text.summary),
    title: esc(text.title),
    summary: esc(text.summary),
    meta: esc(t(lang, 'science.ui.area.' + article.area)) + ' · ' + esc(t(lang, 'science.ui.type.' + article.type)),
    body: body,
    sources: sources,
    related: relatedHtml,
    jsonld: jsonld
  };
}

function token(name, page, lang, helpers) {
  if (name === 'landingLibrary') {
    const articles = visible(helpers.preview);
    if (!articles.length) return '';
    const {esc, t, link, pages} = helpers;
    const target = pages.find(p => p.id === 'scienceLibrary');
    return '<section id="library" class="research-block" aria-labelledby="picks-title"><div class="wrap"><h2 id="picks-title">' + esc(t(lang, 'science.picks.title')) + '</h2><p>' + esc(t(lang, 'science.picks.text')) + '</p><div class="research-cards">' + articles.slice(0, 3).map(a => card(helpers, page, lang, a)).join('') + '</div><p class="research-more"><a href="' + link(page, target) + '">' + esc(t(lang, 'science.picks.all')) + '</a></p></div></section>';
  }

  if (name === 'banner') return banner(helpers, lang);
  if (name === 'crumbs') return crumbs(helpers, page, lang);
  if (name === 'selection') {
    return PICKS.map((id) => byId(id)).filter((article) => isVisible(article, helpers.preview)).map((article) => card(helpers, page, lang, article)).join('\n');
  }
  if (name === 'library') return libraryBlock(helpers, page, lang);
  if (name.indexOf('titleLink:') === 0) return titleLink(helpers, page, lang, name.slice(10));
  if (name.indexOf('goto:') === 0) {
    const rest = name.slice(5);
    const cut = rest.indexOf(':');
    return labeledLink(helpers, page, lang, rest.slice(0, cut), rest.slice(cut + 1));
  }
  if (!page.articleId) {
    if (name === 'seoTitle' || name === 'seoDescription' || name === 'title' || name === 'summary' || name === 'meta' || name === 'body' || name === 'sources' || name === 'related' || name === 'jsonld') return '';
  } else {
    const main = articleMain(helpers, page, lang);
    if (Object.prototype.hasOwnProperty.call(main, name)) return main[name];
  }
  throw new Error('Unknown research token: ' + name);
}

function pageMeta(page, lang) {
  if (!page.articleId) return null;
  const article = byId(page.articleId);
  const text = textOf(lang, article);
  return { title: text.title + ' | IGO Research', description: text.summary };
}

module.exports = { load, assertFilter, extraPages, slugs, token, pageMeta };
