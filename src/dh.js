/* GGADS early script-provider loader. Configuration is embedded at build time. */
(function () {
  "use strict";

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  /*__GGADS_CONFIG__*/

  var config = STATIC_CONFIG;

  // Always serve the bundled scripts from the same deployment as dh.js.
  var scriptTag = document.currentScript;
  var loaderUrl = scriptTag && scriptTag.src ? scriptTag.src : new URL("dh.js", location.href).href;
  var localBase = new URL(".", loaderUrl).href;
  config = Object.assign({}, config, {
    preconnect: [],
    ads: [
      { id: "gg", name: "shang", url: new URL("shang.js", localBase).href, weight: 50, enabled: true },
      { id: "td", name: "xia", url: new URL("xia.js", localBase).href, weight: 50, enabled: true }
    ]
  });

  // Resolve bundled creatives relative to the deployed loader URL.
  // "gg"/"td" IDs and weights stay stable to preserve rotation history.
  var loaderUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL("dh.js", location.href).href;
  var localBase = new URL(".", loaderUrl).href;
  config = Object.assign({}, config, {
    preconnect: [],
    ads: [
      { id: "gg", name: "shang", url: new URL("shang.js", localBase).href, weight: 50, enabled: true },
      { id: "td", name: "xia", url: new URL("xia.js", localBase).href, weight: 50, enabled: true }
    ]
  });

  // Load the bundled ad scripts from this project's own dist directory.
  // Keep the existing IDs and weights so the established random rotation
  // and per-round visitation logic remains unchanged.
  var localBase = (function () {
    var current = document.currentScript;
    if (current && current.src) return new URL(".", current.src).href;
    return new URL("./", location.href).href;
  })();

  config = Object.assign({}, config, {
    preconnect: [],
    ads: [
      { id: "gg", name: "shang", url: new URL("shang.js", localBase).href, weight: 50, enabled: true },
      { id: "td", name: "xia", url: new URL("xia.js", localBase).href, weight: 50, enabled: true }
    ]
  });
  var startedAt = Date.now();
  var timeoutMs = Math.max(3000, Number(config.requestTimeoutMs) || 8000);
  var maxFallbacks = Math.max(0, Math.min(1, Number(config.maxFallbacks) || 1));
  var attempts = [];
  var completed = false;
  var loadedScript = null;

  function safeGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function record(status, ad) {
    if (completed) return;
    completed = true;
    var result = {
      status: status,
      adId: ad ? ad.id : null,
      attempts: attempts,
      durationMs: Date.now() - startedAt,
      timestamp: Date.now(),
      page: location.pathname || "/",
      host: location.hostname || "",
      userAgent: navigator.userAgent || "",
      network: getNetworkInfo()
    };
    window.__ggads_last_result = result;
    safeSet("__ggads_last_result_v3", result);
    try {
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("ggads:result", { detail: result }));
      }
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

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  }

  if (config.mobileOnly && !isMobile()) return;

  function addConnectionHints() {
    var origins = Array.isArray(config.preconnect) ? config.preconnect : [];
    if (!document.head) return;
    var seen = {};
    origins.forEach(function (origin) {
      try {
        var url = new URL(origin);
        if (url.protocol !== "https:" || seen[url.origin]) return;
        seen[url.origin] = true;

        var dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = "//" + url.host;
        document.head.appendChild(dns);

        var link = document.createElement("link");
        link.rel = "preconnect";
        link.href = url.origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      } catch (_) {}
    });
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
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 1500);
    }
  }

  function weightedOrder(items) {
    var pool = items.slice();
    var result = [];
    while (pool.length) {
      var total = 0;
      for (var i = 0; i < pool.length; i++) total += Math.max(0, Number(pool[i].weight) || 0);
      var selected;
      if (total <= 0) {
        selected = pool[Math.floor(Math.random() * pool.length)];
      } else {
        var random = Math.random() * total;
        for (var j = 0; j < pool.length; j++) {
          random -= Math.max(0, Number(pool[j].weight) || 0);
          if (random < 0) { selected = pool[j]; break; }
        }
        if (!selected) selected = pool[pool.length - 1];
      }
      result.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }
    return result;
  }

  function getProviderOrder() {
    var ads = (config.ads || []).filter(function (ad) {
      return ad && ad.enabled !== false && typeof ad.url === "string" && ad.url;
    });
    if (!ads.length) return [];

    var key = "__ggads_rotation_v" + (Number(config.version) || 1);
    var state = safeGet(key);
    var roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);
    if (!state || !Array.isArray(state.visited) ||
        Date.now() - Number(state.time) >= roundSeconds * 1000) {
      state = { visited: [], time: Date.now() };
    }

    var remaining = ads.filter(function (ad) {
      return state.visited.indexOf(ad.id) < 0;
    });
    if (!remaining.length) {
      state = { visited: [], time: Date.now() };
      remaining = ads.slice();
    }

    var ordered = weightedOrder(remaining);
    if (ordered.length) {
      state.visited.push(ordered[0].id);
      safeSet(key, state);
    }
    return ordered;
  }

  function loadNext(order, index) {
    if (completed) return;
    if (index >= order.length || attempts.length > maxFallbacks) {
      record("failed", null);
      return;
    }

    var ad = order[index];
    var attempt = {
      id: ad.id,
      status: "loading",
      startedAt: Date.now()
    };
    attempts.push(attempt);

    var script = document.createElement("script");
    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled || completed) return;
      settled = true;
      attempt.status = "timeout";
      attempt.durationMs = Date.now() - attempt.startedAt;

      // A timeout is ambiguous: the response may still execute later.
      // Never inject a second provider after an ambiguous timeout.
      record("timeout", ad);
    }, timeoutMs);

    function settle(status) {
      if (settled || completed) return;
      settled = true;
      window.clearTimeout(timer);
      attempt.status = status;
      attempt.durationMs = Date.now() - attempt.startedAt;

      if (status === "loaded") {
        loadedScript = script;
        // onload confirms the JS resource arrived, not that a creative rendered.
        record("script_loaded_unconfirmed", ad);
        return;
      }

      if (script.parentNode) script.parentNode.removeChild(script);
      loadNext(order, index + 1);
    }

    script.src = ad.url;
    script.async = true;
    script.type = "text/javascript";
    script.fetchPriority = "high";
    script.setAttribute("data-ggads-provider", ad.id);
    script.onload = function () { settle("loaded"); };
    script.onerror = function () { settle("error"); };
    (document.head || document.documentElement).appendChild(script);
  }

  window.addEventListener("error", function (event) {
    if (completed || !loadedScript || !event.filename) return;
    if (event.filename.indexOf(loadedScript.src) === 0) {
      var latest = attempts[attempts.length - 1];
      if (latest) latest.runtimeError = String(event.message || "script error").slice(0, 180);
    }
  });

  scheduleHistats();

  var order = getProviderOrder();
  if (order.length) loadNext(order, 0);
  else record("no_provider", null);
})();
