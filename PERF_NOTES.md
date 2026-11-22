# GGADS loading notes

- Keep the GGADS loader in the document head with `async`; do not wait for DOMContentLoaded or window load.
- Preconnect to the shared provider origin `https://fyb.pages.dev`.
- Dynamically insert the selected provider script immediately, with async loading and high fetch priority.
- Preserve the existing GG/TD 50/50 weighted rotation and one fallback after a definitive network error only.
- A timeout is ambiguous and does not trigger a second provider, to avoid two provider scripts executing late.
- The existing GG and TD scripts contain provider-owned timers and chained external requests. Their internal behavior is not changed by this loader.
- Script `load` does not prove that an ad creative rendered or was viewable.
- Histats remains independent and is scheduled in idle time.
- Diagnostics are local only and do not transmit user data.
