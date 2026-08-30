/* GGADS source loader. Build step embeds config and publishes only dist/. */
(function () {
  "use strict";

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  /* Keep execution limited to mobile traffic as configured by the project. */
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "")) return;

  /*__GGADS_CONFIG__*/

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

  function loadHistats() {
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
  }

  var config = typeof STATIC_CONFIG === "object" ? STATIC_CONFIG : null;
  if (!config || !Array.isArray(config.ads)) return;

  var ads = config.ads.filter(function (ad) {
    return ad && ad.enabled !== false && typeof ad.url === "string" && ad.url;
  });
  if (!ads.length) return;

  var version = Number(config.version) || 1;
  var roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);
  var rotationKey = "__ggads_rotation_v" + version;
  var state;

  try {
    state = JSON.parse(localStorage.getItem(rotationKey) || "null");
  } catch (_) {
    state = null;
  }

  if (!state || !Array.isArray(state.visited) || Date.now() - Number(state.time) >= roundSeconds * 1000) {
    state = { visited: [], time: Date.now() };
  }

  var candidates = ads.filter(function (ad) {
    return state.visited.indexOf(ad.id) < 0;
  });

  if (!candidates.length) {
    state = { visited: [], time: Date.now() };
    candidates = ads.slice();
  }

  var selected = weightedPick(candidates);
  if (!selected) return;

  state.visited.push(selected.id);
  try {
    localStorage.setItem(rotationKey, JSON.stringify(state));
  } catch (_) {}

  var script = document.createElement("script");
  script.src = selected.url;
  script.async = true;
  script.type = "text/javascript";
  script.setAttribute("data-ggads-id", selected.id);
  script.onload = loadHistats;
  script.onerror = loadHistats;
  (document.head || document.documentElement).appendChild(script);
})();
