# GGADS

GGADS is a static Cloudflare Pages loader. Ad provider scripts are bundled in this repository and served from the same site.

## Integration

Add the loader inside the publisher site's `<head>`:

```html
<script async src="https://ggads-24k.pages.dev/dh.js"></script>
```

Do not use `defer` or wait for `window.onload`. The loader inserts one local provider script as soon as it executes and sets high fetch priority.

## Local ad files

The loader randomly selects one of these files from the same Cloudflare Pages deployment:

- `/shang.js`
- `/xia.js`

Both have 50/50 relative weight. The existing 60-second rotation and browser-side visitation state are preserved. A definite network error may try one fallback; an ambiguous timeout does not trigger a second script because the first may still execute late.

The browser `load` event only means the JavaScript file arrived; it does not prove a creative rendered or was viewable.

## Statistics and diagnostics

Histats remains enabled and is loaded independently during idle time:

- `window._Hasync`
- `window.__ggads_histats_loaded`

GGADS diagnostics remain local to the visitor's browser:

- `window.__ggads_last_result`
- `localStorage.__ggads_last_result_v3`
- `ggads:result` custom event

The diagnostic record includes selected provider, attempt status, duration, page path, browser UA, and supported network hints.

## Build

```bash
npm install
npm run build
```

Cloudflare Pages settings: build command `npm run build`, output directory `dist`. The build checks that `dist/shang.js` and `dist/xia.js` exist before producing the loader, and it does not overwrite those ad files.
