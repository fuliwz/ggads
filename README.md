# ggads

纯静态 Cloudflare Pages 广告分发服务，不使用 Pages Functions。

## 接入

```html
<script src="https://ggads-24k.pages.dev/dh.js" type="text/javascript"></script>
```

`dh.js`、`ads.json` 均是普通 Pages 静态资源，不需要 Pages Functions。

## 广告配置

广告配置位于根目录 `ads.json`。以后更换广告地址、调整权重或停用广告，只修改 `ads.json` 并重新部署 Pages，接入网站无需修改。

示例：

```json
{
  "version": 1,
  "roundSeconds": 60,
  "ads": [
    {
      "id": "gg",
      "name": "GG",
      "url": "https://fyb.pages.dev/gg.js",
      "weight": 50,
      "enabled": true
    },
    {
      "id": "td",
      "name": "TD",
      "url": "https://fyb.pages.dev/td.js",
      "weight": 50,
      "enabled": true
    }
  ]
}
```

`weight` 控制加权随机选择；`enabled: false` 可停用某个广告。`version` 变化会使用新的本地轮换存储键，`roundSeconds` 控制轮换状态有效时间。

## 静态缓存

`dh.js` 在浏览器端读取 `ads.json`，并将配置缓存到 `localStorage`，默认 6 小时后才再次请求配置。这样不会因为每次页面打开都读取配置而产生不必要的请求。

## Histats

广告脚本加载成功或失败后异步加载 Histats：

```text
1,4757866,4,0,0,0,00010000
```

不会阻塞广告脚本的初始加载。

## 部署

项目根目录就是 Cloudflare Pages 静态输出目录。仓库中没有 `functions/` 目录，因此不会创建 Pages Functions 路由。
