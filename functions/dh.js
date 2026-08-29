const ADS = [
  {
    id: 'gg',
    url: 'https://fyb.pages.dev/gg.js',
    weight: 60,
  },
  {
    id: 'td',
    url: 'https://fyb.pages.dev/td.js',
    weight: 40,
  },
];

const COOKIE_NAME = 'visited_ads';
const COOKIE_MAX_AGE = 60;

function isMobile(request) {
  const headers = request.headers;

  if (headers.has('via')) return true;
  if (headers.has('x-nokia-connection-mode')) return true;
  if (headers.has('x-up-calling-line-id')) return true;

  const accept = (headers.get('accept') || '').toUpperCase();
  if (accept.includes('VND.WAP.WML')) return true;

  const ua = (headers.get('user-agent') || '').trim();
  if (!ua) return true;

  const mobileTokens = [
    'Google Wireless Transcoder', 'Windows CE', 'WindowsCE', 'Symbian',
    'Android', 'armv6l', 'armv5', 'Mobile', 'CentOS', 'mowser',
    'AvantGo', 'Opera Mobi', 'J2ME/MIDP', 'Smartphone', 'Go.Web',
    'Palm', 'iPAQ', 'iPhone', 'iPod', 'iPad', 'BlackBerry',
    'Windows Phone', 'Opera Mini', 'IEMobile', 'webOS'
  ];

  const lowerUA = ua.toLowerCase();
  return mobileTokens.some(token => lowerUA.includes(token.toLowerCase()));
}

function parseVisited(cookieHeader) {
  if (!cookieHeader) return [];

  const match = cookieHeader.match(/(?:^|;\\s*)visited_ads=([^;]*)/);
  if (!match) return [];

  return decodeURIComponent(match[1])
    .split(',')
    .map(Number)
    .filter(Number.isInteger)
    .filter(index => index >= 0 && index < ADS.length);
}

function chooseWeighted(indices) {
  if (indices.length === 0) return null;

  const total = indices.reduce((sum, index) => sum + Math.max(0, Number(ADS[index].weight) || 0), 0);
  if (total <= 0) return indices[Math.floor(Math.random() * indices.length)];

  let cursor = Math.random() * total;
  for (const index of indices) {
    cursor -= Math.max(0, Number(ADS[index].weight) || 0);
    if (cursor < 0) return index;
  }

  return indices[indices.length - 1];
}

function buildCookie(indices) {
  return `${COOKIE_NAME}=${encodeURIComponent(indices.join(','))}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
}

function escapeJs(value) {
  return String(value)
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

function getHost(request) {
  try {
    return new URL(request.url).hostname;
  } catch {
    return '';
  }
}

function buildHistatsScript(adId, sourceHost) {
  const safeAdId = escapeJs(adId);
  const safeHost = escapeJs(sourceHost || 'unknown');

  // Histats base code supplied by the site owner.
  // A lightweight async loader is used so the statistics request does not
  // block execution of the selected advertisement.
  return `\n(function(){\n  try {\n    var _Hasync = window._Hasync = window._Hasync || [];\n    _Hasync.push(['Histats.start', '1,4757866,4,0,0,0,00010000']);\n    _Hasync.push(['Histats.fasi', '1']);\n    _Hasync.push(['Histats.track_hits', '']);\n    _Hasync.push(['Histats.track_hits', '${safeAdId}']);\n    _Hasync.push(['Histats.track_hits', '${safeHost}']);\n    var hs = document.createElement('script');\n    hs.type = 'text/javascript';\n    hs.async = true;\n    hs.src = '//s10.histats.com/js15_as.js';\n    (document.head || document.body || document.documentElement).appendChild(hs);\n  } catch (e) {}\n})();\n`;
}

export async function onRequest(context) {
  const request = context.request;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }

  if (!isMobile(request)) {
    return new Response('// PC request: no advertisement.\\n', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=UTF-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const visited = parseVisited(request.headers.get('cookie'));
  let available = ADS.map((_, index) => index).filter(index => !visited.includes(index));
  let nextVisited = [...visited];

  // Start a new round after every configured ad has been selected once.
  if (available.length === 0) {
    available = ADS.map((_, index) => index);
    nextVisited = [];
  }

  const selectedIndex = chooseWeighted(available);
  const selectedAd = ADS[selectedIndex];
  nextVisited.push(selectedIndex);

  const sourceHost = getHost(request);
  const histats = buildHistatsScript(selectedAd.id, sourceHost);

  // The external ad is intentionally loaded by the returned JavaScript
  // instead of issuing an HTTP redirect, so the endpoint remains a valid
  // <script src=".../dh.js"> resource.
  const body = `\n(function(){\n  var ad = document.createElement('script');\n  ad.src = '${escapeJs(selectedAd.url)}';\n  ad.async = true;\n  ad.type = 'text/javascript';\n  (document.head || document.body || document.documentElement).appendChild(ad);\n  ${histats}\n})();\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=UTF-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Set-Cookie': buildCookie(nextVisited),
      'Access-Control-Allow-Origin': '*',
      Vary: 'User-Agent, Cookie',
    },
  });
}
