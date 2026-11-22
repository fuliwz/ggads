/* GGADS visible-slot loader. Configuration is embedded at build time. */
(function () {
  "use strict";

  if (window.__ggads_loaded) return;
  window.__ggads_loaded = true;

  /*__GGADS_CONFIG__*/

  var config = STATIC_CONFIG;
  var version = Number(config.version) || 5;
  var timeoutMs = Math.max(2500, Number(config.requestTimeoutMs) || 6000);
  var maxFallbacks = Math.max(0, Number(config.maxFallbacks) || 1);
  var startedAt = Date.now();
  var slotStates = {};
  var observer = null;

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
  }

  if (config.mobileOnly && !isMobile()) return;

  function safeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
  }

  function recordResult(result) {
    result.timestamp = Date.now();
    result.page = location.pathname || "/";
    result.host = location.hostname || "";
    result.userAgent = navigator.userAgent || "";
    result.durationMs = Date.now() - startedAt;
    window.__ggads_last_result = result;
    safeStore("__ggads_last_result_v2", result);
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

  function hostAllowed(host) {
    var allowed = Array.isArray(config.allowedFrameHosts) ? config.allowedFrameHosts : [];
    for (var i = 0; i < allowed.length; i++) {
      var entry = String(allowed[i] || "").toLowerCase();
      if (entry && (host === entry || host.slice(-(entry.length + 1)) === "." + entry)) return true;
    }
    return false;
  }

  function safeFrameUrl(provider) {
    if (!provider || typeof provider.frameUrl !== "string" || !provider.frameUrl) return null;
    try {
      var url = new URL(provider.frameUrl);
      if (url.protocol !== "https:" || !hostAllowed(url.hostname.toLowerCase())) return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function addPreconnects(providers) {
    if (!document.head) return;
    var seen = {};
    providers.forEach(function (provider) {
      var url = safeFrameUrl(provider);
      if (!url || seen[url.origin]) return;
      seen[url.origin] = true;
      var dns = document.createElement("link");
      dns.rel = "dns-prefetch";
      dns.href = "//" + url.host;
      document.head.appendChild(dns);
      var preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = url.origin;
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
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
      var script = document.createElement("script");
      script.async = true;
      script.src = "https://s10.histats.com/js15_as.js";
      (document.head || document.documentElement).appendChild(script);
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 1500);
    }
  }

  function weightedOrder(items) {
    var pool = items.slice();
    var ordered = [];
    while (pool.length) {
      var total = 0;
      for (var i = 0; i < pool.length; i++) total += Math.max(0, Number(pool[i].weight) || 0);
      var picked;
      if (total <= 0) {
        picked = pool[Math.floor(Math.random() * pool.length)];
      } else {
        var random = Math.random() * total;
        for (var j = 0; j < pool.length; j++) {
          random -= Math.max(0, Number(pool[j].weight) || 0);
          if (random < 0) { picked = pool[j]; break; }
        }
        if (!picked) picked = pool[pool.length - 1];
      }
      ordered.push(picked);
      pool.splice(pool.indexOf(picked), 1);
    }
    return ordered;
  }

  function providerOrder(slotId) {
    var providers = (config.ads || []).filter(function (provider) {
      return provider &&
        provider.enabled === true &&
        provider.placement === slotId &&
        safeFrameUrl(provider);
    });
    if (!providers.length) return [];

    var rotationKey = "__ggads_rotation_v" + version + "_" + slotId;
    var rotation = readStore(rotationKey);
    var roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);
    if (!rotation || !Array.isArray(rotation.visited) ||
        Date.now() - Number(rotation.time) >= roundSeconds * 1000) {
      rotation = { visited: [], time: Date.now() };
    }

    var candidates = providers.filter(function (provider) {
      return rotation.visited.indexOf(provider.id) < 0;
    });
    if (!candidates.length) {
      rotation = { visited: [], time: Date.now() };
      candidates = providers.slice();
    }

    var ordered = weightedOrder(candidates);
    if (ordered.length) {
      rotation.visited.push(ordered[0].id);
      safeStore(rotationKey, rotation);
    }
    return ordered;
  }

  function setSlotStyle(slot, slotConfig) {
    slot.style.display = "block";
    slot.style.position = "relative";
    slot.style.width = "100%";
    slot.style.maxWidth = Math.max(1, Number(slotConfig.maxWidth) || 970) + "px";
    slot.style.minHeight = Math.max(1, Number(slotConfig.height) || 250) + "px";
    slot.style.margin = slotConfig.margin || "12px auto";
    slot.style.overflow = "hidden";
    slot.style.contain = "layout paint";
    slot.setAttribute("aria-label", slotConfig.label || "广告");
  }

  function markViewable(slotId, providerId, attempt) {
    if (typeof window.IntersectionObserver !== "function") return;
    var frame = attempt.frame;
    var viewTimer = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!viewTimer) {
            viewTimer = window.setTimeout(function () {
              attempt.viewableCandidate = true;
              attempt.viewableCandidateAt = Date.now();
              recordResult({
                status: "viewable_candidate",
                slotId: slotId,
                adId: providerId,
                attempts: slotStates[slotId] ? slotStates[slotId].attempts : [],
                network: getNetworkInfo()
              });
              io.disconnect();
            }, 1000);
          }
        } else if (viewTimer) {
          window.clearTimeout(viewTimer);
          viewTimer = null;
        }
      });
    }, { threshold: [0, 0.5, 1] });
    io.observe(frame);
    attempt.observer = io;
  }

  function makeFrame(provider, slotConfig, onResult) {
    var frame = document.createElement("iframe");
    frame.title = provider.name ? provider.name + " 广告" : "广告";
    frame.src = safeFrameUrl(provider).href;
    frame.loading = "eager";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox");
    frame.setAttribute("allow", "fullscreen");
    frame.setAttribute("scrolling", "no");
    frame.style.display = "block";
    frame.style.width = "100%";
    frame.style.height = Math.max(1, Number(slotConfig.height) || 250) + "px";
    frame.style.border = "0";
    frame.style.margin = "0";
    frame.style.padding = "0";
    frame.style.background = "transparent";
    frame.setAttribute("data-ggads-provider", provider.id);
    frame.addEventListener("load", function () {
      onResult("frame_loaded");
    });
    frame.addEventListener("error", function () {
      onResult("error");
    });
    return frame;
  }

  function renderSlot(slot, slotConfig) {
    var slotId = slotConfig.id;
    if (slot.getAttribute("data-ggads-initialized") === "1") return;
    slot.setAttribute("data-ggads-initialized", "1");

    var providers = providerOrder(slotId);
    if (!providers.length) {
      slot.style.display = "none";
      recordResult({
        status: "no_provider_configured",
        slotId: slotId,
        attempts: [],
        network: getNetworkInfo()
      });
      return;
    }

    setSlotStyle(slot, slotConfig);
    var state = slotStates[slotId] = { attempts: [], completed: false, index: 0 };
    var label = document.createElement("span");
    label.textContent = slotConfig.label || "广告";
    label.style.cssText = "position:absolute;top:2px;left:4px;z-index:1;font:10px/1.4 sans-serif;color:#777;background:rgba(255,255,255,.8);padding:1px 4px;pointer-events:none;";
    slot.appendChild(label);

    function finish(status, provider, attempt) {
      if (state.completed) return;
      state.completed = true;
      if (attempt && attempt.timer) window.clearTimeout(attempt.timer);
      recordResult({
        status: status,
        slotId: slotId,
        adId: provider ? provider.id : null,
        attempts: state.attempts,
        network: getNetworkInfo()
      });
    }

    function loadNext() {
      if (state.completed) return;
      if (state.index >= providers.length || state.attempts.length > maxFallbacks) {
        finish("no_fill", null, null);
        return;
      }

      var provider = providers[state.index++];
      var attempt = {
        id: provider.id,
        status: "loading",
        startedAt: Date.now(),
        frame: null
      };
      state.attempts.push(attempt);

      var frame = makeFrame(provider, slotConfig, function (status) {
        if (status === "frame_loaded") {
          if (attempt.status !== "loading") return;
          attempt.status = "frame_loaded_unconfirmed";
          attempt.durationMs = Date.now() - attempt.startedAt;
          markViewable(slotId, provider.id, attempt);
          if (attempt.timer) window.clearTimeout(attempt.timer);
          attempt.timer = window.setTimeout(function () {
            finish("frame_loaded_unconfirmed", provider, attempt);
          }, Math.max(500, Number(config.statusGraceMs) || 1500));
          return;
        }
        if (status === "error" && attempt.status === "loading") {
          attempt.status = "error";
          attempt.durationMs = Date.now() - attempt.startedAt;
          if (attempt.observer) attempt.observer.disconnect();
          if (frame.parentNode) frame.parentNode.removeChild(frame);
          loadNext();
        }
      });
      attempt.frame = frame;
      slot.insertBefore(frame, label);
      attempt.timer = window.setTimeout(function () {
        if (state.completed || attempt.status !== "loading") return;
        attempt.status = "timeout";
        attempt.durationMs = Date.now() - attempt.startedAt;
        if (attempt.observer) attempt.observer.disconnect();
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        // A timed-out frame is removed and sandboxed before trying a backup.
        loadNext();
      }, timeoutMs);
    }

    function onProviderMessage(event) {
      if (event.source !== state.currentFrameWindow || !event.data ||
          event.data.type !== "ggads:status") return;
      var attempt = state.attempts[state.attempts.length - 1];
      var provider = providers[state.index - 1];
      if (!attempt || !provider || state.completed) return;
      if (event.data.status === "filled") {
        attempt.providerStatus = "filled";
        finish("filled", provider, attempt);
      } else if (event.data.status === "empty" || event.data.status === "error") {
        attempt.providerStatus = event.data.status;
        if (attempt.observer) attempt.observer.disconnect();
        if (attempt.frame && attempt.frame.parentNode) attempt.frame.parentNode.removeChild(attempt.frame);
        if (attempt.timer) window.clearTimeout(attempt.timer);
        loadNext();
      }
    }

    // Each slot accepts status messages only from its currently embedded frame.
    state.insertListener = onProviderMessage;
    window.addEventListener("message", onProviderMessage);

    var oldLoadNext = loadNext;
    loadNext = function () {
      if (state.completed) return;
      if (state.index >= providers.length || state.attempts.length > maxFallbacks) {
        window.removeEventListener("message", onProviderMessage);
        finish("no_fill", null, null);
        return;
      }
      var nextProvider = providers[state.index];
      state.currentFrameWindow = null;
      oldLoadNext();
      var last = state.attempts[state.attempts.length - 1];
      state.currentFrameWindow = last && last.frame ? last.frame.contentWindow : null;
    };

    loadNext();
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var slots = root.querySelectorAll("[data-ggads-slot]");
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var slotId = slot.getAttribute("data-ggads-slot");
      for (var j = 0; j < (config.slots || []).length; j++) {
        if (config.slots[j].id === slotId && config.slots[j].enabled !== false) {
          renderSlot(slot, config.slots[j]);
          break;
        }
      }
    }
  }

  var activeProviders = (config.ads || []).filter(function (provider) {
    return provider && provider.enabled === true && safeFrameUrl(provider);
  });
  addPreconnects(activeProviders);

  function start() {
    if (!document.documentElement) {
      window.setTimeout(start, 0);
      return;
    }
    scan(document.documentElement);
    if (typeof MutationObserver === "function" && !observer) {
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            if (node.nodeType === 1) {
              if (node.matches && node.matches("[data-ggads-slot]")) scan(node.parentNode || document.documentElement);
              else scan(node);
            }
          }
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    if (typeof MutationObserver === "function" && document.documentElement) {
      observer = new MutationObserver(function () { scan(document.documentElement); });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  scheduleHistats();
})();