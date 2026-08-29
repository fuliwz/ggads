# ggads

Cloudflare Pages Functions 广告分发入口。

## 接入

在需要展示广告的网站中加入：

```html
<script src="https://你的Pages域名/dh.js" type="text/javascript"></script>
```

例如部署到 `ggads.pages.dev` 后：

```html
<script src="https://ggads.pages.dev/dh.js" type="text/javascript"></script>
```

## 当前广告

广告配置位于 `functions/dh.js` 顶部的 `ADS` 数组：

- `id`：广告唯一标识
- `url`：广告 JS 地址
- `weight`：随机权重

当前配置：

```js
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
```

以后换广告只需要修改这里并重新部署 Pages。

## Cookie 轮换

移动端访问时使用 `visited_ads` Cookie 记录本轮已经选择过的广告。60 秒后 Cookie 自动过期；当本轮所有广告都选择过后，会开始新一轮。

## Histats

已经加入提供的 Histats 统计代码：

```text
1,4757866,4,0,0,0,00010000
```

Histats 脚本采用异步方式加载，不作为广告脚本的前置阻塞步骤。
