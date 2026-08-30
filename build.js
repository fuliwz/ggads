const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const root = __dirname;
const src = path.join(root, 'src', 'dh.js');
const config = path.join(root, 'config', 'ads.json');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

const source = fs.readFileSync(src, 'utf8');
const ads = JSON.parse(fs.readFileSync(config, 'utf8'));

// Embed the configuration into the production loader so no config file is
// required by the public /dh.js endpoint.
const embedded = source.replace(
  'var CONFIG_URL = "../config/ads.json";',
  'var STATIC_CONFIG = ' + JSON.stringify(ads) + ';'
).replace(
  /loadConfig\(function \(config\) \{/,
  'loadConfig(function (config) {'
).replace(
  /function loadConfig\(done\) \{[\s\S]*?\n  \}\n\n  function weightedPick/,
  'function loadConfig(done) { done(STATIC_CONFIG); }\n\n  function weightedPick'
);

(async () => {
  const result = await minify(embedded, {
    compress: true,
    mangle: true,
    format: { comments: false }
  });
  if (result.error) throw result.error;
  fs.writeFileSync(path.join(dist, 'dh.js'), result.code + '\n');
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggads</title></head><body><h1>ggads</h1></body></html>\n');
})();
