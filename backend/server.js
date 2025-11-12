// backend/server.js
"use strict";

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ---------------------------------
   CORS แบบยืดหยุ่น + ปลอดภัย
---------------------------------- */
// อ่านได้ทั้ง CORS_ORIGIN และ CORS_ORIGINS
const RAW = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "";
const ALLOW_ORIGINS = RAW.split(",").map(s => s.trim()).filter(Boolean);

function isLocalLike(host) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
  );
}

const corsOptions = {
  origin(origin, cb) {
    // ไม่มี Origin (curl/health-check) => อนุญาต
    if (!origin) return cb(null, true);

    // ถ้าไม่กำหนด ENV เลย => อนุญาตทั้งหมด (ควรเลี่ยงในโปรดักชัน)
    if (ALLOW_ORIGINS.length === 0) return cb(null, true);

    // ตรงกับรายการ ENV
    if (ALLOW_ORIGINS.includes(origin)) return cb(null, true);

    // ตรวจโดเมน
    try {
      const { hostname } = new URL(origin);

      // อนุญาตทุก subdomain ของ vercel.app (รองรับ preview)
      if (hostname.endsWith(".vercel.app")) return cb(null, true);

      // อนุญาต localhost / IP ภายใน (สำหรับ dev)
      if (isLocalLike(hostname)) return cb(null, true);
    } catch (_) {
      // parse ไม่ได้ = ไม่ผ่าน
    }

    // ไม่อนุญาต
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "Content-Type", "Content-Disposition"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // รองรับ preflight
app.use(express.json({ limit: "2mb" }));

/* ---------------------------------
   Health check มาก่อนรวม routes
---------------------------------- */
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    port: Number(process.env.PORT || 5000),
    time: new Date().toISOString(),
  });
});

/* ---------------------------------
   Root ง่าย ๆ
---------------------------------- */
app.get("/", (_req, res) => {
  res.send("Restaurant API is running 🚀");
});

/* ---------------------------------
   รวม routes
---------------------------------- */
const routes = require("./routes/index");
app.use("/", routes);

/* ---------------------------------
   404 + Error handler
---------------------------------- */
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: "NOT_FOUND", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  const msg = typeof err === "string" ? err : (err?.message || "Internal error");
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", err);
  }
  res.status(500).json({ error: "INTERNAL_ERROR", detail: msg });
});

/* ---------------------------------
   Start server
---------------------------------- */
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on :${PORT}`);
});
