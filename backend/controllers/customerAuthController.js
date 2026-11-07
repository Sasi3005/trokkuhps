"use strict";
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const db = require("../DB/db");
const { COOKIE_NAME, cookieOptions, createSession, hashToken } = require("../middleware/customerAuth");

const profile = (user) => ({ user_id: user.user_id, name: user.name, email: user.email, phone: user.phone });
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

function validateRegistration(body) {
  const name = String(body?.name || "").trim();
  const email = normalizeEmail(body?.email);
  const phone = String(body?.phone || "").trim();
  const password = String(body?.password || "");
  if (name.length < 2 || name.length > 100) return { error: "กรุณากรอกชื่อ 2–100 ตัวอักษร" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return { error: "กรุณากรอกอีเมลให้ถูกต้อง" };
  if (!/^\d{9,10}$/.test(phone)) return { error: "กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก" };
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์" };
  return { name, email, phone, password };
}

function getMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  if (!host || !user || !pass || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }),
  };
}

async function sendOtp(email, code) {
  const mailer = getMailer();
  if (!mailer) {
    const error = new Error("ยังไม่ได้ตั้งค่าอีเมลสำหรับส่ง OTP บนเซิร์ฟเวอร์");
    error.status = 503;
    throw error;
  }
  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email,
    subject: "รหัสยืนยันการสมัครสมาชิก TROK KU KPS",
    text: `รหัสยืนยันการสมัครสมาชิกของคุณคือ ${code}\nรหัสนี้ใช้ได้ 10 นาที และใช้ได้เพียงครั้งเดียว หากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลนี้ได้`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#183b5c"><p style="color:#6f9cbd;font-weight:bold;letter-spacing:2px">TROK KU KPS</p><h2>ยืนยันอีเมลของคุณ</h2><p>กรอกรหัสนี้ในหน้าสมัครสมาชิกเพื่อยืนยันอีเมล</p><p style="padding:18px;border-radius:12px;background:#edf6fc;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px">${code}</p><p>รหัสใช้ได้ 10 นาทีและใช้ได้เพียงครั้งเดียว หากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลนี้ได้</p></div>`,
  });
}

function createOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

exports.register = async (req, res, next) => {
  try {
    const input = validateRegistration(req.body);
    if (input.error) return res.status(400).json({ message: input.error });
    if (!getMailer()) return res.status(503).json({ message: "ระบบส่งอีเมลยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ" });

    const [existing] = await db.query("SELECT user_id FROM users WHERE email = ? LIMIT 1", [input.email]);
    if (existing.length) return res.status(409).json({ message: "อีเมลนี้มีบัญชีผู้ใช้แล้ว" });

    const [pendingRows] = await db.query("SELECT last_sent_at FROM customer_registration_otps WHERE email = ? LIMIT 1", [input.email]);
    if (pendingRows[0] && Date.now() - new Date(pendingRows[0].last_sent_at).getTime() < 60_000) {
      return res.status(429).json({ message: "ส่งรหัสไปแล้ว กรุณารอ 1 นาทีก่อนขอรหัสใหม่" });
    }

    const code = createOtp();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const codeHash = await bcrypt.hash(code, 10);
    await db.query(
      `INSERT INTO customer_registration_otps
        (email, name, phone, password_hash, otp_hash, expires_at, last_sent_at, attempts)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), password_hash = VALUES(password_hash), otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), last_sent_at = NOW(), attempts = 0`,
      [input.email, input.name, input.phone, passwordHash, codeHash]
    );

    try {
      await sendOtp(input.email, code);
    } catch (mailError) {
      await db.query("DELETE FROM customer_registration_otps WHERE email = ?", [input.email]);
      console.error("Customer registration OTP email failed:", mailError.message);
      return res.status(502).json({ message: "ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าอีเมลหรือทดลองอีกครั้ง" });
    }

    res.status(202).json({ message: "ส่งรหัสยืนยันไปยังอีเมลแล้ว", email: input.email });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "อีเมลนี้มีบัญชีผู้ใช้แล้ว" });
    next(error);
  }
};

exports.resendRegistrationOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
      return res.status(400).json({ message: "กรุณากรอกอีเมลให้ถูกต้อง" });
    }
    if (!getMailer()) return res.status(503).json({ message: "ระบบส่งอีเมลยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ" });
    const [rows] = await db.query("SELECT last_sent_at FROM customer_registration_otps WHERE email = ? LIMIT 1", [email]);
    if (!rows[0]) return res.status(400).json({ message: "ไม่พบรายการสมัคร กรุณากรอกข้อมูลสมัครสมาชิกใหม่" });
    if (Date.now() - new Date(rows[0].last_sent_at).getTime() < 60_000) {
      return res.status(429).json({ message: "กรุณารอ 1 นาทีก่อนขอรหัสใหม่" });
    }
    const code = createOtp();
    const codeHash = await bcrypt.hash(code, 10);
    await db.query(
      "UPDATE customer_registration_otps SET otp_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE), last_sent_at = NOW(), attempts = 0 WHERE email = ?",
      [codeHash, email]
    );
    try {
      await sendOtp(email, code);
    } catch (mailError) {
      console.error("Customer registration OTP resend failed:", mailError.message);
      return res.status(502).json({ message: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ภายหลัง" });
    }
    res.json({ message: "ส่งรหัสยืนยันฉบับใหม่แล้ว", email });
  } catch (error) { next(error); }
};

exports.verifyRegistrationOtp = async (req, res, next) => {
  const connection = await db.getConnection().catch((error) => { throw error; });
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัส OTP 6 หลักให้ถูกต้อง" });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT email, name, phone, password_hash, otp_hash, expires_at, attempts FROM customer_registration_otps WHERE email = ? FOR UPDATE",
      [email]
    );
    const pending = rows[0];
    if (!pending) {
      await connection.rollback();
      return res.status(400).json({ message: "ไม่พบรายการสมัครหรือรหัสหมดอายุ กรุณาสมัครใหม่" });
    }
    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await connection.query("DELETE FROM customer_registration_otps WHERE email = ?", [email]);
      await connection.commit();
      return res.status(400).json({ message: "รหัส OTP หมดอายุแล้ว กรุณาสมัครใหม่เพื่อรับรหัสใหม่" });
    }
    if (Number(pending.attempts) >= 5) {
      await connection.query("DELETE FROM customer_registration_otps WHERE email = ?", [email]);
      await connection.commit();
      return res.status(429).json({ message: "กรอกรหัสผิดเกินกำหนด กรุณาสมัครใหม่เพื่อรับรหัสอีกครั้ง" });
    }

    const valid = await bcrypt.compare(code, pending.otp_hash);
    if (!valid) {
      await connection.query("UPDATE customer_registration_otps SET attempts = attempts + 1 WHERE email = ?", [email]);
      await connection.commit();
      return res.status(400).json({ message: `รหัส OTP ไม่ถูกต้อง (เหลือ ${4 - Number(pending.attempts)} ครั้ง)` });
    }

    const [result] = await connection.query(
      "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
      [pending.name, pending.email, pending.phone, pending.password_hash]
    );
    await connection.query(
      "INSERT INTO customer_registration_history (user_id, registration_source, registered_at, email_verified_at) VALUES (?, 'email_otp', NOW(), NOW())",
      [result.insertId]
    );
    await connection.query(
      "INSERT INTO customer_login_history (user_id, auth_method) VALUES (?, 'email_otp')",
      [result.insertId]
    );
    const session = await createSession(result.insertId, null, connection);
    await connection.query("DELETE FROM customer_registration_otps WHERE email = ?", [email]);
    await connection.commit();

    const user = { user_id: result.insertId, name: pending.name, email: pending.email, phone: pending.phone };
    res.cookie(COOKIE_NAME, session.token, session.options);
    res.status(201).json({ user: profile(user) });
  } catch (error) {
    await connection.rollback().catch(() => {});
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "อีเมลนี้มีบัญชีผู้ใช้แล้ว" });
    next(error);
  } finally {
    connection.release();
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    const [rows] = await db.query("SELECT user_id, name, email, phone, password_hash FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
    const connection = await db.getConnection();
    let session;
    try {
      await connection.beginTransaction();
      await connection.query(
        "INSERT INTO customer_login_history (user_id, auth_method) VALUES (?, 'password')",
        [user.user_id]
      );
      session = await createSession(user.user_id, null, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
    res.cookie(COOKIE_NAME, session.token, session.options);
    res.json({ user: profile(user) });
  } catch (error) { next(error); }
};

exports.me = (req, res) => res.json({ user: profile(req.customer) });

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await db.query("DELETE FROM customer_sessions WHERE token_hash = ?", [hashToken(token)]);
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.status(204).end();
  } catch (error) { next(error); }
};
