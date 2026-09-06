# 海浩 AI 接入说明

当前只有可部署的聊天前端，模型后端和知识库尚未配置。`config.js` 中 `endpoint` 为空且 `knowledgeReady` 为 `false`，页面不会假装已经可以回答。

## 下一步需要的资料

由海浩提供用于对外回答的自我介绍、工作与项目经历、常见问答及希望采用的语气。资料可以先用文字、Markdown、Word 或 PDF 交付。整理并确认内容后，再导入所选模型服务的知识库；知识库检索不等同于对模型本身进行训练。

另外需确定模型服务及部署账户。在模型服务与后端部署完成之前，不应仅将 `knowledgeReady` 改成 `true`。

## 后端约定

GitHub Pages 仅承载静态文件。需要另外部署 HTTPS 对话接口，在服务端保存模型密钥、检索知识库并调用模型。前端配置只填写该接口地址。

请求：`POST <endpoint>`，`Content-Type: application/json`。

```json
{
  "messages": [
    { "role": "user", "content": "介绍一下海浩" },
    { "role": "assistant", "content": "上一条真实回答" },
    { "role": "user", "content": "有哪些项目经历？" }
  ]
}
```

前端最多发送最近 20 条历史消息加当前问题；单条输入上限 4000 字符。后端仍须自行验证角色、长度、总请求体积及用量。当前接口使用一次性 JSON 响应，不使用 SSE 流式协议。前端 45 秒超时，支持取消请求。

成功响应：

```json
{
  "answer": "基于已提供资料生成的真实回答。",
  "sources": [
    { "title": "项目经历", "url": "https://example.com/public-project" }
  ]
}
```

`answer` 必须为非空字符串，最多 32000 字符。`sources` 可省略；来源可仅包含标题，链接仅允许 HTTP/HTTPS。接口应只返回确实检索使用过的资料，资料未覆盖时明确说明不知道，不能编造海浩的经历、立场或联系方式。AI 身份在页面中始终标明。

错误使用适当的 HTTP 状态码；429 展示稍后再试，其他失败保留问题并提供重试。后端内部日志、密钥或堆栈不得作为回答返回。跨域接口需允许网站实际 Origin（`https://yeuhub.me`），处理 OPTIONS，并允许 POST、Content-Type、Accept；当前前端使用 `credentials: omit`，不发送 Cookie 或首页访问密码。若将来需要真正限制服务访问，应补充独立的服务端会话机制。

## 开通顺序

1. 确认知识库内容、AI 身份与回答边界。
2. 部署模型后端，设置服务端密钥、知识检索和用量限制。
3. 用实际请求验证回答、来源、未知问题、跨域和失败状态。
4. 更新 `agent/config.js` 的 `endpoint`、`knowledgeReady` 与 `knowledgeDescription`。
5. 将首页的“正在准备”和“知识库准备中”文案更新为真实开通状态，再发布。

配置文件、仓库源码和静态页面都是公开的；不要把 API 密钥或非公开资料写入这些文件。
