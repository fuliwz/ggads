# GGADS loading notes

- Keep the GGADS loader in the document head with `async`; do not wait for DOMContentLoaded or window load.
- The selected ad script is served locally from the same Cloudflare Pages deployment: `/shang.js` or `/xia.js`.
- Preserve the existing 50/50 weighted random rotation, 60-second browser-side rotation state, and one fallback after a definitive network error only.
- A timeout is ambiguous and does not trigger a second provider, to avoid two ad scripts executing late.
- Histats remains enabled and independently scheduled through requestIdleCallback (with a setTimeout fallback).
- Script `load` does not prove that an ad creative rendered or was viewable.
- Diagnostics are local only and do not transmit user data.
