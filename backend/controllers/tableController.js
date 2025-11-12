"use strict";

const QRCode = require("qrcode");
const Tables = require("../models/tableModel");
const Orders = require("../models/orderModel");

const validZones = ["โซนในร้าน", "โซนนอกร้าน"];

module.exports = {
  async getAllTables(_req, res) {
    try {
      res.json(await Tables.getAll());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getTableById(req, res) {
    try {
      const t = await Tables.getById(req.params.id);
      if (!t) return res.status(404).json({ message: "Table not found" });
      res.json(t);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getTableWithOrders(req, res) {
    try {
      const id = req.params.id;
      const t = await Tables.getById(id);
      if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });
      const orders = await Orders.getByTable(id);
      res.json({ table: t, orders });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async createTable(req, res) {
    try {
      const { table_number, zone } = req.body;
      const selectedZone = validZones.includes(zone) ? zone : "โซนในร้าน";

      const id = await Tables.create({ table_number, zone: selectedZone });
      res.status(201).json({ message: "Table added!", tableId: id, zone: selectedZone });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async updateTable(req, res) {
    try {
      const { zone } = req.body;
      const updates = { ...req.body };
      if (zone && validZones.includes(zone)) updates.zone = zone;

      await Tables.update(req.params.id, updates);
      res.json({ message: "Table updated!" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async deleteTable(req, res) {
    try {
      await Tables.delete(req.params.id);
      res.json({ message: "Table deleted!" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async clearQRCode(req, res) {
    try {
      const { free } = req.query;
      await Tables.clearQRCode(req.params.id);
      if (free === "1") await Tables.update(req.params.id, { status: "ว่าง" });
      res.json({ message: "QR Code ลบเรียบร้อย" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async serveQRCode(req, res) {
    try {
      const t = await Tables.getById(req.params.id);
      if (!t || !t.qr_code) return res.status(404).send("QR code not found");
      const [meta, base64] = String(t.qr_code).split(",");
      const mime = (meta && meta.startsWith("data:") && meta.includes(";base64"))
        ? meta.substring(5, meta.indexOf(";base64"))
        : "image/png";
      const buf = Buffer.from(base64, "base64");
      res.writeHead(200, { "Content-Type": mime, "Content-Length": buf.length });
      res.end(buf);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async approveOrRejectTable(req, res) {
  try {
    const { tableNumber } = req.params;
    const { action } = req.body;

    const t = await Tables.getByNumber(tableNumber);
    if (!t) return res.status(404).json({ message: "ไม่พบโต๊ะนี้" });

    if (action === "approve") {
      const url = `http://localhost:5173/order?tableId=${t.table_id}`;
      const qrDataUrl = await QRCode.toDataURL(url);
      const expire = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // ✅ เปลี่ยนสถานะเป็นกำลังใช้งาน + สร้าง QR
      await Tables.update(t.table_id, {
        status: "กำลังใช้งาน",
        qr_code: qrDataUrl,
        qr_expire: expire
      });

      return res.json({
        message: `อนุมัติโต๊ะ ${tableNumber} แล้ว`,
        status: "กำลังใช้งาน",
        qr_code: qrDataUrl,
        expire
      });
    }

    if (action === "reject") {
      await Tables.clearQRCode(t.table_id);
      await Tables.setStatusByNumber(tableNumber, "ว่าง");

      return res.json({
        message: `ปฏิเสธโต๊ะ ${tableNumber} แล้ว (สถานะ: ว่าง)`,
        status: "ว่าง"
      });
    }

    res.status(400).json({ message: "action ต้องเป็น approve หรือ reject เท่านั้น" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
};

