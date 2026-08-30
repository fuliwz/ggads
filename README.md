# ggads

纯静态 Cloudflare Pages 广告分发服务，不使用 Pages Functions。

## 接入

在需要展示广告的网站中加入：

```html
<script src="https://ggads-24k.pages.dev/dh.js" type="text/javascript"></script>
```

`dh.js` 是普通 Pages 静态资源，因此请求不会进入 Pages Functions。

## 广告配置

广告配置位于根目录的 `ads.json`：

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

以后更换广告、调整权重或停用广告，只需要修改 `ads.json` 并重新部署 Pages；接入网站不需要修改。

## 轮换逻辑

`dh.js` 在浏览器端读取 `ads.json`，根据 `weight` 随机选择广告，并使用 `localStorage` 保存本轮已访问的广告 ID。`roundSeconds` 控制轮换状态有效时间；`version` 变更后会使用新的本地存储键。

## 降低配置请求

浏览器成功读取 `ads.json` 后会保存到本地存储，后续访问优先使用缓存配置，因此不会每次页面加载都请求配置文件。

## Histats

广告脚本成功或失败后异步加载 Histats：

```text
1,4757866,4,0,0,0,00010000
```

Histats 不作为广告脚本的前置阻塞步骤。

## 部署

项目使用根目录作为 Pages 静态输出目录。仓库中不再包含 `functions/` 目录，因此不会创建 Pages Functions 路由。