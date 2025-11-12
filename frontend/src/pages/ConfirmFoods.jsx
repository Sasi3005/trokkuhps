// src/pages/ConfirmFoods.jsx
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import "./Foods.css";

/* ========== Utils & Storage Keys ========== */
const cartKey = (table) => `fd_cart_${table || "unknown"}`;                 // ตะกร้าทั้งหมด
const selectedKey = (table) => `fd_cart_${table || "unknown"}_selected`;    // เฉพาะที่เลือก qty>0
const ORDER_NOTE_KEY = (table) => cartKey(`${table}_order_note`);

const PLACEHOLDER = "/images/foods/placeholder.jpg";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function asStr(v, fb = "") {
  return typeof v === "string" ? v : fb;
}
// แสดงเป็นตัวเลขล้วน ไม่มีสัญลักษณ์สกุลเงิน
function THB(n) {
  return `${toNum(n).toFixed(2)}`;
}
function coerceItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id =
    asStr(raw.id) ||
    asStr(raw.food_id) ||
    asStr(raw.item_id) ||
    asStr(raw.main_id) ||
    (raw.name ? `name:${asStr(raw.name)}` : "");

  const name = asStr(raw.name, "").trim();
  const price = toNum(raw.price ?? raw.unit_price ?? raw.food_price);
  const qty = toNum(raw.qty);
  const img = asStr(raw.img || raw.image || raw.image_url || PLACEHOLDER, PLACEHOLDER);
  const itemNote = asStr(raw.itemNote || raw.note, "");

  if (!id || !name || qty <= 0) return null;

  return { id, name, img, price, qty, itemNote };
}
function safeParse(jsonStr) {
  try {
    if (!jsonStr || typeof jsonStr !== "string") return [];
    const v = JSON.parse(jsonStr);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function ConfirmFoods() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const table = asStr(sp.get("table") || ""); // อาจว่างได้

  const location = useLocation();
  const navItems = Array.isArray(location.state?.items) ? location.state.items : null;

  // ---------- Initial load (priority: nav.state -> selectedKey -> cartKey(filter qty>0)) ----------
  const [items, setItems] = useState(() => {
    try {
      if (navItems?.length) return navItems.map(coerceItem).filter(Boolean);

      const selRaw = sessionStorage.getItem(selectedKey(table));
      const sel = safeParse(selRaw).map(coerceItem).filter(Boolean);
      if (sel.length) return sel;

      const fullRaw = sessionStorage.getItem(cartKey(table));
      const full = safeParse(fullRaw)
        .map((it) => ({ ...it, qty: toNum(it.qty) }))
        .filter((x) => x.qty > 0)
        .map(coerceItem)
        .filter(Boolean);

      return full;
    } catch {
      return [];
    }
  });

  const [orderNote, setOrderNote] = useState(() => {
    try {
      return asStr(sessionStorage.getItem(ORDER_NOTE_KEY(table)) || "");
    } catch {
      return "";
    }
  });

  const [paymentMethod, setPaymentMethod] = useState("เงินสด");

  // ---------- Persist on change ----------
  useEffect(() => {
    try {
      const selectedOnly = items.map((x) => ({
        ...x,
        food_id: asStr(x.food_id ?? x.id),
        price: toNum(x.price),
        qty: toNum(x.qty),
        itemNote: asStr(x.itemNote, ""),
      }));
      sessionStorage.setItem(selectedKey(table), JSON.stringify(selectedOnly));

      const fullRaw = sessionStorage.getItem(cartKey(table));
      if (fullRaw) {
        const fullArr = safeParse(fullRaw);
        const byId = Object.fromEntries(
          fullArr.map((f) => [asStr(f.id ?? f.food_id ?? ""), f]).filter(([k]) => !!k)
        );
        for (const it of items) {
          const key = asStr(it.id ?? it.food_id);
          if (key) {
            byId[key] = {
              ...(byId[key] || {}),
              id: key,
              name: asStr(it.name),
              img: asStr(it.img || PLACEHOLDER),
              price: toNum(it.price),
              qty: toNum(it.qty),
              itemNote: asStr(it.itemNote, ""),
            };
          }
        }
        sessionStorage.setItem(cartKey(table), JSON.stringify(Object.values(byId)));
      }

      sessionStorage.setItem(ORDER_NOTE_KEY(table), asStr(orderNote, ""));
    } catch { }
  }, [items, orderNote, table]);

  // ---------- Derived ----------
  const selected = useMemo(
    () => items.map((x) => ({ ...x, qty: toNum(x.qty), price: toNum(x.price) })).filter((it) => it.qty > 0),
    [items]
  );
  const lineTotal = (it) => toNum(it.qty) * toNum(it.price);
  const total = useMemo(() => selected.reduce((s, it) => s + lineTotal(it), 0), [selected]);

  // ---------- UI state ----------
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------- Actions ----------
  const removeOne = (id) => setItems((list) => list.filter((x) => x.id !== id));
  const clearAll = () => setItems([]);

  // ---------- POST to backend (item_type = main_dish) ----------
  const handleConfirm = async () => {
    try {
      if (selected.length === 0) {
        alert("ยังไม่มีรายการอาหาร");
        return;
      }
      setIsSubmitting(true);

      const method =
        paymentMethod === "เงินสด" ? "cash" :
          paymentMethod === "พร้อมเพย์" ? "promptpay" : "unknown";

      const body = {
        table_number: null,
        table_label: table || "unknown",
        payment_method: method,
        order_note: orderNote || "",
        amount: total,
        items: selected.map((it) => ({
          item_type: "main_dish",            // <<< fixed
          ref_id: String(it.id ?? it.food_id ?? ""),
          name: asStr(it.name, "-"),
          price: toNum(it.price),
          qty: toNum(it.qty),
          itemNote: asStr(it.itemNote, ""),
        })),
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { msg = (await res.json())?.message || msg; } catch { }
        throw new Error(msg);
      }
      const data = await res.json();

      alert(`ส่งคำสั่งซื้อแล้ว ✅ (ออเดอร์ #${data.order_id})`);
      sessionStorage.removeItem(selectedKey(table));
      sessionStorage.removeItem(ORDER_NOTE_KEY(table));
      navigate(`/foods?table=${encodeURIComponent(table)}`);
    } catch (e) {
      console.error("ConfirmFoods POST error:", e);
      alert("มีข้อผิดพลาดระหว่างส่งคำสั่งซื้อ: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===================== UI (fd-* + แนวนอนกะทัดรัด) ===================== */
  return (
    <div className="fd-page">
      {/* Topbar */}
      <header className="fd-topbar">
        <button
          className="fd-back"
          onClick={() => navigate(`/foods?table=${encodeURIComponent(table)}`)}
          aria-label="ย้อนกลับ"
        >
          ‹
        </button>
        <div className="fd-title">
          <span>หมายเลขโต๊ะ</span>
          <strong>{table || "—"}</strong>
        </div>
        <div /> {/* spacer */}
      </header>

      <main className="fd-container">
        {selected.length === 0 ? (
          <div className="fd-card" style={{ padding: "1.1rem 1rem" }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>ยังไม่มีรายการอาหาร</p>
            <div style={{ marginTop: ".75rem" }}>
              <button
                className="fd-bottomBtn"
                onClick={() => navigate(`/foods?table=${encodeURIComponent(table)}`)}
                style={{ width: 220 }}
              >
                เลือกอาหาร
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* รายการอาหารที่เลือก (แนวนอน กะทัดรัด) */}
            <ul className="fd-list fd-list--compact">
              {selected.map((it, idx) => (
                <li key={it.id} className="fd-card fd-card--h">
                  <img
                    className="fd-thumb fd-thumb--sm"
                    src={asStr(it.img, PLACEHOLDER)}
                    alt={it.name || "food"}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER;
                    }}
                  />

                  <div className="fd-h-body">
                    <div className="fd-h-title" title={it.name}>
                      ({idx + 1}) {it.name || "-"}
                    </div>

                    <div className="fd-h-meta">
                      <span className="fd-bottomCount">× {toNum(it.qty)}</span>
                      <span className="fd-price">{THB(toNum(it.qty) * toNum(it.price))} ฿</span>
                    </div>

                    {asStr(it.itemNote).trim() ? (
                      <div className="fd-h-note">หมายเหตุ: {asStr(it.itemNote)}</div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="fd-circle fd-remove"
                    title="ลบรายการนี้"
                    aria-label={`ลบ ${it.name || ""}`}
                    onClick={() => {
                      if (window.confirm("ลบรายการนี้?")) removeOne(it.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

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
                      src="/images/qr-payment.jpg"
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


                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button
                    type="button"
                    className="fd-circle"
                    title="ลบทั้งหมด"
                    aria-label="ลบทั้งหมด"
                    onClick={() => {
                      if (window.confirm("ลบรายการทั้งหมด?")) clearAll();
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Summary (bottom) */}
      {selected.length > 0 && (
        <div className={`fd-bottom show`} role="region" aria-live="polite">
          <div className="fd-bottomInfo">
            <span className="fd-bottomCount">{selected.length} รายการ</span>
            <span className="fd-bottomTotal">{THB(total)} ฿</span>
          </div>
          <button
            className="fd-bottomBtn"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.75 : 1 }}
          >
            {isSubmitting ? "⏳ กำลังส่ง..." : `✅ ยืนยันออเดอร์`}
          </button>
        </div>
      )}
    </div>
  );
}
