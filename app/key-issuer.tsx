"use client";

import { useState } from "react";

type KeyResponse = { apiKey: string; expiresAt: string };

type KeyIssuerProps = {
  apiBaseUrl: string;
};

export function KeyIssuer({ apiBaseUrl }: KeyIssuerProps) {
  const [apiKey, setApiKey] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function issueKey() {
    setLoading(true);
    setMessage("");
    setApiKey("");
    try {
      const response = await fetch("/api/keys", { method: "POST" });
      const payload = (await response.json()) as KeyResponse | { error?: { message?: string } };
      if (!response.ok || !("apiKey" in payload)) {
        throw new Error("error" in payload ? payload.error?.message || "暂时无法签发密钥。" : "暂时无法签发密钥。");
      }
      setApiKey(payload.apiKey);
      setExpiresAt(new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short", hour12: false,
      }).format(new Date(payload.expiresAt)));
      setMessage("体验密钥已生成。请现在复制；刷新或离开页面后无法找回。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法签发密钥。");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage("已复制到剪贴板。请妥善保管，并避免用于生产环境。");
    } catch {
      setMessage("复制失败，请手动选择并复制密钥。");
    }
  }

  return (
    <div className="key-card" aria-labelledby="key-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">FREE EARLY ACCESS</p>
          <h2 id="key-title">领取你的体验密钥</h2>
        </div>
        <span className="pill">24H</span>
      </div>
      <div className="endpoint-placeholder" aria-label="API 地址">
        <span>API 地址</span>
        <code>{apiBaseUrl}</code>
        <small>由项目运行配置提供</small>
      </div>
      <button className="primary-button" type="button" onClick={issueKey} disabled={loading}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14a5 5 0 1 1 4.7 3.32L9 20H6v-3l2.11-2.11A5 5 0 0 1 7 14Zm10-5h.01" /></svg>
        {loading ? "正在生成…" : "获取免费体验 Key"}
      </button>

      {apiKey && (
        <div className="key-result">
          <label htmlFor="api-key">你的体验 API Key（仅本次展示）</label>
          <div className="key-field">
            <input id="api-key" readOnly value={apiKey} aria-describedby="key-expiry" />
            <button type="button" onClick={copyKey}>复制</button>
          </div>
          <p id="key-expiry">将于北京时间 {expiresAt} 失效。</p>
        </div>
      )}
      <p className={`live-message${message && !apiKey ? " error" : ""}`} aria-live="polite">{message}</p>
    </div>
  );
}
