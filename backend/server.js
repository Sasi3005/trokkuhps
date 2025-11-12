// backend/server.js
"use strict";

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* -------------------------------------------
   Proxy / Cookies (เช่น Railway, Render)
------------------------------------------- */
app.set("trust proxy", 1);

/* -------------------------------------------
   CORS จาก ENV (รองรับทั้ง CORS_ORIGIN และ CORS_ORIGINS)
------------------------------------------- */
const RAW = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "";
const ALLOW_ORIGINS = RAW.split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // ไม่มี Origin (curl/health-check) => อนุญาต
    if (!origin) return cb(null, true);
    // ถ้าไม่ตั้งค่าไว้เลย => อนุญาตทั้งหมด (ใช้ด้วยความระวัง)
    if (ALLOW_ORIGINS.length === 0) return cb(null, true);
    // อนุญาตเฉพาะที่อยู่ในลิสต์
    return cb(null, ALLOW_ORIGINS.includes(origin));
  },
  credentials: true,
};

// ใส่ Vary: Origin เพื่อกัน cache ผิดโดเมน
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

// รองรับ preflight ทุกเส้นทาง
app.options("*", cors(corsOptions));
// ใช้ CORS สำหรับทุก request จริง
app.use(cors(corsOptions));

app.use(express.json());

/* -------------------------------------------
   Health Check
------------------------------------------- */
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    port: Number(process.env.PORT || 5000),
    time: new Date().toISOString(),
  });
});

/* -------------------------------------------
   หน้า root ง่าย ๆ
------------------------------------------- */
app.get("/", (_req, res) => {
  res.send("Restaurant API is running 🚀");
});

/* -------------------------------------------
   รวมทุก routes
------------------------------------------- */
const routes = require("./routes/index");
app.use("/", routes);

/* -------------------------------------------
   404 + Error handler
------------------------------------------- */
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: "NOT_FOUND", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  const msg = typeof err === "string" ? err : (err?.message || "Internal error");
  res.status(500).json({ error: "INTERNAL_ERROR", detail: msg });
});

/* -------------------------------------------
   Start server
------------------------------------------- */
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on :${PORT}`);
});
