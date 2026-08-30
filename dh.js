/*
 * Static ad loader.
 * No Cloudflare Pages Functions are required.
 * Configuration is kept in ads.json.
 */
(function () {
  'use strict';

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  // Preserve the previous mobile-only behavior.
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '')) return;

  var CONFIG_URL = 'https://ggads-24k.pages.dev/ads.json';
  var CONFIG_CACHE_KEY = '__ggads_config_v1';
  var DEFAULT_CONFIG = { version: 1, roundSeconds: 60, ads: [] };

  function normalizeConfig(config) {
    if (!config || typeof config !== 'object') return DEFAULT_CONFIG;
    var ads = Array.isArray(config.ads) ? config.ads : [];
    return {
      version: Number(config.version) || 1,
      roundSeconds: Math.max(1, Number(config.roundSeconds) || 60),
      ads: ads.filter(function (ad) {
        return ad && ad.enabled !== false && ad.id != null && ad.url;
      }).map(function (ad) {
        return {
          id: String(ad.id),
          url: String(ad.url),
          weight: Math.max(0, Number(ad.weight) || 0)
        };
      })
    };
  }

  function readCachedConfig() {
    try {
      var cached = JSON.parse(localStorage.getItem(CONFIG_CACHE_KEY) || 'null');
      if (cached && cached.config) return normalizeConfig(cached.config);
    } catch (_) {}
    return null;
  }

  function saveCachedConfig(config) {
    try {
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ time: Date.now(), config: config }));
    } catch (_) {}
  }

  function fetchConfig(done) {
    var cached = readCachedConfig();
    if (cached) {
      done(cached);
      return;
    }

    fetch(CONFIG_URL, { method: 'GET', mode: 'cors', cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('config http ' + response.status);
        return response.json();
      })
      .then(function (config) {
        config = normalizeConfig(config);
        saveCachedConfig(config);
        done(config);
      })
      .catch(function () {
        done(DEFAULT_CONFIG);
      });
  }

  function readState(key, roundMs) {
    try {
      var state = JSON.parse(localStorage.getItem(key) || 'null');
      if (state && Array.isArray(state.visited) && Date.now() - Number(state.time) < roundMs) return state;
    } catch (_) {}
    return { visited: [], time: Date.now() };
  }

  function saveState(key, state) {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {}
  }

  function pickWeighted(list) {
    if (!list.length) return null;
    var total = list.reduce(function (sum, ad) {
      return sum + Math.max(0, Number(ad.weight) || 0);
    }, 0);
    if (!total) return list[Math.floor(Math.random() * list.length)];

    var random = Math.random() * total;
    for (var i = 0; i < list.length; i++) {
      random -= Math.max(0, Number(list[i].weight) || 0);
      if (random < 0) return list[i];
    }
    return list[list.length - 1];
  }

  function loadScript(url, id, onDone) {
    var script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-ggads-id', id);
    script.onload = function () { if (onDone) onDone(); };
    script.onerror = function () { if (onDone) onDone(); };
    (document.head || document.documentElement).appendChild(script);
  }

  function loadHistats() {
    if (window.__ggads_histats_loaded) return;
    window.__ggads_histats_loaded = true;

    var _Hasync = window._Hasync = window._Hasync || [];
    _Hasync.push(['Histats.start', '1,4757866,4,0,0,0,00010000']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = '//s10.histats.com/js15_as.js';
    (document.head || document.documentElement).appendChild(script);
  }

  fetchConfig(function (config) {
    var ads = config.ads;
    if (!ads.length) return;

    var storageKey = '__ggads_rotation_v' + config.version;
    var roundMs = config.roundSeconds * 1000;
    var state = readState(storageKey, roundMs);
    var available = ads.filter(function (ad) {
      return state.visited.indexOf(ad.id) === -1;
    });

    if (!available.length) {
      state.visited = [];
      state.time = Date.now();
      available = ads.slice();
    }

    var selected = pickWeighted(available);
    if (!selected) return;

    state.visited.push(selected.id);
    saveState(storageKey, state);
    loadScript(selected.url, selected.id, loadHistats);
  });
}());
