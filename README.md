# ggads

纯静态 Cloudflare Pages 广告分发服务，不使用 Pages Functions。

## 架构

```text
config/ads.json  →  build.js  →  dist/dh.js
src/dh.js        →     Terser  →  dist/index.html
```

`config/ads.json` 是唯一广告配置入口。构建时校验配置、嵌入 `dh.js` 并压缩，Cloudflare Pages 仅发布 `dist/`。

## 接入

```html
<script src="https://ggads-24k.pages.dev/dh.js" defer></script>
```

当前只对移动端流量执行广告选择。广告加载完全异步，不阻塞网站主体内容。

## 加载策略

- 按权重随机排列广告源，保留配置的流量权重。
- 默认等待 8 秒；可通过 `requestTimeoutMs` 调整。
- 只有明确的脚本加载错误才尝试一个备用广告。
- 超时属于不确定状态：浏览器可能仍会执行晚到脚本，因此不会在超时后并发注入第二个广告源，避免重复展示。
- Histats 独立于广告加载，在浏览器空闲时运行。

## 本地诊断

- `window.__ggads_last_result`：最近一次结果。
- `localStorage.__ggads_last_result_v1`：本地记录。
- `ggads:result`：加载结束时派发的事件。

结果包括页面路径、域名、浏览器 UA、浏览器可提供的网络提示、广告源 ID、状态和加载耗时。信息只保存在当前浏览器，不会上传。注意：JS `load` 事件只证明脚本加载，不证明广告素材成功渲染或达到可视展示标准。

监听示例：

```javascript
window.addEventListener("ggads:result", function (event) {
  console.log("GGADS result:", event.detail);
});
```

## 修改广告

编辑 `config/ads.json`：

```json
{
  "version": 4,
  "roundSeconds": 60,
  "requestTimeoutMs": 8000,
  "maxFallbacks": 1,
  "ads": [
    {
      "id": "gg",
      "name": "GG",
      "url": "https://example.com/gg.js",
      "weight": 50,
      "enabled": true
    },
    {
      "id": "td",
      "name": "TD",
      "url": "https://example.com/td.js",
      "weight": 50,
      "enabled": true
    }
  ]
}
```

- `weight` 是相对权重，无需合计为 100。
- `enabled: false` 可停用广告源。
- 修改配置后递增 `version`，使客户端轮换状态键更新。
- `roundSeconds` 是轮换状态有效期。
- `requestTimeoutMs` 默认 8000 毫秒。
- `maxFallbacks` 默认 1，表示最多尝试一个备用源。

构建：

```bash
npm install
npm run build
```

Cloudflare Pages：Build command 为 `npm run build`，输出目录为 `dist`。
