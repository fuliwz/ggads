const LOADER = "const ADS = [\n  { id: \"gg\", url: \"https://fyb.pages.dev/gg.js\", weight: 50 },\n  { id: \"td\", url: \"https://fyb.pages.dev/td.js\", weight: 50 },\n];\n\nconst STORAGE_KEY = \"__ggads_rotation_v1\";\n\nfunction isMobileClient() {\n  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === \"boolean\") {\n    return navigator.userAgentData.mobile;\n  }\n  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || \"\");\n}\n\nfunction getState() {\n  try {\n    const raw = localStorage.getItem(STORAGE_KEY);\n    if (!raw) return { visited: [], time: 0 };\n    const state = JSON.parse(raw);\n    if (!state || !Array.isArray(state.visited)) return { visited: [], time: 0 };\n    if (Date.now() - Number(state.time || 0) > 60000) return { visited: [], time: 0 };\n    const visited = state.visited.filter(id => ADS.some(ad => ad.id === id));\n    return { visited, time: Number(state.time || 0) };\n  } catch (_) {\n    return { visited: [], time: 0 };\n  }\n}\n\nfunction choose(available) {\n  const total = available.reduce((sum, ad) => sum + Math.max(0, Number(ad.weight) || 0), 0);\n  if (!total) return available[Math.floor(Math.random() * available.length)];\n  let cursor = Math.random() * total;\n  for (const ad of available) {\n    cursor -= Math.max(0, Number(ad.weight) || 0);\n    if (cursor < 0) return ad;\n  }\n  return available[available.length - 1];\n}\n\nfunction loadHistats() {\n  if (window.__ggads_histats_loaded) return;\n  window.__ggads_histats_loaded = true;\n  var _Hasync = window._Hasync || [];\n  window._Hasync = _Hasync;\n  _Hasync.push([\"Histats.start\", \"1,4757866,4,0,0,0,00010000\"]);\n  _Hasync.push([\"Histats.fasi\", \"1\"]);\n  _Hasync.push([\"Histats.track_hits\", \"\"]);\n  var hs = document.createElement(\"script\");\n  hs.type = \"text/javascript\";\n  hs.async = true;\n  hs.src = \"//s10.histats.com/js15_as.js\";\n  (document.head || document.body || document.documentElement).appendChild(hs);\n}\n\n(function () {\n  if (window.__ggads_loaded || !isMobileClient()) return;\n  window.__ggads_loaded = true;\n\n  let state = getState();\n  let available = ADS.filter(ad => !state.visited.includes(ad.id));\n  if (!available.length) {\n    available = ADS.slice();\n    state = { visited: [], time: Date.now() };\n  }\n\n  const selected = choose(available);\n  state.visited.push(selected.id);\n  state.time = Date.now();\n  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}\n\n  const ad = document.createElement(\"script\");\n  ad.src = selected.url;\n  ad.async = true;\n  ad.type = \"text/javascript\";\n  ad.setAttribute(\"data-ggads-id\", selected.id);\n  (document.head || document.body || document.documentElement).appendChild(ad);\n  loadHistats();\n})();\n\n";

export async function onRequestGet(context) {
  const request = context.request;
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.search = '';
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const response = new Response(LOADER, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=UTF-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
