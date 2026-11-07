"use strict";
const crypto = require("crypto");
const db = require("../DB/db");

const COOKIE_NAME = "trok_customer_session";
const SESSION_DAYS = 30;
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

function cookieOptions() {
  const secure =
    process.env.AUTH_COOKIE_SECURE === "true" ||
    (process.env.AUTH_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production");

  return {
    httpOnly: true,
    secure,
    sameSite:
      process.env.AUTH_COOKIE_SAMESITE || (secure ? "none" : "lax"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function createSession(userId, res, connection = db) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await connection.query(
    "INSERT INTO customer_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, hashToken(token), expiresAt]
  );

  const options = cookieOptions();
  if (res) res.cookie(COOKIE_NAME, token, options);
  return { token, options };
}

async function customerAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "กรุณาเข้าสู่ระบบก่อนจองโต๊ะ",
      });
    }

    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.phone
       FROM customer_sessions s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW()
       LIMIT 1`,
      [hashToken(token)]
    );

    if (!rows[0]) {
      res.clearCookie(COOKIE_NAME, cookieOptions());
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
      });
    }

    req.customer = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

function requireTrustedOrigin(req, res, next) {
  const origin = req.get("origin");
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (
    !origin ||
    (allowed.length && !allowed.includes(origin)) ||
    (!allowed.length && process.env.NODE_ENV === "production")
  ) {
    return res.status(403).json({
      error: "INVALID_ORIGIN",
      message: "คำขอนี้ไม่ได้รับอนุญาต",
    });
  }

  next();
}

module.exports = {
  COOKIE_NAME,
  createSession,
  customerAuth,
  requireTrustedOrigin,
  hashToken,
  cookieOptions,
};