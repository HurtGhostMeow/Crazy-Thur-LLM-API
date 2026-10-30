import { KeyIssuer } from "./key-issuer";
import { SpotlightCard } from "../components/SpotlightCard";

export default function Home() {
  const apiBaseUrl = process.env.API_BASE_URL ?? "https://your-api-domain.example/v1";

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="eyebrow"><span className="status-dot" aria-hidden="true" /> DEEPSEEK V50 FLASH · EARLY ACCESS</div>
        <h1 id="page-title">DeepSeek V50 Flash<br /><span>抢先免费体验</span></h1>
        <p className="lead">OpenAI 兼容格式的限时体验入口。每周四开放，领取临时 API Key 后即可连接体验。</p>
      </section>

      <section className="warning" aria-label="重要安全提醒">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Zm0 5.4v5.2m0 3.3h.01" /></svg>
        <div><strong>仅供演示，不能用于生产环境。</strong><span>请勿用于真实业务、保存到仓库、嵌入客户端或共享给他人。</span></div>
      </section>

      <SpotlightCard>
        <KeyIssuer apiBaseUrl={apiBaseUrl} />
      </SpotlightCard>

      <section className="info-grid" aria-label="接口说明">
        <article>
          <span className="info-number">01</span>
          <h2>抢先体验额度</h2>
          <p>临时密钥签发后有效 24 小时，网页不会保存或再次展示。</p>
        </article>
        <article>
          <span className="info-number">02</span>
          <h2>每周四开放</h2>
          <p>北京时间周四 00:00–23:59 开放；其他时间自动进入等候。</p>
        </article>
        <article>
          <span className="info-number">03</span>
          <h2>即插即用</h2>
          <p>支持 <code>/v1/chat/completions</code> 与 <code>/v1/models</code>。</p>
        </article>
      </section>
    </main>
  );
}
