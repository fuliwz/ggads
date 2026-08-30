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

脚本会在移动端执行广告选择；使用权重随机 + 本地轮换状态，尽量避免同一轮次连续重复。广告脚本异步加载，完成或失败后再加载 Histats，避免阻塞页面主流程。

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

修改配置后执行：

```bash
npm install
npm run build
```

即可自动生成最新的 `dist/dh.js`。Cloudflare Pages 的构建命令同样使用 `npm run build`，因此部署时会自动从配置重新生成生产文件。

## 构建安全检查

`build.js` 会检查：

- JSON 是否有效；
- `ads` 是否为空；
- `id` 是否重复；
- URL 是否为合法绝对 URL；
- 权重是否为非负数字；
- `version` 和 `roundSeconds` 是否有效；
- 源码中的配置注入标记是否存在；
- Terser 是否产生有效输出。

## 部署

- Build command: `npm run build`
- Build output directory: `dist`
- 不使用 Pages Functions
- `/dh.js` 当前使用短缓存，以便广告配置变更能够较快生效。
