"use strict";
const Tables = require("../models/tableModel");
const QRCode = require("qrcode");

/** สร้าง URL สำหรับสแกนไปหน้าโปรดักชันจริง */
function buildQrUrl(tableId) {
  const FRONT = (process.env.FRONT_ORIGIN || "https://trokkuhps.vercel.app").replace(/\/+$/, "");
  const PATH  = process.env.QR_PAGE_PATH || "/order"; // รองรับทั้ง "/order" และ "/#/order"
  const KEY   = process.env.QR_TABLE_PARAM || "tableId";

  // ต่อ query ให้ถูก (กรณี PATH มี ? อยู่แล้ว)
  const hasQ = PATH.includes("?");
  const sep  = hasQ ? "&" : "?";
  return `${FRONT}${PATH}${sep}${KEY}=${encodeURIComponent(tableId)}`;
}

async function generateQRCodeForTable(req, res) {
  try {
    const tableNumber = req.params.tableNumber;
    const t = await Tables.getByNumber(tableNumber);
    if (!t) return res.status(404).json({ message: "โต๊ะไม่พบ" });

    // URL โปรดักชัน
    const url = buildQrUrl(t.table_id);

    // สร้างเป็น Data URL (base64) เก็บลง DB เหมือนเดิม
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M", // พอสำหรับพิมพ์สติ๊กเกอร์
    });

    // อายุ QR ปรับได้จาก ENV
    const hours = Number(process.env.QR_EXPIRE_HOURS || 2);
    const expire = new Date(Date.now() + hours * 60 * 60 * 1000);

    // อัปเดตเฉพาะฟิลด์ที่เกี่ยวข้อง
    await Tables.update(t.table_id, {
      qr_code: qrDataUrl,
      qr_expire: expire,
    });

    res.json({ qr_code: qrDataUrl, url, expire });
  } catch (e) {
    console.error("generateQRCodeForTable error:", e);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { generateQRCodeForTable };
