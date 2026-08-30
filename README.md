# ggads

纯静态 Cloudflare Pages 广告分发服务，不使用 Pages Functions。

## 架构

```text
config/ads.json  →  build.js  →  dist/dh.js
                              →  dist/index.html
```

广告配置与源码放在非公开输出目录，构建时将配置嵌入并压缩到 `dist/dh.js`。Cloudflare Pages 只发布 `dist/`，因此线上不需要暴露 `ads.json`、源码或构建脚本。

## 接入

```html
<script src="https://ggads-24k.pages.dev/dh.js" type="text/javascript"></script>
```

脚本仅在移动端执行；广告采用权重随机并结合本地轮换状态，避免同一轮次重复选择。广告脚本加载完成或失败后异步加载 Histats。

## 配置

修改 `config/ads.json` 后重新部署即可。`weight` 控制权重，`enabled: false` 停用广告，`version` 可用于刷新本地轮换键，`roundSeconds` 控制轮换状态有效期。

## 部署

- Build command: `npm run build`
- Build output directory: `dist`
- 不使用 Pages Functions
