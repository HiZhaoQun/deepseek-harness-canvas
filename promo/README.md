# 宣传片

55 秒、1920×1080、30fps 的宣传片，画面全部由 CSS 动画渲染，没有录屏。

产物：

- `harness-canvas-promo.mp4` — 成片（1920×1080 / 30fps / H.264 / 55 秒 / 约 20 MB，无音轨，平台上自己配 BGM）
- `poster.jpg` — 第 5.6 秒的定帧，可直接当封面
- `captions.srt` — 与画面对齐的字幕稿
- `index.html` — 分镜与动效源码，浏览器直接打开的也是它
- `render.mjs` — 通过 DevTools 协议驱动无头 Edge，按时间戳逐帧截图
- `build.ps1` — 一条命令：起浏览器 → 渲染 1650 帧 → ffmpeg 编码

成片和 344 MB 的中间帧不进 Git：`.gitignore` 已经忽略 `promo/harness-canvas-promo.mp4`、`frames/`、`stills/`、`tmp/`，源码和截图素材照常提交，随时可以重新渲染。

## 分镜

| 时间 | 段落 | 画面 |
| --- | --- | --- |
| 0.0–7.2s | 钩子 | 标题「把对话，变成一张会生长的卡片树」+ 漂浮卡片 |
| 7.2–15.4s | 痛点 | 右侧滚动的线性聊天流，第 3 个话题逐渐淡出 |
| 15.4–24.6s | 核心 | 真实界面：每轮对话生成一张卡片，镜头缓慢推近 |
| 24.6–34.2s | 分支 | 父卡片与子卡片，推近到连线处 |
| 34.2–42.6s | 阅读与引用 | 阅读面板 + 底部输入框里的出处引用 |
| 42.6–48.4s | 历史 | 导入对话菜单：最近 20 轮 / 全部历史 |
| 48.4–55.0s | 行动 | 开源信息 + `git clone` 逐字打出 + 安装路径 |

## 重新渲染

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File promo\build.ps1
```

依赖：Edge（无头模式）、Node 18+（用到全局 `WebSocket`）、ffmpeg 在 PATH 或 `C:\ProgramData\chocolatey\bin`。

只出几张定帧看排期：

```powershell
node promo\render.mjs --stills 2.5,20,32,52 --out promo\stills
```

需要先手动起一个无头浏览器并监听 9222：

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --no-sandbox `
  --remote-debugging-port=9222 --user-data-dir="$PWD\promo\tmp\profile" --window-size=1920,1080 about:blank
```

## 改文案 / 改时长

- 文案都在 `index.html` 里，中文直接改；字幕在 `captions.srt` 同步。
- 时间轴是 `index.html` 末尾的 `SCENES` 数组，改 `start` / `end` 后同步 `build.ps1` 里的 `$duration`，再跑一遍即可。
- 界面截图来自 `docs/images/`，`media/*.png` 是去掉系统标题栏（顶部 48px）后的版本，用于画框内展示。

## 上传建议

- B 站 / YouTube：直接传 `harness-canvas-promo.mp4`，封面用第 24 秒或第 52 秒的定帧。
- 抖音 / 视频号：需要 9:16 时再单独出一版竖屏，横屏截图在竖屏里会显得小。
