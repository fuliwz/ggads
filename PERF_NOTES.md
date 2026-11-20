# GGADS performance notes

- Keep the public loader self-contained and small; configuration belongs in config/ads.json and is embedded at build time.
- The ad loader remains asynchronous and never blocks document parsing or the page's main content.
- A page selects one weighted provider at a time. A hard network/CSP load error may advance to the next candidate; a timeout does not, because a timed-out request may still complete late and overlap a fallback ad.
- Fallback candidates are ordered by weighted random selection without replacement. The configured weight split and per-round local rotation are preserved; timeout never triggers a second provider request.
- Histats is independent of ad completion and is scheduled during browser idle time (with a timer fallback).
- The loader exposes the latest attempt result locally through window.__ggads_last_result, localStorage key __ggads_last_result_v1, and the ggads:result event. No telemetry is sent to a remote server.
- A script load event confirms that the JavaScript resource loaded; it does not guarantee that downstream creative assets rendered successfully.
- /dh.js uses a short cache lifetime so deployments and configuration changes propagate promptly.
