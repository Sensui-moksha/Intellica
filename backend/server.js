const express  = require("express");
const http     = require("http");
const mongoose = require("mongoose");
const cors     = require("cors");
const session  = require("express-session");
const MongoStore = require("connect-mongo");
const path     = require("path");
const fs       = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initSocket } = require("./utils/socket");

// ── 1. Validate env vars ────────────────────────────────────────────────────
require("./utils/validateEnv");

// ── 2. Auto-detect monorepo config (Vite port, CORS origins, Frontend dist) ─
const { getMonorepoConfig, findFrontendDistDir } = require("./utils/monorepoConfig");
const { allowedOrigins, backendPort, frontendPort, frontendDistDir } = getMonorepoConfig();
const { renderFallbackHtml } = require("./utils/frontendFallback");

// ── 3. Routes ────────────────────────────────────────────────────────────────
const authRoutes         = require("./routes/authRoutes");
const adminRoutes        = require("./routes/adminRoutes");
const uploadRoutes       = require("./routes/uploadRoutes");
const hodRoutes          = require("./routes/hodRoutes");
const facultyRoutes      = require("./routes/facultyRoutes");
const reportRoutes       = require("./routes/reportRoutes");
const creditConfigRoutes = require("./routes/creditConfigRoutes");
const rankingRoutes      = require("./routes/rankingroutes");
const categoryRoutes     = require("./routes/categoryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// ── 4. Security middleware ────────────────────────────────────────────────────
const {
  helmetMiddleware,
  pathHeadersMiddleware,
  apiLimiter,
} = require("./middleware/securityMiddleware");

// ── 5. Express app ────────────────────────────────────────────────────────────
const app = express();

// Trust reverse proxy (Traefik / Coolify / Nginx) for HTTPS headers & client IP
app.set("trust proxy", 1);

/* ═══════════════════════════════════════════════════════════════════════════
   MIDDLEWARE STACK  (order matters)
═══════════════════════════════════════════════════════════════════════════ */

// (a) Helmet — comprehensive HTTP security headers
app.use(helmetMiddleware);

// (b) Per-path header overrides (frame-ancestors for uploads, cache-control for auth)
app.use(pathHeadersMiddleware);

// (c) CORS — auto-configured for monorepo and production domain
app.use(cors({
  origin: true,                                         // dynamically reflect request origin
  credentials: true,                                    // required for cookies & auth headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
}));

// (d) Body parsers — with size limits to prevent payload-flooding DoS
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// (e) Session middleware — httpOnly browser cookie + MongoStore persistence
//     The session provides an alternative to JWT for browser clients.
//     JWT Bearer tokens still work for API/mobile clients (see authMiddleware).
const IS_PROD = process.env.NODE_ENV === "production";

app.use(session({
  name: "intellica.sid",                               // custom cookie name (not default 'connect.sid')
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: (MongoStore.create || MongoStore.default?.create || MongoStore.MongoStore?.create)({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 8 * 60 * 60,                                 // 8 hours (matches JWT expiry)
    autoRemove: "native",
  }),
  cookie: {
    httpOnly: true,                                    // invisible to JS — XSS proof
    secure: "auto",                                    // auto-detect HTTPS based on trust proxy
    sameSite: "lax",                                   // CSRF protection without redirect loops
    maxAge: 8 * 60 * 60 * 1000,                       // 8 hours in ms
  },
}));

// (f) General API rate limiter (200 req/min per IP)
app.use("/api", apiLimiter);

// (g) Static uploads — served with relaxed frame policy for PDF preview
const { getUploadBaseDir } = require("./utils/storagePath");
app.use("/uploads", express.static(getUploadBaseDir(), {
  setHeaders: (res) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://* https://*");
    res.removeHeader("X-Frame-Options");
  },
}));

// Smart fallback for uploads if exact file is missing (e.g. extension mismatch .jpg vs .png or legacy paths)
app.use("/uploads", (req, res, next) => {
  try {
    const reqRelPath = decodeURI(req.path).replace(/^\/+/, "");
    if (!reqRelPath) return next();

    const baseDir = getUploadBaseDir();
    const directPath = path.join(baseDir, reqRelPath);
    if (fs.existsSync(directPath)) {
      return res.sendFile(directPath);
    }

    // Try alternative image extensions (.png, .jpg, .jpeg, .webp)
    const ext = path.extname(reqRelPath);
    if (ext) {
      const withoutExt = reqRelPath.slice(0, reqRelPath.length - ext.length);
      for (const altExt of [".png", ".jpg", ".jpeg", ".webp"]) {
        const altFile = path.join(baseDir, `${withoutExt}${altExt}`);
        if (fs.existsSync(altFile)) {
          return res.sendFile(altFile);
        }
      }
    }

    // If looking for admin profile pic, check legacy admin/ folder
    if (reqRelPath.includes("ADMIN") && reqRelPath.includes("profile_pic")) {
      for (const altExt of [".png", ".jpg", ".jpeg", ".webp"]) {
        const adminFile = path.join(baseDir, "admin", `profile_image${altExt}`);
        if (fs.existsSync(adminFile)) {
          return res.sendFile(adminFile);
        }
      }
    }
  } catch (_) {}

  return res.status(404).end();
});

/* ═══════════════════════════════════════════════════════════════════════════
   API ROUTES
   Auth routes carry their own per-endpoint rate limiters (authRoutes.js)
═══════════════════════════════════════════════════════════════════════════ */
app.use("/api/rank",         require("./routes/rankRoutes"));
app.use("/api/auth",         authRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/uploads",      uploadRoutes);
app.use("/api/hod",          hodRoutes);
app.use("/api/faculty",      facultyRoutes);
app.use("/api/reports",      reportRoutes);
app.use("/api/credit-config",creditConfigRoutes);
app.use("/api/ranking",      rankingRoutes);
app.use("/api/categories",   categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activities",   require("./routes/activityRoutes"));
app.use("/api/pbas",           require("./routes/pbasRoutes"));
app.use("/api/academic-years", require("./routes/academicYearRoutes"));

/* ═══════════════════════════════════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════════════════════════════════ */
app.get("/api/health", (req, res) => {
  res.json({
    status:      "OK",
    timestamp:   new Date().toISOString(),
    authMethods: ["session-cookie", "jwt-bearer"],
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC FRONTEND (after API routes)
═══════════════════════════════════════════════════════════════════════════ */
const activeDistDir = frontendDistDir || findFrontendDistDir();
if (fs.existsSync(activeDistDir)) {
  app.use(express.static(activeDistDir, {
    maxAge: "1d",
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPA FALLBACK — serve index.html for all non-API routes or render fallback
═══════════════════════════════════════════════════════════════════════════ */
app.get("*", (req, res) => {
  // If requesting an unhandled API, uploads, or missing static assets (.js, .css, etc.)
  if (
    req.path.startsWith("/uploads") ||
    req.path.startsWith("/api") ||
    req.path.startsWith("/assets") ||
    /\.(js|mjs|jsx|css|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map)$/i.test(req.path)
  ) {
    return res.status(404).json({
      message: `Resource '${req.originalUrl}' not found`,
      path: req.originalUrl
    });
  }

  // Check dynamically if frontend dist/index.html is available
  const currentDistDir = frontendDistDir || findFrontendDistDir();
  const indexPath = path.join(currentDistDir, "index.html");

  if (fs.existsSync(indexPath)) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.sendFile(indexPath);
  }

  // Fallback: If frontend is not built yet, guide the user / developer
  if (req.accepts("html")) {
    return res.status(200).send(renderFallbackHtml({
      backendPort,
      frontendPort,
      frontendDistDir: currentDistDir,
    }));
  }

  return res.status(404).json({
    status: "ready",
    message: "Intellica backend API is active. Frontend production build (dist) not found.",
    frontendDistDir: currentDistDir,
    viteDevUrl: `http://localhost:${frontendPort}`,
    backendHealthUrl: "/api/health",
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER — sanitize: never leak stack traces to client
═══════════════════════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error("[ERROR]", err.message || err);

  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: "Access denied: CORS policy" });
  }

  res.status(err.status || 500).json({
    message: IS_PROD
      ? "An unexpected error occurred"
      : (err.message || "Server error"),
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   HTTP SERVER & REAL-TIME WEBSOCKETS (SOCKET.IO)
═══════════════════════════════════════════════════════════════════════════ */
const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

/* ═══════════════════════════════════════════════════════════════════════════
   START
═══════════════════════════════════════════════════════════════════════════ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅  MongoDB connected");

    // Auto-seed database if SEEDER=true in .env or if Category collection is incomplete
    const isSeederEnabled = String(process.env.SEEDER || process.env.seeder || "").trim().toLowerCase() === "true";
    const CategoryModel = require("./models/Category");
    const categoryCount = await CategoryModel.countDocuments();
    if (isSeederEnabled || categoryCount < 30) {
      console.log(`🌱  Auto-seeder triggered (SEEDER=${isSeederEnabled}, categoryCount=${categoryCount}). Seeding 34 categories...`);
      try {
        const seedDatabase = require("./seedDatabase");
        await (seedDatabase.seedDatabase || seedDatabase)({ reset: false, disconnect: false });
        console.log("🌱  Auto-seeding completed successfully.");
      } catch (seedErr) {
        console.error("⚠️  Auto-seed warning:", seedErr.message);
      }
    }

    httpServer.listen(backendPort, () => {
      console.log(`🚀  Intellica API running on http://localhost:${backendPort}`);
      console.log(`🔐  Auth: session-cookie + jwt-bearer (hybrid)`);
      console.log(`⚡  Real-time WebSockets: Socket.IO initialized`);
    });
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  });