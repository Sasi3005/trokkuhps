"use strict";
const db = require("../DB/db");

const ALLOWED = new Set(["ว่าง", "จองแล้ว", "กำลังใช้งาน"]);
const ZONES = new Set(["โซนในร้าน", "โซนนอกร้าน"]);

function mustAllowedStatus(s) {
  const v = String(s ?? "").trim();
  if (!v) return null;
  if (!ALLOWED.has(v)) throw new Error("invalid table status: " + v);
  return v;
}
function mustAllowedZone(z) {
  if (z == null) return null;
  const v = String(z).trim();
  if (!ZONES.has(v)) throw new Error("invalid table zone: " + v);
  return v;
}

async function getAll() {
  const [rows] = await db.query(
    `SELECT table_id, table_number, zone, status, qr_code, qr_expire
     FROM tables ORDER BY table_number ASC`
  );
  return rows;
}

/** รองรับทั้งเลข id (19) และรหัสโต๊ะ (A19) */
async function getByNumber(n) {
  const s = String(n);
  const asNum = Number(s);
  const [rows] = await db.query(
    `SELECT table_id, table_number, zone, status, qr_code, qr_expire
     FROM tables
     WHERE table_number = ? OR table_id = ?
     LIMIT 1`,
    [s, Number.isFinite(asNum) ? asNum : null]
  );
  return rows?.[0] || null;
}

async function getById(id) {
  const [rows] = await db.query(
    `SELECT table_id, table_number, zone, status, qr_code, qr_expire
     FROM tables WHERE table_id = ?`,
    [id]
  );
  return rows?.[0] || null;
}

async function create({ table_number, zone = "โซนในร้าน", status = "ว่าง" }) {
  mustAllowedStatus(status);
  mustAllowedZone(zone);
  const [rs] = await db.query(
    `INSERT INTO tables (table_number, zone, status) VALUES (?, ?, ?)`,
    [String(table_number), zone, status]
  );
  return rs.insertId;
}

async function update(id, patch = {}) {
  const sets = [], params = [];
  if (patch.table_number != null) { sets.push("table_number = ?"); params.push(String(patch.table_number)); }
  if (patch.zone != null)         { sets.push("zone = ?");         params.push(mustAllowedZone(patch.zone)); }
  if (patch.status != null)       { sets.push("status = ?");       params.push(mustAllowedStatus(patch.status)); }
  if (patch.qr_code !== undefined){ sets.push("qr_code = ?");      params.push(patch.qr_code || null); }
  if (patch.qr_expire !== undefined){ sets.push("qr_expire = ?");  params.push(patch.qr_expire || null); }
  if (!sets.length) return 0;
  params.push(id);
  const sql = `UPDATE tables SET ${sets.join(", ")} WHERE table_id = ?`;
  const [r] = await db.query(sql, params);
  return r.affectedRows || 0;
}

async function setStatusByNumber(table_number, status) {
  mustAllowedStatus(status);
  const [r] = await db.query(
    `UPDATE tables SET status = ? WHERE table_number = ?`,
    [status, String(table_number)]
  );
  return r.affectedRows || 0;
}

async function remove(id) {
  const [r] = await db.query(`DELETE FROM tables WHERE table_id = ?`, [id]);
  return r.affectedRows || 0;
}

async function clearQRCode(id) {
  const [r] = await db.query(
    `UPDATE tables SET qr_code = NULL, qr_expire = NULL WHERE table_id = ?`,
    [id]
  );
  return r.affectedRows || 0;
}

module.exports = {
  getAll,
  getByNumber,
  getById,
  create,
  update,
  setStatusByNumber,
  delete: remove,
  clearQRCode,
};
