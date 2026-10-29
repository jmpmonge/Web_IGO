'use strict';
/* IGOExperiences — review data for the home.
   scripts/experiences.json holds the entries. mode "mock" publishes only entries
   marked mock (a layout preview). mode "live" publishes only approved entries
   and ignores the mock. A language with nothing to show gets no section. */
const fs = require('fs');
const path = require('path');

const PRODUCTS = ['vision', 'wellness'];
/* Product photo used when a review has no image of its own. Not a commercial model name. */
const PRODUCT_IMAGE = {
  vision: 'assets/images/images_igo/card_vision-600.webp',
  wellness: 'assets/images/images_igo/anillo_recorte-600.webp'
};

function load() {
  const file = path.join(__dirname, 'experiences.json');
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error('experiences.json: ' + e.message); }
  if (!data || !Array.isArray(data.reviews)) throw new Error('experiences.json: "reviews" must be an array');
  if (data.mode !== 'mock' && data.mode !== 'live') throw new Error('experiences.json: mode must be "mock" or "live"');
  if (data.motion != null && data.motion !== 'auto' && data.motion !== 'manual') throw new Error('experiences.json: motion must be "auto" or "manual"');
  return data;
}

function localized(value, lang, where) {
  if (value == null) return '';
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error(where + ': expected an object with es, en and fr');
  if (!Object.prototype.hasOwnProperty.call(value, lang) || value[lang] == null || value[lang] === '') return '';
  if (typeof value[lang] !== 'string') throw new Error(where + ': ' + lang + ' must be a string');
  const text = value[lang].trim();
  if (!text) return '';
  if (/[<>]|{{|}}/.test(text)) throw new Error(where + ': HTML is not allowed');
  return text;
}

function assertAsset(webRoot, rel, where) {
  if (typeof rel !== 'string' || !/^assets\/[A-Za-z0-9_./-]+$/.test(rel) || rel.indexOf('..') !== -1) {
    throw new Error(where + ': image must be a path under assets/');
  }
  const root = path.resolve(webRoot);
  const abs = path.resolve(root, rel);
  if (abs !== root && abs.indexOf(root + path.sep) !== 0) throw new Error(where + ': image escapes the site');
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(where + ': image not found: ' + rel);
  return rel;
}

function validate(review, index, lang, ctx, seen) {
  const where = 'experiences.json reviews[' + index + ']';
  if (!review || typeof review !== 'object') throw new Error(where + ': expected an object');
  if (typeof review.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(review.id)) throw new Error(where + ': invalid id');
  if (seen.has(review.id)) throw new Error(where + ': duplicate id ' + review.id);
  if (PRODUCTS.indexOf(review.product) === -1) throw new Error(where + ': product must be vision or wellness');
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) throw new Error(where + ': rating must be an integer from 1 to 5');
  const title = localized(review.title, lang, where + ' title');
  const text = localized(review.text, lang, where + ' text');
  if (!title || !text) return null;
  if (title.length > 200) throw new Error(where + ': title is too long');
  if (text.length > 1200) throw new Error(where + ': text is too long');
  if (typeof review.author !== 'string' || !review.author.trim() || review.author.trim().length > 80 || /[<>]/.test(review.author)) {
    throw new Error(where + ': author must be a public name');
  }
  if (typeof review.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(review.date)) throw new Error(where + ': date must be YYYY-MM-DD');
  const parts = review.date.split('-').map(Number);
  const stamp = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (stamp.getUTCFullYear() !== parts[0] || stamp.getUTCMonth() !== parts[1] - 1 || stamp.getUTCDate() !== parts[2]) {
    throw new Error(where + ': invalid date');
  }
  if (typeof review.source !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(review.source)) throw new Error(where + ': invalid source');
  let sourceName;
  try { sourceName = ctx.t(lang, 'home.experiences.sources.' + review.source); }
  catch (e) { throw new Error(where + ': unknown source "' + review.source + '"'); }
  if (typeof review.verifiedPurchase !== 'boolean') throw new Error(where + ': verifiedPurchase must be true or false');
  let modelId = '';
  if (review.modelId != null && review.modelId !== '') {
    if (typeof review.modelId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(review.modelId)) throw new Error(where + ': invalid modelId');
    modelId = review.modelId;
  }
  /* modelName is the commercial name. Empty or absent falls back to the product line. Never both. */
  let modelName = '';
  if (review.modelName != null && review.modelName !== '') {
    modelName = localized(review.modelName, lang, where + ' modelName');
  }
  let sourceUrl = '';
  if (review.sourceUrl != null && review.sourceUrl !== '') {
    if (typeof review.sourceUrl !== 'string' || !/^https:\/\/[^\s<>"]+$/.test(review.sourceUrl)) throw new Error(where + ': sourceUrl must be an https URL');
    sourceUrl = review.sourceUrl;
  }
  let image = '';
  let imageAlt = '';
  if (review.image != null && review.image !== '') {
    image = assertAsset(ctx.webRoot, review.image, where);
    imageAlt = localized(review.imageAlt, lang, where + ' imageAlt');
    if (!imageAlt) throw new Error(where + ': imageAlt.' + lang + ' is required when an image is set');
  }
  seen.add(review.id);
  return {
    id: review.id,
    product: review.product,
    rating: review.rating,
    title: title,
    text: text,
    author: review.author.trim(),
    date: review.date,
    sourceName: sourceName,
    verifiedPurchase: review.verifiedPurchase,
    sourceUrl: sourceUrl,
    image: image,
    imageAlt: imageAlt,
    modelId: modelId,
    modelName: modelName
  };
}

function collect(data, lang, ctx) {
  const wantMock = data.mode === 'mock';
  const seen = new Set();
  const out = [];
  data.reviews.forEach((review, index) => {
    const isMock = !!(review && review.mock === true);
    const isLive = !!(review && review.approved === true && review.mock !== true);
    if (wantMock ? !isMock : !isLive) return;
    const item = validate(review, index, lang, ctx, seen);
    if (item) out.push(item);
  });
  return out;
}

function stars(rating) {
  const path = 'M8 1.4l1.55 3.55 3.85.35-2.95 2.55.9 3.8L8 9.85 4.65 11.65l.9-3.8L2.6 5.3l3.85-.35z';
  let html = '<span class="xcard__stars" aria-hidden="true">';
  for (let i = 1; i <= 5; i++) {
    html += '<svg class="xcard__star' + (i <= rating ? ' is-on' : '') + '" viewBox="0 0 16 16" focusable="false"><path d="' + path + '"/></svg>';
  }
  return html + '</span>';
}

function shortDate(lang, iso) {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(iso + 'T12:00:00Z'))
    .replace(/\u00a0/g, ' ');
}

function renderCard(review, lang, ctx, mode) {
  const pattern = ctx.t(lang, 'home.experiences.rating');
  if (pattern.indexOf('{n}') === -1) throw new Error('home.experiences.rating must include {n}');
  const ratingLabel = pattern.replace(/\{n\}/g, String(review.rating));
  const line = ctx.t(lang, 'home.experiences.products.' + review.product);
  const label = review.modelName || line;
  const dateText = shortDate(lang, review.date);
  const imagePath = review.image || PRODUCT_IMAGE[review.product];
  assertAsset(ctx.webRoot, imagePath, 'experiences product image');
  const imageAlt = review.image
    ? review.imageAlt
    : ctx.t(lang, 'home.experiences.products.' + review.product + 'Alt');
  const modelAttr = review.modelId ? ' data-model-id="' + ctx.esc(review.modelId) + '"' : '';
  /* A mock cannot claim a verified purchase. The flag stays in the data for a later live review. */
  const verified = mode === 'live' && review.verifiedPurchase
    ? '<span class="xcard__verified">' + ctx.esc(ctx.t(lang, 'home.experiences.verified')) + '</span>'
    : '';
  return '<li class="xcard"><article class="xcard__body" data-experience="' + ctx.esc(review.id) + '" data-product-line="' + ctx.esc(review.product) + '"' + modelAttr + '>'
    + '<figure class="xcard__media"><img src="' + ctx.esc(ctx.assetRoot + imagePath) + '" alt="' + ctx.esc(imageAlt) + '" width="600" height="600" loading="lazy" decoding="async"></figure>'
    + '<div class="xcard__copy">'
    + '<p class="xcard__product">' + ctx.esc(label) + '</p>'
    + '<p class="xcard__rating">' + stars(review.rating)
    + '<span class="visually-hidden">' + ctx.esc(ratingLabel) + '</span></p>'
    + '<h3 class="xcard__title">' + ctx.esc(review.title) + '</h3>'
    + '<p class="xcard__text">' + ctx.esc(review.text) + '</p>'
    + '<p class="xcard__by"><span class="xcard__author">' + ctx.esc(review.author) + '</span>'
    + '<span class="xcard__sep" aria-hidden="true">·</span>'
    + '<time datetime="' + review.date + '">' + ctx.esc(dateText) + '</time>'
    + verified
    + '</p></div></article></li>';
}

function prepareFrom(data, lang, ctx) {
  const items = collect(data, lang, ctx);
  if (!items.length) return null;
  return {
    html: items.map((review) => renderCard(review, lang, ctx, data.mode)).join(''),
    note: data.mode === 'mock',
    motion: data.motion === 'manual' ? 'manual' : 'auto'
  };
}

function prepare(lang, ctx) {
  return prepareFrom(load(), lang, ctx);
}

module.exports = { prepare, prepareFrom, load };
