"use strict";
const express = require("express");
const router = express.Router();

const tableController = require("../controllers/tableController");
const generateQRController = require("../controllers/generateQR"); // ถ้ามีใช้จริง

// ===== Tables CRUD =====
router.get("/", tableController.getAllTables);
router.get("/:id", tableController.getTableById);
router.get("/:id/orders", tableController.getTableWithOrders);

router.post("/", tableController.createTable);
router.put("/:id", tableController.updateTable);
router.delete("/:id", tableController.deleteTable);

// ===== QR actions =====
router.post("/:tableNumber/generate-qr", generateQRController.generateQRCodeForTable);
router.post("/:tableNumber/clear-qr", tableController.clearQRCode);
router.get("/:tableNumber/qr", tableController.serveQRCode);

// ===== Decision: approve / reject / cancel =====
router.post("/:tableNumber/decision", tableController.approveOrRejectTable);

module.exports = router;
