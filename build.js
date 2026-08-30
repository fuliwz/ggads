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

if (!Array.isArray(config.ads) || config.ads.length === 0) {
  fail('config.ads must contain at least one ad');
}

const ids = new Set();
config.ads.forEach((ad, index) => {
  if (!ad || typeof ad !== 'object') fail(`ads[${index}] must be an object`);
  if (!ad.id || !ad.url) fail(`ads[${index}] requires id and url`);
  if (ids.has(ad.id)) fail(`duplicate ad id: ${ad.id}`);
  ids.add(ad.id);
  try {
    new URL(ad.url);
  } catch (_) {
    fail(`invalid ad url at ads[${index}]: ${ad.url}`);
  }
  if (ad.weight !== undefined && (!Number.isFinite(Number(ad.weight)) || Number(ad.weight) < 0)) {
    fail(`invalid weight at ads[${index}]`);
  }
});

if (!Number.isFinite(Number(config.version)) || Number(config.version) < 1) {
  fail('version must be a positive number');
}

if (!Number.isFinite(Number(config.roundSeconds)) || Number(config.roundSeconds) < 1) {
  fail('roundSeconds must be at least 1');
}

const source = fs.readFileSync(srcPath, 'utf8');
if (!source.includes(CONFIG_MARKER)) {
  fail(`source marker ${CONFIG_MARKER} was not found in src/dh.js`);
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
  fs.writeFileSync(path.join(distPath, 'dh.js'), `${result.code}\n`);
  fs.writeFileSync(
    path.join(distPath, 'index.html'),
    '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ggads</title></head><body><h1>ggads</h1></body></html>\n'
  );

  console.log(`[ggads build] generated dist/dh.js with ${config.ads.length} ad entries`);
})();
