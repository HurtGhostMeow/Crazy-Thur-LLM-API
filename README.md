# Crazy-Thur-LLM-API

一个只用于演示的 Next.js OpenAI 兼容接口：每周四按北京时间开放。默认随机返回预置内容，也可以通过服务端环境变量接入本地模型或远程 OpenAI 兼容 API。

> **严禁用于生产环境。** 不要将临时 Key 放进客户端、仓库、真实业务或分享给他人。

## 启动

1. 复制 `.env.example` 为 `.env.local`，填入至少 32 字符的随机 `API_KEY_SECRET`；如需外部模型，再填写下文的 `LLM_*` 配置。
2. 执行 `npm install`，再执行 `npm run dev`。
3. 打开 `http://localhost:3000` 签发一个仅显示一次、有效 24 小时的 `sk-` 格式演示 Key。

## 接口

- `POST /api/keys`：签发临时 Key，不会持久化保存 Key。
- `GET /v1/models`：返回 `DeeoSeek-V50-Flash`。
- `POST /v1/chat/completions`：优先调用已配置的外部模型；未配置或上游不可用时返回本地随机文案。支持 OpenAI 兼容的 `stream: true` SSE 响应。

所有 `/v1/*` 接口均需 `Authorization: Bearer <API_KEY>`。Key 无效或过期返回 `401`；合法 Key 在非北京时间周四调用返回 `429 insufficient_quota`。

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-你的临时密钥" \
  -H "Content-Type: application/json" \
  -d '{"model":"DeeoSeek-V50-Flash","messages":[{"role":"user","content":"来一条"}]}'
```

## 外部模型（可选）

服务端通过原生 OpenAI 兼容的 `/chat/completions` 接口调用上游，不依赖特定厂商 SDK。以下配置仅在服务器读取，不会传到前端：

```dotenv
LLM_API_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=
LLM_MODEL=你的真实上游模型名称
LLM_TEMPERATURE=1
LLM_CONTEXT_LENGTH=8192
LLM_MAX_OUTPUT_TOKENS=512
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_API_BASE_URL` | 空 | 上游 `/v1` 基础地址或完整 `/chat/completions` 地址 |
| `LLM_API_KEY` | 空 | 可选；留空时不发送 `Authorization`，适合无需鉴权的本地模型 |
| `LLM_MODEL` | 空 | 真实上游模型名；不会替换接口公开的 `DeeoSeek-V50-Flash` 名称 |
| `LLM_TEMPERATURE` | `1` | 温度，范围 `0–2` |
| `LLM_CONTEXT_LENGTH` | `8192` | 总上下文长度，至少 `256` |
| `LLM_MAX_OUTPUT_TOKENS` | `512` | 最大输出长度，必须小于上下文长度 |

只有 `LLM_API_BASE_URL` 与 `LLM_MODEL` 同时有效时才会启用上游。连接失败、60 秒超时、非成功状态或无效响应都会自动回退到原有本地文案；“你是谁”和自我介绍类问题也会优先交给上游，失败时才使用本地“大肥鱼”文案。客户端提交的模型名、温度和输出长度不会覆盖服务器的上游配置。

服务端会在所有调用最前面加入一段固定 system prompt，要求回答正确回应问题，同时自然包含“疯狂星期四”“v我50”等抽象整活语言；自我介绍时以“爱吃 KFC 的大肥鱼”身份回答。调用方原有 system 消息会原样保留在固定提示词之后。提示词不包含日期、随机数或 Key，从而尽可能保持稳定前缀、提高支持提示词缓存的上游命中率。

输入预算为上下文长度减去最大输出长度。超出预算时会优先删除最早的普通对话，并保留固定提示词、调用方 system 消息和最新消息。Token 数量采用跨模型近似值：中文字符约按一个 Token、其他文本约按四个字符一个 Token 估算，实际计数仍以上游模型为准。

> Vercel 无法访问你个人电脑上的 `127.0.0.1` 或 `localhost`。本地模型只适合同机运行，或者使用部署服务器能够访问的内网地址；部署到 Vercel 时应填写公网可访问且受保护的 HTTPS API。

## Vercel

部署到 Vercel 后，在 Project Settings → Environment Variables 配置强随机的 `API_KEY_SECRET`，并按需配置上述 `LLM_*` 变量。签名 Key 不是数据库记录，因此 Vercel 冷启动不会令仍在有效期内的 Key 失效；不过它不可单独撤销，且本项目未提供限流、审计、用户权限或生产级密钥管理。

运行 `npm run check:copy` 检查预置文案文件的数量、空值和重复项。

## 许可证

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 许可协议。你可以在署名、非商业使用且以相同方式共享的前提下使用和改编本项目；完整条款见 [LICENSE](LICENSE)。
