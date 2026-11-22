const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const root = __dirname;
const srcPath = path.join(root, 'src', 'dh.js');
const configPath = path.join(root, 'config', 'ads.json');
const distPath = path.join(root, 'dist');
const CONFIG_MARKER = '/*__GGADS_CONFIG__*/';

function fail(message) {
  console.error(`[ggads build] ${message}`);
  process.exit(1);
}

function isHostAllowed(host, allowedHosts) {
  return allowedHosts.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

if (!fs.existsSync(srcPath)) fail('missing src/dh.js');
if (!fs.existsSync(configPath)) fail('missing config/ads.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  fail(`invalid config/ads.json: ${error.message}`);
}

if (!config || typeof config !== 'object' || Array.isArray(config)) {
  fail('config/ads.json must contain a JSON object');
}
if (!Array.isArray(config.slots) || config.slots.length === 0) {
  fail('config.slots must contain at least one visible placement');
}
if (!Array.isArray(config.ads) || config.ads.length === 0) {
  fail('config.ads must contain at least one provider entry');
}
if (!Array.isArray(config.allowedFrameHosts)) {
  fail('config.allowedFrameHosts must be an array');
}

const slotIds = new Set();
config.slots.forEach((slot, index) => {
  if (!slot || typeof slot !== 'object' || !slot.id) fail(`slots[${index}] requires id`);
  if (slotIds.has(slot.id)) fail(`duplicate slot id: ${slot.id}`);
  slotIds.add(slot.id);
  if (slot.height !== undefined && (!Number.isFinite(Number(slot.height)) || Number(slot.height) < 1)) {
    fail(`invalid slot height at slots[${index}]`);
  }
});

const allowedHosts = config.allowedFrameHosts.map((host) => String(host).toLowerCase());
allowedHosts.forEach((host, index) => {
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(host)) {
    fail(`invalid allowedFrameHosts[${index}]`);
  }
});

const ids = new Set();
config.ads.forEach((ad, index) => {
  if (!ad || typeof ad !== 'object' || !ad.id || !ad.placement) {
    fail(`ads[${index}] requires id and placement`);
  }
  if (ids.has(ad.id)) fail(`duplicate ad id: ${ad.id}`);
  ids.add(ad.id);
  if (!slotIds.has(ad.placement)) fail(`ads[${index}] references unknown placement: ${ad.placement}`);

  if (ad.weight !== undefined && (!Number.isFinite(Number(ad.weight)) || Number(ad.weight) < 0)) {
    fail(`invalid weight at ads[${index}]`);
  }

  if (ad.enabled === true) {
    if (typeof ad.frameUrl !== 'string' || !ad.frameUrl) fail(`enabled ads[${index}] requires frameUrl`);
    let url;
    try {
      url = new URL(ad.frameUrl);
    } catch (_) {
      fail(`invalid frameUrl at ads[${index}]`);
    }
    if (url.protocol !== 'https:') fail(`ads[${index}] frameUrl must use HTTPS`);
    if (!isHostAllowed(url.hostname.toLowerCase(), allowedHosts)) {
      fail(`ads[${index}] frameUrl host is not present in allowedFrameHosts: ${url.hostname}`);
    }
  } else if (ad.frameUrl) {
    let url;
    try {
      url = new URL(ad.frameUrl);
    } catch (_) {
      fail(`invalid frameUrl at ads[${index}]`);
    }
    if (url.protocol !== 'https:') fail(`ads[${index}] frameUrl must use HTTPS`);
    if (!isHostAllowed(url.hostname.toLowerCase(), allowedHosts)) {
      fail(`ads[${index}] frameUrl host is not present in allowedFrameHosts: ${url.hostname}`);
    }
  }
});

if (!Number.isFinite(Number(config.version)) || Number(config.version) < 1) {
  fail('version must be a positive number');
}
if (!Number.isFinite(Number(config.roundSeconds)) || Number(config.roundSeconds) < 1) {
  fail('roundSeconds must be at least 1');
}
if (!Number.isFinite(Number(config.requestTimeoutMs)) || Number(config.requestTimeoutMs) < 1000) {
  fail('requestTimeoutMs must be at least 1000');
}
if (!Number.isFinite(Number(config.maxFallbacks)) || Number(config.maxFallbacks) < 0 || Number(config.maxFallbacks) > 1) {
  fail('maxFallbacks must be between 0 and 1');
}

const source = fs.readFileSync(srcPath, 'utf8');
if (!source.includes(CONFIG_MARKER)) {
  fail(`source marker ${CONFIG_MARKER} was not found in src/dh.js`);
}
if (source.indexOf('data-ggads-slot') < 0 || source.indexOf('ggads:status') < 0) {
  fail('visible slot and provider status protocol must exist in src/dh.js');
}

const embedded = source.replace(CONFIG_MARKER, `var STATIC_CONFIG = ${JSON.stringify(config)};`);

(async () => {
  const result = await minify(embedded, {
    compress: {
      passes: 2,
      drop_console: true,
      drop_debugger: true
    },
    mangle: true,
    format: { comments: false }
  });

  if (result.error) throw result.error;
  if (!result.code) fail('Terser returned empty output');

  fs.mkdirSync(distPath, { recursive: true });
  fs.writeFileSync(path.join(distPath, 'dh.js'), `${result.code}\\n`);
  fs.writeFileSync(
    path.join(distPath, 'index.html'),
    '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ggads</title></head><body><h1>ggads</h1></body></html>\\n'
  );

  console.log(`[ggads build] generated dist/dh.js with ${config.ads.length} provider entries and ${config.slots.length} slots`);
})();