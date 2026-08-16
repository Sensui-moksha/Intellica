/**
 * frontendFallback.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a responsive, informative developer and production fallback page
 * when the frontend production build (dist/index.html) has not yet been built.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function renderFallbackHtml({ backendPort = 5001, frontendPort = 5173, frontendDistDir = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Intellica Monorepo — Backend API Online</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(17, 24, 39, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --emerald: #10b981;
      --amber: #f59e0b;
      --code-bg: #030712;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.12) 0px, transparent 50%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      max-width: 680px;
      width: 100%;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald);
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .pulse {
      width: 8px;
      height: 8px;
      background: var(--emerald);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: #ffffff;
    }
    p {
      color: var(--text-muted);
      font-size: 0.9375rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
    }
    .card-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
    .card-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #fff;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--accent);
      color: #0b0f19;
      border: none;
    }
    .btn-primary:hover {
      background: #7dd3fc;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .instructions {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-top: 1.5rem;
    }
    .instructions-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8125rem;
      color: #e5e7eb;
      line-height: 1.5;
      overflow-x: auto;
    }
    .comment { color: #6b7280; }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ INTELLICA MONOREPO</div>
      <div class="status-badge">
        <span class="pulse"></span>
        API Online
      </div>
    </div>

    <h1>Backend API is Running</h1>
    <p>
      The backend server is active on port <strong>${backendPort}</strong>. The frontend production bundle (<code>dist/index.html</code>) has not been built yet or is being developed via the Vite dev server.
    </p>

    <div class="grid">
      <div class="card">
        <div class="card-title">Vite Dev Server</div>
        <div class="card-value">http://localhost:${frontendPort}</div>
      </div>
      <div class="card">
        <div class="card-title">Backend API Base</div>
        <div class="card-value">http://localhost:${backendPort}/api</div>
      </div>
    </div>

    <div class="btn-group">
      <a href="http://localhost:${frontendPort}" class="btn btn-primary">
        🚀 Open Vite Dev Server
      </a>
      <a href="/api/health" class="btn btn-secondary">
        🩺 Check API Health
      </a>
      <button onclick="location.reload()" class="btn btn-secondary">
        🔄 Refresh Page
      </button>
    </div>

    <div class="instructions">
      <div class="instructions-title">Quick Monorepo Commands:</div>
      <pre><code><span class="comment"># 1. Run both frontend & backend concurrently (Development mode):</span>
npm run dev

<span class="comment"># 2. Build frontend for backend production serving:</span>
npm run build

<span class="comment"># 3. Target dist folder:</span>
<span class="comment">${frontendDistDir}</span></code></pre>
    </div>

    <div class="footer">
      Intellica Faculty Appraisal & Research Performance Management Portal
    </div>
  </div>
</body>
</html>`;
}

module.exports = { renderFallbackHtml };
