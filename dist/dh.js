/* GGADS local ad loader. Generated bundle source: src/dh.js */
(function () {
  "use strict";
  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  var startedAt = Date.now();
  var timeoutMs = 8000;
  var attempts = [];
  var finished = false;
  var scriptTag = document.currentScript;
  var loaderUrl = scriptTag && scriptTag.src ? scriptTag.src : new URL("dh.js", location.href).href;
  var base = new URL(".", loaderUrl).href;
  var providers = [
    { id: "gg", name: "shang", url: new URL("shang.js", base).href, weight: 50 },
    { id: "td", name: "xia", url: new URL("xia.js", base).href, weight: 50 }
  ];

  function mobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function safeGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
  }
  function networkInfo() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return {};
    return {
      effectiveType: c.effectiveType || null,
      downlink: typeof c.downlink === "number" ? c.downlink : null,
      rtt: typeof c.rtt === "number" ? c.rtt : null,
      saveData: !!c.saveData
    };
  }
  function record(status, provider) {
    if (finished) return;
    finished = true;
    var result = {
      status: status,
      adId: provider ? provider.id : null,
      attempts: attempts,
      durationMs: Date.now() - startedAt,
      timestamp: Date.now(),
      page: location.pathname || "/",
      host: location.hostname || "",
      userAgent: navigator.userAgent || "",
      network: networkInfo()
    };
    window.__ggads_last_result = result;
    safeSet("__ggads_last_result_v3", result);
    try {
      if (typeof window.CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("ggads:result", { detail: result }));
      }
    } catch (_) {}
    scheduleHistats();
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
    var pool = items.slice(), result = [];
    while (pool.length) {
      var total = pool.reduce(function (sum, item) { return sum + item.weight; }, 0);
      var n = Math.random() * total, selected = pool[pool.length - 1];
      for (var i = 0; i < pool.length; i++) {
        n -= pool[i].weight;
        if (n < 0) { selected = pool[i]; break; }
      }
      result.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }
    return result;
  }
  function providerOrder() {
    var key = "__ggads_rotation_v7";
    var state = safeGet(key);
    if (!state || !Array.isArray(state.visited) || Date.now() - Number(state.time) >= 60000) {
      state = { visited: [], time: Date.now() };
    }
    var remaining = providers.filter(function (p) { return state.visited.indexOf(p.id) < 0; });
    if (!remaining.length) {
      state = { visited: [], time: Date.now() };
      remaining = providers.slice();
    }
    var order = weightedOrder(remaining);
    if (order.length) {
      state.visited.push(order[0].id);
      safeSet(key, state);
    }
    return order;
  }
  function loadNext(order, index) {
    if (finished) return;
    if (index >= order.length || attempts.length > 1) {
      record("failed", null);
      return;
    }
    var provider = order[index];
    var attempt = { id: provider.id, status: "loading", startedAt: Date.now() };
    attempts.push(attempt);
    var s = document.createElement("script");
    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled || finished) return;
      settled = true;
      attempt.status = "timeout";
      attempt.durationMs = Date.now() - attempt.startedAt;
      // Timeout is ambiguous; do not start another provider script.
      record("timeout", provider);
    }, timeoutMs);
    function settle(status) {
      if (settled || finished) return;
      settled = true;
      window.clearTimeout(timer);
      attempt.status = status;
      attempt.durationMs = Date.now() - attempt.startedAt;
      if (status === "loaded") {
        record("script_loaded_unconfirmed", provider);
        return;
      }
      if (s.parentNode) s.parentNode.removeChild(s);
      loadNext(order, index + 1);
    }
    s.src = provider.url;
    s.async = true;
    s.type = "text/javascript";
    s.fetchPriority = "high";
    s.setAttribute("data-ggads-provider", provider.id);
    s.onload = function () { settle("loaded"); };
    s.onerror = function () { settle("error"); };
    (document.head || document.documentElement).appendChild(s);
  }

  if (!mobile()) { scheduleHistats(); return; }
  loadNext(providerOrder(), 0);
})();
