# ggads

纯静态 Cloudflare Pages 广告分发服务，不使用 Pages Functions。

## 架构

```text
config/ads.json  →  build.js  →  dist/dh.js
src/dh.js        →     Terser  →  dist/index.html
```

`config/ads.json` 是唯一需要修改的广告配置入口。构建时会校验配置、把配置静态嵌入 `dh.js`，再使用 Terser 压缩和变量混淆。Cloudflare Pages 只发布 `dist/`，线上不需要暴露配置文件或源码。

## 接入

```html
<script src="https://ggads-24k.pages.dev/dh.js" defer></script>
```

脚本仅在移动端执行广告选择，保留权重随机和本地轮换机制。广告脚本使用异步加载；首选广告失败或 3 秒内未完成加载时，会按加权随机顺序尝试其他启用的广告，且不会同时请求多个广告脚本。所有广告失败不会阻塞网站主体内容。

Histats 与广告请求解耦，在浏览器空闲时独立加载（不支持 `requestIdleCallback` 时使用定时器回退）。

## 广告加载结果监测

加载器在页面内提供最近一次结果：

- `window.__ggads_last_result`：最近一次加载结果对象。
- `localStorage.__ggads_last_result_v1`：最近一次结果的本地记录。
- `ggads:result`：加载结束时派发的自定义事件。

结果包含整体状态、成功广告 ID、各广告尝试状态、总耗时和时间戳。数据只保存在当前浏览器，不会上传到第三方。状态为 `loaded` 表示广告 JS 文件触发了 `load` 事件，不代表广告商后续素材一定成功展示。

示例监听：

```javascript
window.addEventListener("ggads:result", function (event) {
  console.log("GGADS result:", event.detail);
});
```

## 修改广告

只需要编辑：

```text
config/ads.json
```

示例：

```json
{
  "version": 2,
  "roundSeconds": 60,
  "ads": [
    {
      "id": "gg",
      "name": "GG",
      "url": "https://example.com/gg.js",
      "weight": 70,
      "enabled": true
    },
    {
      "id": "td",
      "name": "TD",
      "url": "https://example.com/td.js",
      "weight": 30,
      "enabled": true
    }
  ]
}
```

- `weight`：相对权重，不要求加起来等于 100。
- `enabled: false`：临时停用广告。
- `version`：修改后递增，可让客户端使用新的轮换状态键。
- `roundSeconds`：轮换状态有效期，单位秒。
- 广告加载超时目前固定为 3000 毫秒；可在 `src/dh.js` 的 `REQUEST_TIMEOUT_MS` 修改。

修改配置后执行：

```bash
npm install
npm run build
```

Cloudflare Pages 构建命令使用 `npm run build`，输出目录为 `dist`。

## 构建安全检查

`build.js` 会检查 JSON、广告列表、重复 ID、URL、权重、版本、轮换时间、配置注入标记及 Terser 输出。

## 部署

- Build command: `npm run build`
- Build output directory: `dist`
- 不使用 Pages Functions
- `/dh.js` 使用短缓存，以便配置更新后较快生效。
