// src/hooks/useTableParam.js
import { useLocation } from "react-router-dom";

/** อ่านเลขโต๊ะจาก URL (?table= หรือ ?tableId=) */
export function useTableParam() {
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  return (sp.get("table") || sp.get("tableId") || "").trim();
}

/** สร้างปลายทางใหม่โดย "พก" table ปัจจุบันติดไปด้วย */
export function withTable(currentSearch, to) {
  // รองรับทั้ง string และ object ของ react-router
  const out = typeof to === "string" ? { pathname: to } : { ...to };

  // หา table จาก to (ถ้ามี) > ปัจจุบัน
  const toQS = new URLSearchParams(out.search || "");
  const curQS = new URLSearchParams(currentSearch || "");
  const table = toQS.get("table") || toQS.get("tableId") ||
                curQS.get("table") || curQS.get("tableId");

  // เซ็ตเป็นชื่อมาตรฐาน 'table'
  const next = new URLSearchParams(out.search || "");
  if (table) {
    next.set("table", table);
    next.delete("tableId");
    out.search = `?${next.toString()}`;
  } else if (!out.search) {
    // ไม่มี table ก็ไม่ต้องใส่ ? เปล่าๆ
    delete out.search;
  }
  return out;
}
