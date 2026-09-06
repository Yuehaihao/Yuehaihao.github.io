# 增长漏斗图 · 海浩 AI

来源：站主提供的 AI Studio 导出包 `funnel-chart-builder.zip`。部署到 `https://yeuhub.me/agent/`，保持原应用的编辑和导出功能。

## 构建与发布

```sh
bun install --frozen-lockfile
bun run build
```

将 `dist/index.html` 与 `dist/assets/` 复制到仓库根目录的 `agent/`，提交源码、锁文件和构建产物。GitHub Pages 直接发布构建结果，不需要在服务器安装 Node。

- Vite base 为 `/agent/`，避免子路径资源丢失。
- 页面加载站点的 `/assets/access.js`，沿用密码与 30 分钟解锁时间。
- 未解锁或过期访问会返回首页；页面提供返回主页链接。
- 为兼容 Tailwind 4 的颜色语法，导出使用 html2canvas-pro；导出模块按需加载，提供失败提示。
- 限制 1–20 层，数值不能为负；前一层为 0 时转化率显示为横杠。
- 手机可横向滚动图表，保持导出布局完整。
- 本应用无模型调用，不需要 Gemini API Key。示例数据和改动只存于页面内存，刷新重置。

此前聊天页面相关源码仍在 `agent/` 中保留，当前入口不加载。
