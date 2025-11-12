"use strict";
const express = require("express");
const router = express.Router();

// ✅ ตั้งชื่อให้ชัดเจน ไม่ซ้ำ
const tableController = require("../controllers/tableController");
const generateQRController = require("../controllers/generateQR");

// ========================
// เส้นทางหลักของโต๊ะ
// ========================
router.get("/", tableController.getAllTables);
router.get("/:id", tableController.getTableById);
router.get("/:id/orders", tableController.getTableWithOrders);

router.post("/", tableController.createTable);
router.put("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);

// ========================
// เส้นทางเกี่ยวกับ QR
// ========================
router.post("/:tableNumber/generate-qr", generateQRController.generateQRCodeForTable);
router.post("/:tableNumber/clear-qr", tableController.clearQRCode);
router.get("/:tableNumber/qr", tableController.serveQRCode);

// ========================
// เส้นทางสำหรับอนุมัติ/ปฏิเสธโต๊ะ
// ========================
router.post("/:tableNumber/decision", tableController.approveOrRejectTable);

module.exports = router;
