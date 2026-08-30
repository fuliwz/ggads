/* GGADS source loader */
(function () {
  "use strict";

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "")) {
    return;
  }

  var CONFIG_URL = "../config/ads.json";
  var CACHE_KEY = "__ggads_config_v1";
  var CACHE_TTL = 6 * 60 * 60 * 1000;

  function loadConfig(done) {
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.data && Date.now() - Number(cached.time) < CACHE_TTL) {
        done(cached.data);
        return;
      }
    } catch (e) {}

    fetch(CONFIG_URL, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("config")); })
      .then(function (data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: data })); } catch (e) {}
        done(data);
      })
      .catch(function () { done(null); });
  }

  function weightedPick(items) {
    var total = 0;
    items.forEach(function (item) { total += Math.max(0, Number(item.weight) || 0); });
    if (!total) return items[Math.floor(Math.random() * items.length)];
    var r = Math.random() * total;
    for (var i = 0; i < items.length; i++) {
      r -= Math.max(0, Number(items[i].weight) || 0);
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  function loadHistats() {
    if (window.__ggads_histats_loaded) return;
    window.__ggads_histats_loaded = true;
    var h = window._Hasync = window._Hasync || [];
    h.push(["Histats.start", "1,4757866,4,0,0,0,00010000"]);
    h.push(["Histats.fasi", "1"]);
    h.push(["Histats.track_hits", ""]);
    var s = document.createElement("script");
    s.async = true;
    s.src = "//s10.histats.com/js15_as.js";
    (document.head || document.documentElement).appendChild(s);
  }

  loadConfig(function (config) {
    if (!config || !Array.isArray(config.ads)) return;

    var ads = config.ads.filter(function (ad) {
      return ad && ad.enabled !== false && ad.url;
    });
    if (!ads.length) return;

    var version = Number(config.version) || 1;
    var roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);
    var rotationKey = "__ggads_rotation_v" + version;
    var state;

    try { state = JSON.parse(localStorage.getItem(rotationKey) || "null"); } catch (e) { state = null; }
    if (!state || !Array.isArray(state.visited) || Date.now() - Number(state.time) >= roundSeconds * 1000) {
      state = { visited: [], time: Date.now() };
    }

    var candidates = ads.filter(function (ad) { return state.visited.indexOf(ad.id) < 0; });
    if (!candidates.length) {
      state = { visited: [], time: Date.now() };
      candidates = ads.slice();
    }

    var selected = weightedPick(candidates);
    if (!selected) return;

    state.visited.push(selected.id);
    try { localStorage.setItem(rotationKey, JSON.stringify(state)); } catch (e) {}

    var script = document.createElement("script");
    script.src = selected.url;
    script.async = true;
    script.type = "text/javascript";
    script.setAttribute("data-ggads-id", selected.id);
    script.onload = loadHistats;
    script.onerror = loadHistats;
    (document.head || document.documentElement).appendChild(script);
  });
})();
