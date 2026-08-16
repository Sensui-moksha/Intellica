/**
 * monorepoConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the sibling frontend's vite.config.js to auto-detect:
 *   - The Vite dev server port (default: 5173)
 *   - The proxy target (backend API URL)
 *
 * Then returns a computed list of allowed CORS origins so the backend
 * never needs hardcoded frontend URLs.
 *
 * Priority order for the frontend URL:
 *   1. FRONTEND_URL env var (explicit override for production/staging)
 *   2. Parsed from ../frontend/vite.config.js  (monorepo auto-detect)
 *   3. Fallback: http://localhost:5173          (Vite default)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

/** Safely parse a number from an env string */
const envInt = (key, fallback) => {
  const v = parseInt(process.env[key], 10);
  return Number.isFinite(v) ? v : fallback;
};

/**
 * Extract the Vite dev server port from the raw vite.config.js text.
 * Handles both quoted and unquoted port values.
 */
function parseVitePort(src) {
  // Match:  port: 5173  or  port: "5173"
  const m = src.match(/server\s*:\s*\{[^}]*port\s*:\s*["']?(\d+)["']?/s);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * Locate frontend vite.config.js across multiple possible monorepo structures
 */
function findViteConfigFile() {
  const candidatePaths = [
    path.resolve(__dirname, "../../frontend/vite.config.js"),
    path.resolve(__dirname, "../../frontend/vite.config.ts"),
    path.resolve(process.cwd(), "../frontend/vite.config.js"),
    path.resolve(process.cwd(), "frontend/vite.config.js"),
    path.resolve(process.cwd(), "vite.config.js")
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Locate frontend dist directory across multiple possible monorepo structures
 */
function findFrontendDistDir() {
  const candidatePaths = [
    path.resolve(__dirname, "../../frontend/dist"),
    path.resolve(__dirname, "../frontend/dist"),
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(__dirname, "dist"),
    path.resolve(process.cwd(), "dist")
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  return path.resolve(__dirname, "../frontend/dist");
}

/**
 * Load and return the computed monorepo configuration.
 * This function is called ONCE at server boot and results are cached.
 */
function loadMonorepoConfig() {
  const backendPort = envInt("PORT", 5001);
  const viteCfgPath = findViteConfigFile();
  const frontendDistDir = findFrontendDistDir();

  let detectedFrontendPort = 5173; // Vite default
  let viteConfigFound      = false;

  // ── Try to read the vite.config.js ──────────────────────────────────────
  if (viteCfgPath) {
    try {
      const src  = fs.readFileSync(viteCfgPath, "utf8");
      const port = parseVitePort(src);
      if (port) {
        detectedFrontendPort = port;
      }
      viteConfigFound = true;
    } catch (e) {
      // Config unreadable — fall back to default
    }
  }

  // Allow env override to trump everything
  const frontendPort = envInt("FRONTEND_PORT", detectedFrontendPort);

  // Build allowed origin list: localhost + 127.0.0.1 variants for the detected port
  const localOrigins = [
    `http://localhost:${frontendPort}`,
    `http://127.0.0.1:${frontendPort}`,
  ];

  // Extra origins from ALLOWED_ORIGINS env var (comma-separated list for staging/prod)
  const extraOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [...new Set([...localOrigins, ...extraOrigins])];
  const distExists = fs.existsSync(frontendDistDir);
  const indexHtmlExists = fs.existsSync(path.join(frontendDistDir, "index.html"));

  // Log discovery results at boot
  console.log("🗂️  Monorepo config:");
  console.log(`   vite.config.js found : ${viteConfigFound} ${viteCfgPath ? `(${viteCfgPath})` : ""}`);
  console.log(`   Frontend origin(s)   : ${allowedOrigins.join(", ")}`);
  console.log(`   Frontend dist path   : ${frontendDistDir} (exists: ${distExists}, index.html: ${indexHtmlExists})`);
  console.log(`   Backend port         : ${backendPort}`);

  return {
    backendPort,
    frontendPort,
    allowedOrigins,
    viteConfigFound,
    frontendDistDir,
  };
}

// Cache result — config is static after boot
let _cache = null;
function getMonorepoConfig() {
  if (!_cache) _cache = loadMonorepoConfig();
  return _cache;
}

module.exports = { getMonorepoConfig, findFrontendDistDir };

