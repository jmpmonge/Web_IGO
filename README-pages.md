# IGO — páginas internas (provisionales)

Rutas estáticas como carpetas, para que funcionen en un servidor (`/vision/`) y abriendo el fichero (`file://…/vision/index.html`):

- `index.html` — Home (no se modifica desde aquí)
- `vision/index.html`, `wellness/index.html`, `technology/index.html`, `about/index.html`

Cada página interna:
- Carga `assets/igo.css` (sistema de la Home) y después `assets/igo-pages.css` (solo reglas de páginas internas, con ámbito `body.page`).
- Usa `assets/igo.js` sin cambios (menú móvil, Escape, cierre al cambiar de tamaño).
- Repite la misma cabecera y pie que la Home. Enlaces con `../<página>/index.html` (rutas relativas explícitas para `file://`) y `aria-current="page"` en la página activa. El logo apunta a `../index.html`.
- El contenido es provisional: solo textos ya aprobados en la especificación de la Home y marcadores rotulados.

Al cambiar la cabecera o el pie, actualizar las cinco páginas (no hay plantillas ni build).
Integración pendiente de la navegación de la Home: `proposals/home-nav-links.patch`.
