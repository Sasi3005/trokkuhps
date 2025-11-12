"use strict";

const QRCode = require("qrcode");
const Tables = require("../models/tableModel");
const Orders = require("../models/orderModel");

const VALID_ZONES = new Set(["โซนในร้าน", "โซนนอกร้าน"]);

/* ----------------- helpers ----------------- */
function buildQrUrl(tableId) {
  const FRONT = (process.env.FRONT_ORIGIN || "https://trokkuhps.vercel.app").replace(/\/+$/, "");
  const PATH  = process.env.QR_PAGE_PATH || "/#/order";   // ใช้ HashRouter เป็นค่าเริ่มต้น
  const KEY   = process.env.QR_TABLE_PARAM || "tableId";
  const sep   = PATH.includes("?") ? "&" : "?";
  return `${FRONT}${PATH}${sep}${KEY}=${encodeURIComponent(tableId)}`;
}

async function makeQrDataUrlFor(tableId) {
  const url = buildQrUrl(tableId);
  const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: "M" });
  const hours = Number(process.env.QR_EXPIRE_HOURS || 2);
  const expire = new Date(Date.now() + hours * 3600 * 1000);
  return { url, dataUrl, expire };
}

/* ----------------- controller ----------------- */
module.exports = {
  // GET /tables
  async getAllTables(_req, res) {
    try { res.json(await Tables.getAll()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  },

  // GET /tables/:tableNumber   (รองรับทั้ง "A19" หรือ "19")
  async getTableById(req, res) {
    try {
      const t = await Tables.getByNumber(req.params.id);
      if (!t) return res.status(404).json({ message: "Table not found" });
      res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // GET /tables/:tableNumber/orders
  async getTableWithOrders(req, res) {
    try {
      const tn = req.params.id;
      const t = await Tables.getByNumber(tn);
      if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });
      const orders = await Orders.getByTable(t.table_id);
      res.json({ table: t, orders });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // POST /tables
  async createTable(req, res) {
    try {
      const { table_number, zone } = req.body;
      const z = VALID_ZONES.has(zone) ? zone : "โซนในร้าน";
      const id = await Tables.create({ table_number, zone: z });
      res.status(201).json({ message: "Table added!", tableId: id, zone: z });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // PUT /tables/:id
  async updateTable(req, res) {
    try {
      const patch = { ...req.body };
      if (patch.zone && !VALID_ZONES.has(patch.zone)) delete patch.zone;
      await Tables.update(req.params.id, patch);
      res.json({ message: "Table updated!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // DELETE /tables/:id
  async deleteTable(req, res) {
    try { await Tables.delete(req.params.id); res.json({ message: "Table deleted!" }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  },

  // POST /tables/:tableNumber/clear-qr?free=1
  async clearQRCode(req, res) {
    try {
      const t = await Tables.getByNumber(req.params.tableNumber);
      if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });
      await Tables.clearQRCode(t.table_id);
      if (req.query.free === "1") await Tables.update(t.table_id, { status: "ว่าง" });
      res.json({ message: "QR Code ลบเรียบร้อย" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // GET /tables/:tableNumber/qr   -> ส่งไฟล์ PNG จากที่เก็บไว้
  async serveQRCode(req, res) {
    try {
      const t = await Tables.getByNumber(req.params.tableNumber);
      if (!t || !t.qr_code) return res.status(404).send("QR code not found");

      const [meta, base64] = String(t.qr_code).split(",");
      const mime = (meta && meta.startsWith("data:") && meta.includes(";base64"))
        ? meta.substring(5, meta.indexOf(";base64"))
        : "image/png";
      const buf = Buffer.from(base64 || "", "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", buf.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(buf);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // POST /tables/:tableNumber/generate-qr   -> gen QR (ไม่เปลี่ยนสถานะ)
  async generateQRCodeForTable(req, res) {
    try {
      const t = await Tables.getByNumber(req.params.tableNumber);
      if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });

      const { url, dataUrl, expire } = await makeQrDataUrlFor(t.table_id);
      await Tables.update(t.table_id, { qr_code: dataUrl, qr_expire: expire });
      res.json({ qr_code: dataUrl, url, expire });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  // POST /tables/:tableNumber/decision { action: "approve" | "reject" }
  async approveOrRejectTable(req, res) {
    try {
      const { tableNumber } = req.params;
      const { action } = req.body;

      const t = await Tables.getByNumber(tableNumber);
      if (!t) return res.status(404).json({ message: "ไม่พบโต๊ะนี้" });

      if (action === "approve") {
        const { url, dataUrl, expire } = await makeQrDataUrlFor(t.table_id);
        await Tables.update(t.table_id, { status: "กำลังใช้งาน", qr_code: dataUrl, qr_expire: expire });
        return res.json({ message: `อนุมัติโต๊ะ ${tableNumber} แล้ว`, status: "กำลังใช้งาน", qr_code: dataUrl, url, expire, zone: t.zone });
      }

      if (action === "reject") {
        await Tables.clearQRCode(t.table_id);
        await Tables.update(t.table_id, { status: "ว่าง" });
        return res.json({ message: `ปฏิเสธโต๊ะ ${tableNumber} แล้ว (สถานะ: ว่าง)`, status: "ว่าง", zone: t.zone });
      }

      res.status(400).json({ message: "action ต้องเป็น approve หรือ reject เท่านั้น" });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
