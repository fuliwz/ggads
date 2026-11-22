# GGADS

GGADS is a static Cloudflare Pages loader for the existing GG and TD JavaScript ad providers.

## Early loading integration

Add these lines as early as possible inside the publisher site's `<head>`:

```html
<link rel="preconnect" href="https://fyb.pages.dev" crossorigin>
<script async src="https://ggads-24k.pages.dev/dh.js"></script>
```

Do not use `defer`, wait for `window.onload`, or place the loader at the bottom of the page. The loader injects the selected provider script as soon as `dh.js` executes and sets high fetch priority.

GGADS keeps the required scripts:

- `https://fyb.pages.dev/gg.js`
- `https://fyb.pages.dev/td.js`

Both providers are enabled with 50/50 relative weight. Provider selection and rotation are preserved. A definite script network error may try one fallback; an ambiguous timeout does not, since the original script may still execute late.

## Important timing detail

The GG/TD provider files contain their own internal timers and then load additional provider-controlled resources. GGADS can reduce the time before the first provider request by starting earlier and preconnecting to `fyb.pages.dev`, but it cannot guarantee the provider's final creative display time. The provider-owned delays are left unchanged so their behavior is not silently altered.

The browser `load` event only means the JavaScript file arrived; it does not prove a creative rendered or was viewable.

## Diagnostics

- `window.__ggads_last_result`
- `localStorage.__ggads_last_result_v3`
- `ggads:result` custom event

The diagnostic record includes selected provider, attempt status, duration, page path, browser UA, and supported network hints. It remains local to the visitor's browser.

## Build

```bash
npm install
npm run build
```

Cloudflare Pages: build command `npm run build`, output directory `dist`.
