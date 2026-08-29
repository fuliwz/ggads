function escapeJs(value) {
  return JSON.stringify(String(value));
}

function buildLoader(config) {
  const ads = config.ads.filter(ad => ad.enabled !== false && ad.url);
  const roundSeconds = Math.max(1, Number(config.roundSeconds) || 60);

  return `const ADS=${JSON.stringify(ads)};
const STORAGE_KEY="__ggads_rotation_v${Number(config.version) || 1}";
const ROUND_MS=${roundSeconds * 1000};
(function(){
  if(window.__ggads_loaded)return;
  window.__ggads_loaded=true;
  if(!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent||"")))return;
  function read(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(x&&Array.isArray(x.visited)&&Date.now()-x.time<ROUND_MS)return x;}catch(e){}return{visited:[],time:Date.now()};}
  function pick(list){let total=list.reduce((n,a)=>n+Math.max(0,Number(a.weight)||0),0);if(!total)return list[Math.floor(Math.random()*list.length)];let r=Math.random()*total;for(const a of list){r-=Math.max(0,Number(a.weight)||0);if(r<0)return a;}return list[list.length-1];}
  const state=read();
  let available=ADS.filter(a=>!state.visited.includes(a.id));
  if(!available.length){state.visited=[];state.time=Date.now();available=ADS.slice();}
  if(!available.length)return;
  const selected=pick(available);
  state.visited.push(selected.id);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}

  const s=document.createElement("script");
  s.src=selected.url;
  s.async=true;
  s.type="text/javascript";
  s.setAttribute("data-ggads-id",selected.id);
  (document.head||document.documentElement).appendChild(s);

  function histats(){
    if(window.__ggads_histats_loaded)return;
    window.__ggads_histats_loaded=true;
    var _Hasync=window._Hasync=window._Hasync||[];
    _Hasync.push(["Histats.start","1,4757866,4,0,0,0,00010000"]);
    _Hasync.push(["Histats.fasi","1"]);
    _Hasync.push(["Histats.track_hits",""]);
    var hs=document.createElement("script");hs.type="text/javascript";hs.async=true;hs.src="//s10.histats.com/js15_as.js";
    (document.head||document.documentElement).appendChild(hs);
  }
  if(s.addEventListener){s.addEventListener("load",histats,{once:true});s.addEventListener("error",histats,{once:true});}else{setTimeout(histats,1500);}
})();`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const cfgUrl = new URL('/ads.json', url.origin);
  const cache = caches.default;
  const configRequest = new Request(cfgUrl.toString(), { method: 'GET' });

  let configResponse = await cache.match(configRequest);
  if (!configResponse) {
    configResponse = await fetch(configRequest);
    if (configResponse.ok) context.waitUntil(cache.put(configRequest, configResponse.clone()));
  }

  let config;
  try {
    config = await configResponse.json();
  } catch (_) {
    config = { version: 1, roundSeconds: 60, ads: [] };
  }

  const body = buildLoader(config);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=UTF-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
