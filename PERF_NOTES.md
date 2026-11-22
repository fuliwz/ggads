# GGADS performance notes

- Keep the public loader self-contained and asynchronous; page rendering must not wait for ad providers.
- Provider order is weighted without replacement, preserving configured distribution.
- Request timeout is configurable (default 8 seconds). A timeout is an ambiguous outcome: removing a script element does not reliably guarantee that a late response cannot execute. Therefore the loader does not inject another provider after timeout, preventing duplicate ads.
- A definite script error (for example, network failure or CSP rejection) may safely advance to one configured fallback provider.
- The default fallback limit is one. Tune requestTimeoutMs and maxFallbacks in config/ads.json, then build.
- A script load event means the JS resource loaded; it does not prove the downstream ad creative rendered or was viewable.
- Histats stays independent and is scheduled during idle time.
- Diagnostics are stored locally in window.__ggads_last_result and localStorage key __ggads_last_result_v1 and emitted as ggads:result. They contain page path, host, user agent, network hints, per-provider result and timing. No data is transmitted to any server.
- Avoid adding forced redirects, fake clicks, hidden ad placements, refresh loops, or other invalid traffic patterns. Improve revenue by reducing accidental misses and measuring legitimate viewable impressions.
