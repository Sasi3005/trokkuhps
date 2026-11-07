"use strict";

const QRCode = require("qrcode");
const Bookings = require("../models/bookingsModel");
const Tables   = require("../models/tableModel");

const ALLOWED = new Set(["pending", "confirmed", "cancelled", "seated", "done"]);
const TABLE_STATUS = {
  pending:   "จองแล้ว",
  confirmed: "กำลังใช้งาน",
  seated:    "กำลังใช้งาน",
  cancelled: "ว่าง",
  done:      "ว่าง",
};

const mapBooking = (r) => ({
  booking_id: r.booking_id,
  name: r.name,
  phone: r.phone,
  table_number: r.table_number,
  date: r.date,
  time: r.time,
  zone: r.zone,
  created_at: r.created_at,
  has_slip: !!r.has_slip,
  slip_url: r.has_slip ? `/bookings/${r.booking_id}/slip` : null,
  guests: 1,
  status: r.status || "pending",
  note: r.note || "",
});

module.exports = {
  async list(req, res) {
    try {
      const rows = await Bookings.getAll();
      res.json(rows.map(mapBooking));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req, res) {
    try {
      const b = req.body || {};
      const f = req.file || null;

      const { name, phone, table_number, date, time, zone = "โซนในร้าน" } = b;

      if (!name || !phone || !table_number || !date || !time)
        return res.status(400).json({ error: "missing fields" });

      const table = typeof table_number === "string" && await Tables.getByNumber(table_number);
      if (!table) return res.status(400).json({ error: "ไม่พบโต๊ะที่เลือก" });

      const qrUrl = new URL("/", req.get("origin"));
      qrUrl.searchParams.set("bookingTable", table.table_number);
      const qr_code = await QRCode.toDataURL(qrUrl.href, { width: 256 });

      const slip = f ? { mime: f.mimetype, filename: f.originalname, size: f.size, buffer: f.buffer } : null;
      const booking = await Bookings.create({ user_id: req.customer.user_id, name, phone, table_number: table.table_number, start_at: `${date} ${time}`, zone, slip });

      try { await Tables.setStatusByNumber(table.table_number, "จองแล้ว"); } 
      catch(err) { console.error("Tables.setStatusByNumber error:", err); }

      res.status(201).json({ message: "จองโต๊ะสำเร็จ", booking_id: booking.id, table_number: table.table_number, qr_code });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

      const b = req.body;
      const f = req.file || null;

      // --- update status only ---
      const { status } = b;
      if (status) {
        if (!ALLOWED.has(status)) return res.status(400).json({ error: "invalid status", allowed: [...ALLOWED] });
        const affected = await Bookings.updateStatus(id, status);
        if (affected === 0) return res.status(404).json({ error: "not found" });

        const row = await Bookings.getById(id);
        if (row?.table_number) {
          await Tables.setStatusByNumber(row.table_number, TABLE_STATUS[status] || "ว่าง");
        }
        return res.json({ ok: true, booking_id: id, status });
      }

      // --- update full booking info ---
      const zone = b.zone && ["โซนในร้าน", "โซนนอกร้าน"].includes(b.zone) ? b.zone : "โซนในร้าน";

      const payload = {
        name: b.name,
        phone: b.phone,
        table_number: b.table_number,
        date: b.date,
        time: b.time,
        zone,
        slip: f ? { mime: f.mimetype, filename: f.originalname, size: f.size, buffer: f.buffer } : undefined
      };

      if (!payload.name || !payload.phone || !payload.table_number || !payload.date || !payload.time)
        return res.status(400).json({ error: "missing fields" });

      await Bookings.updateById(id, payload);

      // update table status if status changed
      if (payload.status) {
        await Tables.setStatusByNumber(payload.table_number, TABLE_STATUS[payload.status] || "ว่าง");
      }

      res.json({ booking_id: id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async remove(req, res) {
    try {
      await Bookings.deleteById(req.params.id);
      res.json({ booking_id: req.params.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async streamSlip(req, res) {
    try {
      const row = await Bookings.getSlipByBookingId(req.params.id);
      if (!row || !row.slip_blob) return res.status(404).json({ error: "ไม่พบสลิป" });

      res.setHeader("Content-Type", row.slip_mime || "application/octet-stream");
      if (row.slip_filename) res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.slip_filename)}"`);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).send(row.slip_blob);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};
