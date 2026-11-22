/* GGADS source loader. Build step embeds config and publishes only dist/. */
(function () {
  "use strict";

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  /* Keep execution limited to mobile traffic as configured by the project. */
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "")) return;

  var STATIC_CONFIG = {"version":4,"roundSeconds":60,"requestTimeoutMs":8000,"maxFallbacks":1,"ads":[{"id":"gg","name":"GG","url":"https://fyb.pages.dev/gg.js","weight":50,"enabled":true},{"id":"td","name":"TD","url":"https://fyb.pages.dev/td.js","weight":50,"enabled":true}]};

  var REQUEST_TIMEOUT_MS = Math.max(4000, Number(STATIC_CONFIG.requestTimeoutMs) || 8000);
  var MAX_FALLBACKS = Math.max(0, Number(STATIC_CONFIG.maxFallbacks) || 1);

  function weightedPick(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += Math.max(0, Number(items[i].weight) || 0);
    if (!total) return items[Math.floor(Math.random() * items.length)];
    var random = Math.random() * total;
    for (var j = 0; j < items.length; j++) {
      random -= Math.max(0, Number(items[j].weight) || 0);
      if (random < 0) return items[j];
    }
    return items[items.length - 1];
  }

  function scheduleHistats() {
    if (window.__ggads_histats_scheduled || window.__ggads_histats_loaded) return;
    window.__ggads_histats_scheduled = true;
    var run = function () {
      if (window.__ggads_histats_loaded) return;
      window.__ggads_histats_loaded = true;
      var h = window._Hasync = window._Hasync || [];
      h.push(["Histats.start", "1,4757866,4,0,0,0,00010000"]);
      h.push(["Histats.fasi", "1"]);
      h.push(["Histats.track_hits", ""]);
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://s10.histats.com/js15_as.js";
      (document.head || document.documentElement).appendChild(s);
    };
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2000 });
    else window.setTimeout(run, 1000);
  }

  function recordResult(result) {
    window.__ggads_last_result = result;
    try { localStorage.setItem("__ggads_last_result_v1", JSON.stringify(result)); } catch (_) {}
    try {
      if (typeof window.CustomEvent === "function") window.dispatchEvent(new CustomEvent("ggads:result", { detail: result }));
    } catch (_) {}
  }

  function getNetworkInfo() {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return {};
    return {
      effectiveType: connection.effectiveType || null,
      downlink: typeof connection.downlink === "number" ? connection.downlink : null,
      rtt: typeof connection.rtt === "number" ? connection.rtt : null,
      saveData: !!connection.saveData
    };
  }

  var config = typeof STATIC_CONFIG === "object" ? STATIC_CONFIG : null;
  if (!config || !Array.isArray(config.ads)) return;
  var ads = config.ads.filter(function (ad) { return ad && ad.enabled !== false && typeof ad.url === "string" && ad.url; });
  if (!ads.length) return;

  var version = Number(config.version) || 1;
  var roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);
  var rotationKey = "__ggads_rotation_v" + version;
  var state;
  try { state = JSON.parse(localStorage.getItem(rotationKey) || "null"); } catch (_) { state = null; }
  if (!state || !Array.isArray(state.visited) || Date.now() - Number(state.time) >= roundSeconds * 1000) state = { visited: [], time: Date.now() };

  var candidates = ads.filter(function (ad) { return state.visited.indexOf(ad.id) < 0; });
  if (!candidates.length) { state = { visited: [], time: Date.now() }; candidates = ads.slice(); }
  var ordered = [];
  while (candidates.length) {
    var next = weightedPick(candidates);
    if (!next) break;
    ordered.push(next);
    candidates.splice(candidates.indexOf(next), 1);
  }
  if (!ordered.length) return;

  scheduleHistats();
  var startedAt = Date.now();
  var attempts = [];
  var index = 0;
  var completed = false;
  var loadedElement = null;
  var visibilityTimer = null;

  function persistRotation(ad) {
    if (state.visited.indexOf(ad.id) < 0) state.visited.push(ad.id);
    try { localStorage.setItem(rotationKey, JSON.stringify(state)); } catch (_) {}
  }

  function finish(status, ad) {
    if (completed) return;
    completed = true;
    if (visibilityTimer) window.clearTimeout(visibilityTimer);
    recordResult({
      status: status,
      adId: ad ? ad.id : null,
      attempts: attempts,
      durationMs: Date.now() - startedAt,
      timestamp: Date.now(),
      page: location.pathname || "/",
      host: location.hostname || "",
      userAgent: navigator.userAgent || "",
      network: getNetworkInfo()
    });
  }

  function loadNext() {
    if (completed) return;
    if (index >= ordered.length || attempts.length > MAX_FALLBACKS) { finish("failed", null); return; }
    var ad = ordered[index++];
    persistRotation(ad);
    var attempt = { id: ad.id, status: "loading", startedAt: Date.now() };
    attempts.push(attempt);
    var script = document.createElement("script");
    var settled = false;
    var timer = window.setTimeout(function () { settle("timeout"); }, REQUEST_TIMEOUT_MS);

    function settle(status) {
      if (settled || completed) return;
      settled = true;
      window.clearTimeout(timer);
      attempt.status = status;
      attempt.durationMs = Date.now() - attempt.startedAt;
      if (status === "loaded") {
        loadedElement = script;
        // A brief observation window captures immediate provider runtime errors.
        // It is not a guarantee that a creative rendered or became viewable.
        visibilityTimer = window.setTimeout(function () { finish("loaded", ad); }, 500);
        return;
      }
      if (status === "error") {
        if (script.parentNode) script.parentNode.removeChild(script);
        loadNext();
        return;
      }
      // A timed-out script may execute late; don't inject another provider.
      finish("timeout", ad);
    }

    script.src = ad.url;
    script.async = true;
    script.type = "text/javascript";
    script.setAttribute("data-ggads-id", ad.id);
    script.onload = function () { settle("loaded"); };
    script.onerror = function () { settle("error"); };
    (document.head || document.documentElement).appendChild(script);
  }

  window.addEventListener("error", function (event) {
    if (completed || !loadedElement || !event.filename) return;
    if (event.filename.indexOf(loadedElement.src) === 0) {
      var latest = attempts[attempts.length - 1];
      if (latest) latest.runtimeError = String(event.message || "script error").slice(0, 180);
    }
  });

  loadNext();
})();