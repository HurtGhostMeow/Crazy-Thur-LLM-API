# DeepSeek V50 Flash 体验 API

一个只用于演示的 Next.js OpenAI 兼容接口：每周四按北京时间开放，并随机返回预置的演示内容。

> **严禁用于生产环境。** 不要将临时 Key 放进客户端、仓库、真实业务或分享给他人。

## 启动

1. 复制 `.env.example` 为 `.env.local`，填入至少 32 字符的随机 `API_KEY_SECRET`。
2. 执行 `npm install`，再执行 `npm run dev`。
3. 打开 `http://localhost:3000` 签发一个仅显示一次、有效 24 小时的 `sk-` 格式演示 Key。

## 接口

- `POST /api/keys`：签发临时 Key，不会持久化保存 Key。
- `GET /v1/models`：返回 `DeeoSeek-V50-Flash`。
- `POST /v1/chat/completions`：返回一条随机文案；支持 OpenAI 兼容的 `stream: true` SSE 响应。

所有 `/v1/*` 接口均需 `Authorization: Bearer <API_KEY>`。Key 无效或过期返回 `401`；合法 Key 在非北京时间周四调用返回 `429 insufficient_quota`。

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-你的临时密钥" \
  -H "Content-Type: application/json" \
  -d '{"model":"DeeoSeek-V50-Flash","messages":[{"role":"user","content":"来一条"}]}'
```

## Vercel

部署到 Vercel 后，在 Project Settings → Environment Variables 配置强随机的 `API_KEY_SECRET`。签名 Key 不是数据库记录，因此 Vercel 冷启动不会令仍在有效期内的 Key 失效；不过它不可单独撤销，且本项目未提供限流、审计、用户权限或生产级密钥管理。

运行 `npm run check:copy` 检查预置文案文件的数量、空值和重复项。

## 许可证

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 许可协议。你可以在署名、非商业使用且以相同方式共享的前提下使用和改编本项目；完整条款见 [LICENSE](LICENSE)。
