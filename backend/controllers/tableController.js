"use strict";

const QRCode = require("qrcode");
const Tables = require("../models/tableModel");
const Orders = require("../models/orderModel");

// โซนที่อนุญาต (กันข้อมูลมั่วจาก client)
const validZones = ["โซนในร้าน", "โซนนอกร้าน"];

// FRONTEND_URL ใช้สร้างลิงก์ใน QR
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

module.exports = {
  /* ==================== READ ==================== */
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

  /* ==================== WRITE ==================== */
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

  /* ==================== QR ==================== */
  // แก้ให้รองรับ :tableNumber จาก route
  async clearQRCode(req, res) {
    try {
      const { free } = req.query;
      const tableNumber = req.params.tableNumber || req.params.id; // เผื่อเรียกผ่าน /:id เดิม
      if (!tableNumber) return res.status(400).json({ message: "missing tableNumber" });

      const t = await Tables.getByNumber(tableNumber);
      if (!t) return res.status(404).json({ message: "table not found" });

      await Tables.clearQRCodeByNumber(tableNumber);
      if (free === "1") await Tables.setStatusByNumber(tableNumber, "ว่าง");

      res.json({ message: "QR Code ลบเรียบร้อย" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  // แก้ให้รองรับ :tableNumber จาก route
  async serveQRCode(req, res) {
    try {
      const tableNumber = req.params.tableNumber || req.params.id;
      if (!tableNumber) return res.status(400).send("missing tableNumber");
      const t = await Tables.getByNumber(tableNumber);
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

  /* =============== approve / reject / cancel =============== */
  async approveOrRejectTable(req, res) {
    try {
      const { tableNumber } = req.params;
      const { action } = req.body; // "approve" | "reject" | "cancel"

      if (!tableNumber) return res.status(400).json({ message: "missing tableNumber" });
      if (!["approve", "reject", "cancel"].includes(action)) {
        return res.status(400).json({ message: "action ต้องเป็น approve / reject / cancel" });
      }

      const t = await Tables.getByNumber(tableNumber);
      if (!t) return res.status(404).json({ message: "ไม่พบโต๊ะนี้" });

      // zone เรียกจากตาราง ถ้ามี
      const zone = t.zone || null;

      if (action === "approve") {
        // สร้าง URL สำหรับเปิดหน้าออเดอร์ของโต๊ะนี้
        const url = `${FRONTEND_URL.replace(/\/$/, "")}/order?tableId=${t.table_id}`;

        // gen QR → dataURL
        const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
        const expire = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 ชั่วโมง

        // อัปเดตสถานะโต๊ะ
        await Tables.update(t.table_id, {
          status: "กำลังใช้งาน",
          qr_code: qrDataUrl,
          qr_expire: expire
        });

        return res.json({
          message: `อนุมัติโต๊ะ ${tableNumber} แล้ว`,
          action,
          table: tableNumber,
          zone,
          status: "กำลังใช้งาน",
          qr_code: qrDataUrl,
          expire,
          url
        });
      }

      // reject / cancel = ลบ QR + คืนสถานะ "ว่าง"
      await Tables.clearQRCodeByNumber(tableNumber);
      await Tables.setStatusByNumber(tableNumber, "ว่าง");

      return res.json({
        message: `${action === "cancel" ? "ยกเลิกโต๊ะ" : "ปฏิเสธโต๊ะ"} ${tableNumber} แล้ว (สถานะ: ว่าง)`,
        action,
        table: tableNumber,
        zone,
        status: "ว่าง",
        qr_code: null
      });
    } catch (e) {
      console.error("approveOrRejectTable error:", e);
      res.status(500).json({ error: e.message });
    }
  }
};
