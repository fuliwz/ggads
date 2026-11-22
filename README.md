# GGADS

GGADS is a static Cloudflare Pages ad-slot loader. It does not use Pages Functions.

## New visible-slot integration

The loader starts asynchronously and watches for explicitly placed ad slots. It does not create transparent click layers, hijack touch events, force navigation, or inject the legacy `fyb.pages.dev/gg.js` / `td.js` scripts.

Add the connection hint and loader early in each site's `<head>`:

```html
<link rel="preconnect" href="https://ggads-24k.pages.dev" crossorigin>
<script async src="https://ggads-24k.pages.dev/dh.js"></script>
```

Add visible, reserved placements where ads should appear:

```html
<div data-ggads-slot="top-banner"></div>

<!-- Place this inside article content where an in-article ad is allowed. -->
<div data-ggads-slot="in-article"></div>
```

The loader uses a MutationObserver, so slots added later by a page template are also detected. It reserves the configured slot height to reduce layout shift. A slot is hidden when no approved provider is configured for it.

## Provider configuration

Only use official display-ad iframe URLs supplied by the ad network. Do not put the old overlay/redirect scripts in `frameUrl`.

Edit `config/ads.json`:

- `allowedFrameHosts`: exact provider hostnames permitted for embedded ads (for example, the host the ad network documents for its iframe tag).
- `ads[].frameUrl`: the provider's official HTTPS iframe URL.
- `ads[].placement`: must match a `slots[].id`.
- `weight`: relative weight for weighted rotation.
- `enabled`: keep false until the official provider embed is configured and tested.
- `requestTimeoutMs`: request deadline. A frame that does not load by this deadline is removed before the one configured fallback is attempted.

GGADS embeds each creative in a sandboxed iframe without top-navigation permission. The frame can send an optional status message to the parent:

```javascript
parent.postMessage({ type: "ggads:status", status: "filled" }, "*");
// or, when the provider confirms no ad is available:
parent.postMessage({ type: "ggads:status", status: "empty" }, "*");
```

The loader accepts messages only from the current iframe's `contentWindow`. If the provider does not support this message contract, the result is `frame_loaded_unconfirmed`: the frame document loaded, but that is not proof of a rendered or viewable creative. Do not treat this as an impression.

## Diagnostics

- `window.__ggads_last_result`
- `localStorage.__ggads_last_result_v2`
- `ggads:result` custom event

Results include slot/provider status, elapsed time, page path, browser information, and supported network hints. Data stays in the visitor's browser; GGADS does not transmit it to a server.

## Build

```bash
npm install
npm run build
```

Cloudflare Pages build command: `npm run build`; output directory: `dist`.
