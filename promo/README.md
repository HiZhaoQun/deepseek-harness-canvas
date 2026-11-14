# 宣传片

58 秒、1920×1080、30fps 的宣传片。画面不是录屏，也不是重画的界面：`promo/capture/` 把**插件真实的客户端代码**跑在一个最小宿主里，逐状态截图，再交给 `index.html` 做 CSS 动效和字幕。

产物：

- `harness-canvas-promo.mp4` — 成片（H.264 / BT.709 / 30fps / 约 20 MB，无音轨，平台上自己配 BGM）
- `poster.jpg` — 标题帧，可直接当封面
- `captions.srt` — 与画面对齐的字幕稿
- `index.html` — 分镜与动效源码
- `capture/` — 真实界面截图管线
- `render.mjs`、`build.ps1` — 逐帧渲染与编码

成片、344 MB 中间帧和第三方 React 都不进 Git，`.gitignore` 已忽略；源码和截图素材照常提交，随时能重渲染。

## 分镜

| 时间 | 段落 | 画面 |
| --- | --- | --- |
| 0–7s | 钩子 | 标题「把对话，变成一张会生长的卡片树」+ 漂浮卡片 |
| 7–14s | 痛点 | 滚动的线性聊天流，第 3 个话题逐渐淡出 |
| 14–21.5s | 卡片 | 真实画布：4:3 折叠瓦片 + 连线，镜头推近 |
| 21.5–29s | 分支 | 选中父卡片，回答成为子卡片 |
| 29–36.5s | 两种尺寸 | 展开卡占 2×2 槽位，与折叠卡混排 |
| 36.5–44s | 网格磁吸 | 拖动时显示槽位轮廓并高亮落点 |
| 44–51s | 阅读 | 全屏阅读面板 |
| 51–58s | 行动 | Apache-2.0 + `git clone` + 安装路径 |

## 截图怎么来的

`capture/index.html` 是一个最小宿主：它注入 React、注册一份 locale 字典、给 `remote.session` 一个永不产出的桩，然后把 `assets/app.js` 挂起来。画布、卡片、Markdown、样式全部是插件自己的代码，数据来自页面里预置的 `localStorage` 板子。

```powershell
# 1. 起一个静态服务器（模块导入不能走 file://）
python -m http.server 8765 --bind 127.0.0.1

# 2. 下载 React UMD（只需一次）
powershell -ExecutionPolicy Bypass -File promo\capture\fetch-deps.ps1

# 3. 起无头 Edge 并截图
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --no-sandbox `
  --remote-debugging-port=9340 about:blank
node promo\capture\capture.mjs 9340
```

脚本会把 `tiles / branch / expanded / drag / reader` 五个状态写成 `capture/out/*.png`，需要更新宣传片素材时把它们复制成 `media/0*.png` 即可。

## 重新渲染成片

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File promo\build.ps1
```

依赖：Edge（无头）、Node 18+（用到全局 `WebSocket`）、ffmpeg。

只出几张定帧看排期：

```powershell
node promo\render.mjs --stills 3,20,27,34,42,49,54 --out tmp/stills
```

## 改文案 / 改时长

- 文案在 `index.html`，中文直接改；字幕在 `captions.srt` 同步。
- 时间轴是 `index.html` 末尾的 `SCENES` 数组，改完同步 `build.ps1` 里的 `$duration`。
- 卡片内容在 `capture/index.html` 的 `cards` 数组，改完重跑截图。

## 上传建议

- B 站 / YouTube：直接传 `harness-canvas-promo.mp4`，封面用 `poster.jpg`。
- 抖音 / 视频号：需要 9:16 时再出一版竖屏，横屏截图在竖屏里会显得小。
