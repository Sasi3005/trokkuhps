"use strict";
const Tables = require("../models/tableModel");
const QRCode = require("qrcode");
const os = require("os");

/**
 * หาค่า local IP ของเครื่อง
 */
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4 และไม่ใช่ internal
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost"; // fallback
}

async function generateQRCodeForTable(req, res) {
  try {
    const tableNumber = req.params.tableNumber;
    const t = await Tables.getByNumber(tableNumber);
    if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });


    const url = `${process.env.FRONTEND_URL}/order?tableId=${t.table_id}`;
    const qrDataUrl = await QRCode.toDataURL(url);

    const expire = new Date(Date.now() + 2 * 60 * 60 * 1000); // หมดอายุ 2 ชม.

    // อัปเดต QR code และ expire
    await Tables.update(t.table_id, {
      qr_code: qrDataUrl,
      qr_expire: expire
    });

    res.json({ qr_code: qrDataUrl, expire, url });
  } catch (e) {
    console.error("generateQRCodeForTable error:", e);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { generateQRCodeForTable };
