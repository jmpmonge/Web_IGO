'use strict';
/* CSS bundling for the IGO static build. No dependencies (Node >= 18).
   Pages that load the same stylesheets and share the <body> class form one group. For each group:
     1. the stylesheets are concatenated in their original order, so the cascade does not change;
     2. rules that cannot match any element of the group are dropped. A selector is dropped only when one of its
        classes/ids appears neither in the HTML of the group nor in any script the pages load (class names set from JS
        stay safe). Tags, attributes, pseudo-classes and at-rules such as @font-face and @keyframes are always kept;
     3. the result is minified and written to dist/assets/bundle-<name>-<hash>.css, and the pages load only that file.
   Sources in assets/*.css are never modified. Use `node scripts/build.js --no-bundle` to keep the separate files. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LINK = /<link rel="stylesheet" href="((?:\.\.\/)*)(assets\/[^"]+\.css)">[ \t]*\n?/g;
const NESTED_AT = /^@(media|supports|layer|container)\b/i;

function stripComments(css) {
  let out = '', i = 0, q = null;
  while (i < css.length) {
    const c = css[i];
    if (q) { out += c; if (c === '\\') { out += css[i + 1] || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? css.length : e + 2; continue; }
    out += c; i++;
  }
  return out;
}

function parseBlocks(css) {
  const nodes = [], n = css.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    const start = i;
    let q = null, par = 0;
    for (; i < n; i++) {
      const c = css[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '(') par++; else if (c === ')') par--;
      else if ((c === '{' || c === ';') && par <= 0) break;
    }
    const prelude = css.slice(start, i).trim();
    if (i >= n) { if (prelude) nodes.push({ prelude, body: null }); break; }
    if (css[i] === ';') { nodes.push({ prelude, body: null }); i++; continue; }
    let depth = 1;
    const bodyStart = ++i;
    q = null;
    for (; i < n && depth; i++) {
      const c = css[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '{') depth++; else if (c === '}') depth--;
    }
    nodes.push({ prelude, body: css.slice(bodyStart, i - 1) });
  }
  return nodes;
}

function splitTop(s, sep) {
  const out = [];
  let d = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === '\\') cur += s[++i] || ''; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--;
    if (c === sep && d === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/* :is(a,b) / :where(a,b) become alternatives, so the unused ones can be recognised on their own. */
function expandIs(sel) {
  const m = /:(?:is|where)\(/.exec(sel);
  if (!m) return [sel];
  const open = m.index + m[0].length - 1;
  let d = 0, j = open;
  for (; j < sel.length; j++) { if (sel[j] === '(') d++; else if (sel[j] === ')') { d--; if (!d) break; } }
  const before = sel.slice(0, m.index), after = sel.slice(j + 1);
  return splitTop(sel.slice(open + 1, j), ',').flatMap((alt) => expandIs(before + alt + after));
}

function removeGroups(s, name) {            /* removes :not(...) / :has(...) with balanced parentheses (kept conservatively) */
  const re = new RegExp(':' + name + '\\(');
  let m;
  while ((m = re.exec(s))) {
    let d = 0, j = m.index + m[0].length - 1;
    for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')') { d--; if (!d) break; } }
    s = s.slice(0, m.index) + s.slice(j + 1);
  }
  return s;
}

function deadAlternative(alt, known) {
  if (alt.indexOf('\\') > -1) return false;                       /* escaped names: keep */
  let s = removeGroups(removeGroups(alt, 'not'), 'has');
  s = s.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '').replace(/\[[^\]]*\]/g, '');
  const names = [];
  s.replace(/[.#](-?[_a-zA-Z][\w-]*)/g, (m, name) => { names.push(name); return m; });
  return names.some((name) => !known.has(name));
}
const aliveSelector = (sel, known) => expandIs(sel).some((alt) => !deadAlternative(alt, known));

function pruneNodes(nodes, known, stats) {
  const out = [];
  nodes.forEach((nd) => {
    const p = nd.prelude;
    if (nd.body === null) { out.push(nd); return; }
    if (p.charAt(0) === '@') {
      if (NESTED_AT.test(p)) {
        const inner = pruneNodes(parseBlocks(nd.body), known, stats);
        if (inner.length) out.push({ prelude: p, children: inner }); else stats.dropped++;
        return;
      }
      out.push(nd);                                                 /* @font-face, @keyframes, @property… */
      return;
    }
    const keep = splitTop(p, ',').filter((s) => aliveSelector(s, known));
    if (!keep.length) { stats.dropped++; return; }
    out.push({ prelude: p, body: nd.body, selectors: keep });
  });
  return out;
}

function protect(s, store) {
  return s.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\(\s*[^)'"]*\)/g, (m) => { store.push(m); return '\u0000' + (store.length - 1) + '\u0001'; });
}
const restore = (s, store) => s.replace(/\u0000(\d+)\u0001/g, (m, i) => store[+i]);
function minBody(body) {
  const st = [];
  const s = protect(body, st).replace(/\s+/g, ' ').replace(/\s*([;:,{}!])\s*/g, '$1').replace(/;+\}/g, '}').replace(/;+$/, '').trim();
  return restore(s, st);
}
function minSel(sel) {
  const st = [];
  return restore(protect(sel, st).replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, '$1').trim(), st);
}
const minAt = (p) => { const st = []; return restore(protect(p, st).replace(/\s+/g, ' ').replace(/\s*([:,])\s*/g, '$1').trim(), st); };

function serialize(nodes) {
  return nodes.map((nd) => {
    if (nd.children) return minAt(nd.prelude) + '{' + serialize(nd.children) + '}';
    if (nd.body === null) return nd.prelude + ';';
    if (nd.prelude.charAt(0) === '@') return minAt(nd.prelude) + '{' + minBody(nd.body) + '}';
    return nd.selectors.map(minSel).join(',') + '{' + minBody(nd.body) + '}';
  }).join('');
}

function htmlNames(html) {
  const names = new Set();
  (html.match(/\sclass="[^"]*"/g) || []).forEach((a) => a.slice(8, -1).split(/\s+/).forEach((c) => c && names.add(c)));
  (html.match(/\sid="[^"]*"/g) || []).forEach((a) => names.add(a.slice(5, -1)));
  (html.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || []).forEach((s) => (s.match(/[\w-]+/g) || []).forEach((w) => names.add(w)));
  return names;
}
function scriptNames(file, root, html) {
  const names = new Set();
  (html.match(/<script[^>]*\ssrc="((?:\.\.\/)*assets\/[^"]+\.js)"/g) || []).forEach((tag) => {
    const rel = /src="(?:\.\.\/)*(assets\/[^"]+\.js)"/.exec(tag)[1];
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) return;
    const js = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    (js.match(/[\w-]+/g) || []).forEach((w) => names.add(w));
  });
  return names;
}

function bundleStyles(opts) {
  const root = opts.root, dist = opts.dist;
  const assetsOut = path.join(dist, 'assets');
  /* old bundles are removed when possible; a leftover file is harmless because no page links to it */
  if (fs.existsSync(assetsOut)) fs.readdirSync(assetsOut).filter((n) => /^bundle-.*\.css$/.test(n)).forEach((n) => { try { fs.rmSync(path.join(assetsOut, n)); } catch (e) { /* keep going */ } });

  const groups = new Map();
  opts.files.filter((f) => f.endsWith('.html')).forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const links = Array.from(html.matchAll(LINK));
    if (links.length < 2) return;
    const bodyClass = (/<body[^>]*\sclass="([^"]*)"/.exec(html) || [])[1] || '';
    const key = links.map((m) => m[2]).join('|') + '#' + bodyClass;
    if (!groups.has(key)) groups.set(key, { sheets: links.map((m) => m[2]), bodyClass, items: [] });
    groups.get(key).items.push({ file, html });
  });

  const written = [];
  groups.forEach((g) => {
    const known = new Set();
    g.items.forEach((it) => { htmlNames(it.html).forEach((n) => known.add(n)); scriptNames(it.file, root, it.html).forEach((n) => known.add(n)); });
    const stats = { dropped: 0 };
    let before = 0;
    const parts = g.sheets.map((rel) => {
      const raw = fs.readFileSync(path.join(root, rel), 'utf8');
      before += Buffer.byteLength(raw);
      const css = stripComments(raw);
      if (/@(import|charset)\b/.test(css)) throw new Error('css-bundle: @import/@charset is not supported in ' + rel);
      return serialize(pruneNodes(parseBlocks(css), known, stats));
    });
    const css = '/* IGO bundle: ' + g.sheets.map((s) => path.basename(s)).join(' + ') + ' (generated by scripts/build.js; edit assets/*.css) */\n' + parts.join('\n') + '\n';
    const slug = ((/page--([a-z0-9-]+)/.exec(g.bodyClass) || /\b(home)\b/.exec(g.bodyClass) || [])[1]) || 'site';
    const hash = crypto.createHash('sha1').update(css).digest('hex').slice(0, 8);
    const rel = 'assets/bundle-' + slug + '-' + hash + '.css';
    fs.mkdirSync(assetsOut, { recursive: true });
    fs.writeFileSync(path.join(dist, rel), css);
    g.items.forEach((it) => {
      let first = true;
      const html = it.html.replace(LINK, (m, prefix) => {
        if (!first) return '';
        first = false;
        return '<link rel="stylesheet" href="' + prefix + rel + '">\n';
      });
      fs.writeFileSync(it.file, html);
    });
    written.push({ rel, files: g.sheets.length, pages: g.items.length, before, after: Buffer.byteLength(css), dropped: stats.dropped });
  });
  return written;
}

module.exports = { bundleStyles };
