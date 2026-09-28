# 分析汇总部署约定

- 报告文件放在 `reports/` 目录，使用稳定的英文或数字文件名，例如 `reports/2026-09-growth-review.html`。
- 每次新增报告后，在 `manifest.json` 的 `items` 中增加 `title`、`date`、`summary`、`href` 和可选的 `tags`。
- `href` 必须指向 `reports/` 下的 HTML 文件。
- 每份报告发布时都要引入 `/assets/access.js` 和 `/assets/guard.js`，并使用 `data-scope="work"`，保证直接访问报告地址时也需要工作区密码。
