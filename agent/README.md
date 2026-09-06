# 海浩 AI 承接页面

当前 `/agent/` 承接站主从 AI Studio 导出的「增长漏斗图」，原密码解锁后直接打开。

功能：层级数量、标签、数值、颜色、待办事项编辑，以及 PNG/PDF 导出。数据在当前页面内编辑，刷新会回到示例，不会自动保存到服务器。

项目源码位于 `projects/funnel-chart-builder/`；`agent/index.html` 和 `agent/assets/` 是该项目的静态构建产物。保留的 `chat.js`、`config.js`、`agent.css` 是此前聊天页的实现，本次页面不加载它们，后续可继续接入知识库与模型。

构建流程见项目 README。沿用 `assets/access.js` 的静态入口门禁；30 分钟后或其他标签页锁定时返回主页。
