'use strict';
/* sitemap.xml and robots.txt. URLs are absolute and only exist when SITE_URL is set.
   noindex and provisional pages are omitted. No route is added unless the build emitted it. */
const fs = require('fs');
const path = require('path');
const policy = require('./policy');

function pageUrl(siteUrl, lang, file) {
  const origin = String(siteUrl || '').replace(/\/+$/, '');
  return origin + '/' + lang + '/' + String(file).replace(/index\.html$/, '');
}

function langHref(file, code) {
  const depth = String(file).split('/').length - 1;
  return '../'.repeat(depth + 1) + code + '/' + file;
}

function hubHref(file, siteUrl) {
  if (siteUrl) return String(siteUrl).replace(/\/+$/, '') + '/';
  const depth = String(file).split('/').length - 1;
  return '../'.repeat(depth + 1) + 'index.html';
}

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function collectUrls(opts) {
  const seo = opts.seo;
  const siteUrl = opts.siteUrl;
  if (!seo || seo.publish !== true || !siteUrl) return [];
  const urls = [];
  const xDefault = String(siteUrl).replace(/\/+$/, '') + '/';
  opts.pages.forEach((page) => {
    if (!policy.isIndexable(seo, page, { preview: opts.preview })) return;
    opts.langs.forEach((lang) => {
      urls.push({
        loc: pageUrl(siteUrl, lang, page.file),
        alternates: opts.langs.map((code) => ({ lang: code, href: pageUrl(siteUrl, code, page.file) })),
        xDefault
      });
    });
  });
  return urls;
}

function sitemapXml(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
  ];
  if (!urls.length) lines.push('  <!-- No indexable URLs. Provisional and noindex pages are omitted. -->');
  urls.forEach((url) => {
    lines.push('  <url>');
    lines.push('    <loc>' + xmlEscape(url.loc) + '</loc>');
    url.alternates.forEach((alt) => {
      lines.push('    <xhtml:link rel="alternate" hreflang="' + xmlEscape(alt.lang) + '" href="' + xmlEscape(alt.href) + '"/>');
    });
    lines.push('    <xhtml:link rel="alternate" hreflang="x-default" href="' + xmlEscape(url.xDefault) + '"/>');
    lines.push('  </url>');
  });
  lines.push('</urlset>');
  lines.push('');
  return lines.join('\n');
}

function robotsTxt(seo, siteUrl) {
  if (!seo || seo.publish !== true) {
    return '# Draft build. Indexing stays off until seo.publish is true and SITE_URL is set.\nUser-agent: *\nDisallow: /\n';
  }
  let text = 'User-agent: *\nAllow: /\nDisallow: /probador/\n';
  if (siteUrl) text += '\nSitemap: ' + String(siteUrl).replace(/\/+$/, '') + '/sitemap.xml\n';
  return text;
}

function sitemapDocument(opts) {
  const urls = collectUrls(opts);
  return { xml: sitemapXml(urls), count: urls.length };
}

function writeArtifacts(opts) {
  const doc = sitemapDocument(opts);
  fs.mkdirSync(opts.dist, { recursive: true });
  fs.writeFileSync(path.join(opts.dist, 'sitemap.xml'), doc.xml);
  fs.writeFileSync(path.join(opts.dist, 'robots.txt'), robotsTxt(opts.seo, opts.siteUrl));
  return doc;
}

module.exports = { pageUrl, langHref, hubHref, collectUrls, sitemapXml, robotsTxt, sitemapDocument, writeArtifacts };
