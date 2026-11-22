# GGADS performance and safety notes

- Load the small GGADS loader asynchronously from the document head; do not wait for the page load event.
- Use explicit, visible `data-ggads-slot` containers and reserve their dimensions to limit layout shift.
- Establish DNS prefetch and preconnect to configured, approved HTTPS iframe origins before inserting the creative.
- Only official display-ad iframe URLs belong in provider configuration.
- Each provider iframe is sandboxed and cannot navigate the top-level page. No transparent click layers, touch interception, forced redirects, or hidden overlays are created.
- Provider selection remains weighted and is isolated per slot. Only one fallback is attempted.
- A frame timeout removes the timed-out iframe before trying the fallback. A provider can explicitly report `filled` or `empty` via the documented postMessage contract.
- The iframe `load` event alone does not prove an ad creative rendered or was viewable. A viewable candidate only means the frame was at least 50% in view for one second; it is not a billable impression.
- Local diagnostics are stored in the browser only. No remote telemetry is sent.
- Legacy `fyb.pages.dev/gg.js` and `td.js` are intentionally not invoked because their current code creates low-opacity page overlays and touch-triggered redirects.
