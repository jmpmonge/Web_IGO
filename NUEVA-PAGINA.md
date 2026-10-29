# Crear una página

Trabaja solo en `igo/operaciones/web`. La página pública sale en `dist/<idioma>/…` al hacer el build. No edites `dist/`.

Una página nueva es provisional: `noindex`, fuera del sitemap, sin afirmar nada del producto. El nombre de marca sigue siendo IGO hasta que se decida otra cosa.

## 1. Plantilla

Copia `src/about/index.html` a `src/<id>/index.html`.

- `<id>` es una sola palabra en minúsculas, igual que la carpeta. Ejemplo: `src/notas/index.html` → id `notas`.
- La ruta publicada será `/en/notas/`, `/es/notas/` y `/fr/notas/`. No inventes otra.
- En el `<head>` deja `{{robots}}`, `{{<id>.meta.description}}`, `{{<id>.meta.title}}` y `{{seo}}`.
- `<body class="page page--<id>">`. Los estilos de `.page` ya cubren la página. No crees CSS.
- Un solo `<h1>`.
- Cabecera: enlaces con `{{link:home}}`, `{{link:vision}}`, etc. `aria-current="page"` solo en esta página.
- El pie de `about` tiene enlaces fijos en inglés. Sustitúyelos por `{{link:…}}` y `{{nav.…}}`, como el pie de `src/index.html`.
- Cualquier frase visible va en los tres idiomas, no escrita a mano en el HTML.

No la metas en el menú de las otras páginas salvo que se pida.

## 2. Textos

En `locales/en.json`, `locales/es.json` y `locales/fr.json`:

```json
"notas": {
  "meta": {
    "title": "Notes — IGO (provisional)",
    "description": "IGO notes. Provisional page, content pending."
  }
}
```

Traduce es y fr. Si falta una clave, el build usa el inglés y avisa.

## 3. Registro

En `scripts/build.js`, dentro de `PAGES`:

```js
{ id: 'notas', file: 'notas/index.html' }
```

En `scripts/site.json`, dentro de `seo.pages`:

```json
"notas": { "provisional": true, "index": false, "follow": true }
```

Deja `seo.publish` en `false`. No rellenes `scripts/seo/registry.json`.

Para retirar una página que ya existe, pon `"exclude": true` en su entrada. No borres la carpeta a mano en `dist/`.

## 4. Comprobar

Desde `igo/operaciones/web`:

```bash
node scripts/build.js
node scripts/seo/check.js
node scripts/seo/check.js --dist
python3 scripts/verify.py
```

El build debe listar la página en `en`, `es` y `fr`, con `publish=false` y cero URLs en el sitemap.
