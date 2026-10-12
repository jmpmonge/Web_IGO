# IGO

Static multilingual website: https://jmpmonge.github.io/Web_IGO/

## Build and verify

Requires Node.js 22 and Python 3. No third-party build dependencies.

```sh
node scripts/build.js
python3 scripts/verify.py
python3 -m http.server 8080 --directory dist
```

- `src/`: Home and Products templates.
- `locales/`: English, Spanish and French translations.
- `vision/`, `wellness/`, `technology/`, `about/`: existing English pages, copied by the build.
- `assets/`: only the resources used by the website.
- `dist/`: generated website; not committed.
- `scripts/site.json`: public base URL for canonical and hreflang links.

GitHub Actions validates each push and pull request to `main`. Successful pushes to `main` publish only `dist/` through GitHub Pages. In repository settings, Pages uses GitHub Actions.

Home and Products are translated into ES/EN/FR. The other four pages currently retain their original English content.

Initial sources taken from the verified IGO snapshot `426de90` (branch `igo-home`). This independent repository does not alter the Seivol site or its repository.
