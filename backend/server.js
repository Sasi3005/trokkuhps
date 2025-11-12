// backend/server.js
"use strict";
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ---------- CORS (รองรับ CORS_ORIGINS และ CORS_ORIGIN + wildcard) ---------- */
function parseAllowlist(str) {
  return String(str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}
const allowlistRaw = [
  ...parseAllowlist(process.env.CORS_ORIGINS),  // plural
  ...parseAllowlist(process.env.CORS_ORIGIN),   // singular
];
const allowlist = allowlistRaw.length ? allowlistRaw : []; // [] = อนุญาตทั้งหมด

const corsOptions = {
  origin(origin, cb) {
    // ไม่มี origin (เช่น curl/health) => allow
    if (!origin) return cb(null, true);
    if (allowlist.length === 0) return cb(null, true);

    // ตรงตัวก่อน
    if (allowlist.includes(origin)) return cb(null, true);

    // รองรับ wildcard เช่น https://*.vercel.app
    const ok = allowlist.some(p => {
      if (!p.includes("*")) return false;
      const re = new RegExp("^" + p
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*") + "$");
      return re.test(origin);
    });

    return cb(ok ? null : new Error("CORS blocked for " + origin), ok);
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
};
app.use(cors(corsOptions));

// ตอบ preflight ให้ไว
app.options("*", cors(corsOptions));

app.use(express.json());

/* ---------- Health ---------- */
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    port: Number(process.env.PORT || 5000),
    time: new Date().toISOString(),
  });
});

/* ---------- Root ---------- */
app.get("/", (_req, res) => {
  res.send("Restaurant API is running 🚀");
});

/* ---------- Routes ---------- */
const routes = require("./routes/index");
app.use("/", routes);

/* ---------- 404 & Error ---------- */
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: "NOT_FOUND", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  const msg = typeof err === "string" ? err : (err?.message || "Internal error");
  res.status(500).json({ error: "INTERNAL_ERROR", detail: msg });
});

/* ---------- Start ---------- */
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Server running on :", PORT);
  console.log("CORS allowlist:", allowlist.length ? allowlist : "(ALL)");
  console.log("FRONT_ORIGIN:", process.env.FRONT_ORIGIN);
  console.log("QR_PAGE_PATH :", process.env.QR_PAGE_PATH);
  console.log("DB_HOST/NAME :", process.env.DB_HOST, process.env.DB_NAME);
});
