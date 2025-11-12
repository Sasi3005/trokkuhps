// src/pages/ConfirmDrinks.jsx
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import "./Foods.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const PLACEHOLDER = "/images/drinks/placeholder.jpg";
const cartKey = (table) => `dr_cart_${table || "unknown"}`;
const selectedKey = (table) => `${cartKey(table)}_selected`;
const ORDER_NOTE_KEY = (table) => `${cartKey(table)}_order_note`;

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const asStr = (v, fb = "") => (typeof v === "string" ? v : fb);
const THB = (n) => `${Number(n || 0).toFixed(2)}`;

export default function ConfirmDrinks() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const location = useLocation();

  // ---- รับโต๊ะจาก QR (state หรือ query) ----
  const tableFromQR = location.state?.table || sp.get("table") || "";
  const [table, setTable] = useState(tableFromQR);

  // ---- items จาก session หรือ location state ----
  const itemsFromNav = Array.isArray(location.state?.items) ? location.state.items : [];
  const [items, setItems] = useState(() => {
    const seed = (() => {
      try {
        const sel = sessionStorage.getItem(selectedKey(tableFromQR));
        if (sel) return JSON.parse(sel);
        if (itemsFromNav.length) return itemsFromNav;
        const all = sessionStorage.getItem(cartKey(tableFromQR));
        if (all) return JSON.parse(all);
      } catch { }
      return [];
    })();

    return (seed || []).map((it) => ({
      ...it,
      id: asStr(it.id ?? it.drink_id ?? it.name, asStr(it.name, "")),
      name: asStr(it.name, "-"),
      img: asStr(it.img || PLACEHOLDER, PLACEHOLDER),
      price: toNum(it.price ?? it.unit_price),
      qty: toNum(it.qty),
      note: asStr(it.note, ""),
      temp: it.temp ?? null,
    }));
  });

  /* ---------- Order note ---------- */
  const [orderNote, setOrderNote] = useState(() => {
    try { return sessionStorage.getItem(ORDER_NOTE_KEY(tableFromQR)) || ""; }
    catch { return ""; }
  });

  /* ---------- Persist ---------- */
  useEffect(() => {
    try {
      if (table) {
        sessionStorage.setItem(cartKey(table), JSON.stringify(items));
        sessionStorage.setItem(ORDER_NOTE_KEY(table), orderNote);
      }
    } catch { }
  }, [items, orderNote, table]);

  /* ---------- Derived ---------- */
  const selected = useMemo(() => items.filter((it) => toNum(it.qty) > 0), [items]);
  const lineTotal = (it) => toNum(it.qty) * toNum(it.price);
  const total = useMemo(() => selected.reduce((s, it) => s + lineTotal(it), 0), [selected]);

  /* ---------- UI actions ---------- */
  const removeOne = (id) => setItems((list) => list.filter((x) => x.id !== id));
  const clearAll = () => setItems([]);
  const [paymentMethod, setPaymentMethod] = useState("เงินสด");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---------- Confirm ---------- */
  const handleConfirm = async () => {
    if (!table) {
      alert("ไม่พบโต๊ะ กรุณาสแกน QR อีกครั้ง");
      return;
    }
    if (selected.length === 0) {
      alert("ยังไม่มีรายการเครื่องดื่ม");
      return;
    }
    setIsSubmitting(true);

    const method =
      paymentMethod === "เงินสด" ? "cash" :
        paymentMethod === "พร้อมเพย์" ? "promptpay" :
          "cash";

    const body = {
      table_number: Number(table),
      table_label: table,
      payment_method: method,
      amount: selected.reduce((sum, it) => sum + (toNum(it.price) * toNum(it.qty)), 0),
      order_note: orderNote || "",
      items: selected.map((it) => ({
        item_type: "drink",
        ref_id: String(it.id ?? it.drink_id ?? ""),
        name: asStr(it.name, "-"),
        price: toNum(it.price),
        qty: toNum(it.qty),
        itemNote: asStr(it.note || ""),
      })),
    };


    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      alert(`ส่งคำสั่งซื้อแล้ว ✅ (ออเดอร์ #${data.order_id})`);
      sessionStorage.removeItem(selectedKey(table));
      sessionStorage.removeItem(ORDER_NOTE_KEY(table));
      navigate(`/drinks?table=${encodeURIComponent(table)}`);
    } catch (e) {
      console.error("ConfirmDrinks POST error:", e);
      alert("มีข้อผิดพลาดระหว่างส่งคำสั่งซื้อ: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="fd-page">
      <header className="fd-topbar">
        <button type="button" className="fd-back" onClick={() => navigate("/drinks")}>‹</button>
        <div className="fd-title">
          <span>ตรวจสอบรายการ (เครื่องดื่ม)</span>
          <strong>โต๊ะ {table || "—"}</strong>
        </div>
        <div />
      </header>

      <main className="fd-container">
        {selected.length === 0 ? (
          <div className="fd-card" style={{ padding: "1rem" }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>ยังไม่มีรายการเครื่องดื่ม</p>
            <div style={{ marginTop: ".5rem" }}>
              <button
                type="button"
                className="fd-bottomBtn"
                onClick={() => navigate("/drinks")}
                style={{ width: 200 }}
              >
                เลือกเครื่องดื่ม
              </button>
            </div>
          </div>
        ) : (
          <>
            <ul className="fd-list fd-list--compact">
              {selected.map((it, idx) => (
                <li key={it.id} className="fd-card fd-card--h">
                  <img
                    className="fd-thumb fd-thumb--sm"
                    src={asStr(it.img, PLACEHOLDER)}
                    alt={it.name}
                    loading="lazy"
                    onError={(e) => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER; }}
                  />
                  <div className="fd-h-body">
                    <div className="fd-h-title">({idx + 1}) {it.name}</div>
                    <div className="fd-h-meta">
                      <span className="fd-bottomCount">× {toNum(it.qty)}</span>
                      <span className="fd-price">{THB(lineTotal(it))} ฿</span>
                    </div>
                    {it.note && <div className="fd-h-note">หมายเหตุ: {it.note}</div>}
                  </div>
                  <button type="button" className="fd-circle fd-circle--sm fd-remove" onClick={() => { if (window.confirm("ลบรายการนี้?")) removeOne(it.id); }}>✕</button>
                </li>
              ))}
            </ul>

            <div className="fd-form">
              <div className="fd-card fd-compactCard">
                <label className="fd-fieldTitle">รายละเอียดเพิ่มเติม</label>
                <textarea
                  className="fd-textarea fd-textarea--sm"
                  placeholder="เช่น ไม่ใส่หลอด, เสิร์ฟทีเดียว"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>

              {/* หมายเหตุใบสั่ง / วิธีชำระเงิน */}
              <div className="fd-grid" style={{ marginTop: "14px", gridTemplateColumns: "1fr" }}>
                <div className="fd-card" style={{ padding: "1rem" }}>
                  <label style={{ fontWeight: 700, color: "var(--ink)" }}>รายละเอียดเพิ่มเติม</label>
                  <textarea
                    placeholder="เช่น ไม่ใส่ช้อนส้อม, เสิร์ฟพร้อมกัน"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: ".55rem",
                      minHeight: 90,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: "10px 12px",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div className="fd-card" style={{ padding: "1rem" }}>
                  <label style={{ fontWeight: 700, color: "var(--ink)" }}>💳 วิธีชำระเงิน</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: ".55rem",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                    }}
                  >
                    <option value="เงินสด">💵 เงินสด</option>
                    <option value="พร้อมเพย์">🏧 พร้อมเพย์</option>
                  </select>

                  {paymentMethod === "พร้อมเพย์" && (
                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                      <img
                        src="public/images/qr-payment.jpg"
                        alt="QR Payment"
                        style={{ maxWidth: "200px", width: "100%" }}
                      />

                      {/* ฟอร์มอัปโหลดสลิป */}
                      <div style={{ marginTop: "1rem" }}>
                        <label htmlFor="slipUpload" style={{ display: "block", marginBottom: "0.5rem" }}>
                          📎 อัปโหลดสลิป
                        </label>
                        <input
                          type="file"
                          id="slipUpload"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              console.log("Selected file:", file);
                              // คุณสามารถส่งไป backend หรือ preview ได้
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>


                <div className="fd-actionsRow">
                  <button type="button" className="fd-circle fd-circle--sm" onClick={() => { if (window.confirm("ลบรายการทั้งหมด?")) clearAll(); }}>🗑️</button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {selected.length > 0 && (
        <div className="fd-bottom show">
          <div className="fd-bottomInfo">
            <span className="fd-bottomCount">{selected.length} รายการ</span>
            <span className="fd-bottomTotal">{THB(total)} ฿</span>
          </div>
          <button className="fd-bottomBtn" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "⏳ กำลังส่ง..." : "✅ ยืนยันออเดอร์"}
          </button>
        </div>
      )}
    </div>
  );
}
