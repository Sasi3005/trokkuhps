// src/pages/ConfirmDrinks.jsx
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import "./Foods.css";

/* ===== Config ===== */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const PLACEHOLDER = "/images/drinks/placeholder.jpg";
const cartKey = (table) => `dr_cart_${table || "unknown"}`;
const selectedKey = (table) => `${cartKey(table)}_selected`;
const ORDER_NOTE_KEY = (table) => `${cartKey(table)}_order_note`;

/* ===== QR (FRONT-END ONLY) ===== */
const STATIC_QR_URL = (import.meta.env.VITE_QR_SRC || "/qr-payment.jpg").trim();
const STATIC_QR_META = {
  provider: import.meta.env.VITE_QR_PROVIDER || "promptpay",
  account_name: import.meta.env.VITE_QR_ACCOUNT_NAME || "",
  account_no: import.meta.env.VITE_QR_ACCOUNT_NO || "",
  promptpay_id: import.meta.env.VITE_QR_PROMPTPAY_ID || "",
};

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const asStr = (v, fb = "") => (typeof v === "string" ? v : fb);
const THB = (n) => `${Number(n || 0).toFixed(2)}`;

/* ===== Helpers ===== */
function guessMime(url = "") {
  const u = url.toLowerCase();
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".png")) return "image/png";
  return "image/*";
}

export default function ConfirmDrinks() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const location = useLocation();

  // ---- รับโต๊ะ & query จาก QR / URL ----
  const tableFromQR = location.state?.table || sp.get("table") || "";
  const qFromURL = sp.get("q")?.trim() || "";
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
      } catch {}
      return [];
    })();

    return (seed || []).map((it) => ({
      ...it,
      id: asStr(it.id ?? it.drink_id ?? it.name, asStr(it.name, "")),
      name: asStr(it.name, "-"),
      img: asStr(it.img || PLACEHOLDER, PLACEHOLDER),
      price: toNum(it.price ?? it.unit_price),
      qty: Math.max(0, toNum(it.qty)),
      note: asStr(it.note, ""),
      temp: it.temp ?? null,
    }));
  });

  /* ---------- Order note ---------- */
  const [orderNote, setOrderNote] = useState(() => {
    try {
      return sessionStorage.getItem(ORDER_NOTE_KEY(tableFromQR)) || "";
    } catch {
      return "";
    }
  });

  /* ---------- Persist ---------- */
  useEffect(() => {
    try {
      if (table) {
        sessionStorage.setItem(cartKey(table), JSON.stringify(items));
        sessionStorage.setItem(ORDER_NOTE_KEY(table), orderNote);
      }
    } catch {}
  }, [items, orderNote, table]);

  /* ---------- Derived ---------- */
  const selected = useMemo(() => items.filter((it) => toNum(it.qty) > 0), [items]);
  const lineTotal = (it) => toNum(it.qty) * toNum(it.price);
  const total = useMemo(() => selected.reduce((s, it) => s + lineTotal(it), 0), [selected]);

  /* ---------- UI actions ---------- */
  const removeOne = (id) => setItems((list) => list.filter((x) => x.id !== id));
  const clearAll = () =>
    setItems((list) => list.map((x) => ({ ...x, qty: 0 })).filter(() => true)); // เคลียร์จำนวนเป็น 0

  const decQty = (id) =>
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, qty: Math.max(0, toNum(it.qty) - 1) } : it))
    );

  const incQty = (id) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, qty: toNum(it.qty) + 1 } : it)));

  const setItemNote = (id, note) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, note } : it)));

  /* ---------- Payment & Slip ---------- */
  const [paymentMethod, setPaymentMethod] = useState("เงินสด");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [qr, setQr] = useState({ src: "", mime: "image/jpeg", ...STATIC_QR_META });

  useEffect(() => {
    // โหลด QR แค่ครั้งแรก
    setQrLoading(true);
    setQrError("");
    if (!STATIC_QR_URL) {
      setQrError("ยังไม่ได้กำหนดรูปคิวอาร์โค้ด (VITE_QR_SRC ว่าง)");
      setQrLoading(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setQr({ src: STATIC_QR_URL, mime: guessMime(STATIC_QR_URL), ...STATIC_QR_META });
      setQrLoading(false);
    };
    img.onerror = () => {
      setQrError("โหลดรูปคิวอาร์โค้ดไม่สำเร็จ ตรวจสอบพาธไฟล์อีกครั้ง");
      setQrLoading(false);
    };
    img.src = STATIC_QR_URL;
  }, []);

  const [slip, setSlip] = useState(null);
  const [slipErr, setSlipErr] = useState("");
  const [slipPreview, setSlipPreview] = useState(null);
  const slipPreviewRef = useRef(null);
  const okSlipTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "image/heic",
    "image/heif",
  ]);

  useEffect(() => {
    // จัดการ preview URL
    if (slipPreviewRef.current) URL.revokeObjectURL(slipPreviewRef.current);
    slipPreviewRef.current = null;

    if (!slip || !slip.type?.startsWith("image/")) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slip);
    slipPreviewRef.current = url;
    setSlipPreview(url);
  }, [slip]);

  useEffect(() => () => {
    if (slipPreviewRef.current) URL.revokeObjectURL(slipPreviewRef.current);
  }, []);

  const onPickSlip = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setSlip(null);
      setSlipErr("");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setSlipErr("ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)");
      e.target.value = "";
      setSlip(null);
      return;
    }
    if (!okSlipTypes.has(f.type)) {
      setSlipErr("รองรับเฉพาะ PNG / JPG / WEBP / PDF / HEIC เท่านั้น");
      e.target.value = "";
      setSlip(null);
      return;
    }
    setSlipErr("");
    setSlip(f);
  };

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
    if (paymentMethod === "พร้อมเพย์" && !slip) {
      alert("กรุณาแนบสลิปก่อนยืนยันการสั่งซื้อ");
      return;
    }

    setIsSubmitting(true);

    const method =
      paymentMethod === "เงินสด" ? "cash" :
      paymentMethod === "พร้อมเพย์" ? "promptpay" :
      "cash";

    const body = {
      table_number: Number(table),          // ถ้า table ไม่ใช่ตัวเลข backend ควร ignore/ใช้ table_label
      table_label: table,
      payment_method: method,
      amount: selected.reduce((sum, it) => sum + toNum(it.price) * toNum(it.qty), 0),
      order_note: orderNote || "",
      items: selected.map((it) => ({
        item_type: "drink",
        ref_id: String(it.id ?? it.drink_id ?? ""),
        name: asStr(it.name, "-"),
        price: toNum(it.price),
        qty: toNum(it.qty),
        itemNote: asStr(it.note || ""),
        temp: it.temp ?? null,
      })),
    };

    try {
      let res, data;
      if (method === "promptpay" && slip) {
        // ส่งเป็น multipart เพื่อแนบสลิป
        const fd = new FormData();
        fd.append("payload", new Blob([JSON.stringify(body)], { type: "application/json" }));
        fd.append("slip", slip);
        res = await fetch(`${API_BASE}/orders/with-slip`, { method: "POST", body: fd });
      } else {
        res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();

      alert(`ส่งคำสั่งซื้อแล้ว ✅ (ออเดอร์ #${data.order_id})`);
      sessionStorage.removeItem(selectedKey(table));
      sessionStorage.removeItem(ORDER_NOTE_KEY(table));

      const qs = (() => {
        const p = new URLSearchParams();
        if (table) p.set("table", table);
        if (qFromURL) p.set("q", qFromURL);
        const s = p.toString();
        return s ? `?${s}` : "";
      })();

      navigate(`/drinks${qs}`);
    } catch (e) {
      console.error("ConfirmDrinks POST error:", e);
      alert("มีข้อผิดพลาดระหว่างส่งคำสั่งซื้อ: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    const qs = (() => {
      const p = new URLSearchParams();
      if (table) p.set("table", table);
      if (qFromURL) p.set("q", qFromURL);
      const s = p.toString();
      return s ? `?${s}` : "";
    })();
    navigate(`/drinks${qs}`);
  };

  /* ---------- Render ---------- */
  return (
    <div className="fd-page">
      <header className="fd-topbar">
        <button type="button" className="fd-back" onClick={goBack}>‹</button>
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
                onClick={goBack}
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
                    onError={(e) => {
                      if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER;
                    }}
                  />
                  <div className="fd-h-body">
                    <div className="fd-h-title">
                      ({idx + 1}) {it.name} {it.temp ? <span className="fd-chip">{it.temp}</span> : null}
                    </div>
                    <div className="fd-h-meta" style={{ gap: ".75rem" }}>
                      <div className="fd-stepper">
                        <button type="button" className="fd-circle fd-circle--sm" onClick={() => decQty(it.id)}>–</button>
                        <span className="fd-qty" aria-live="polite">{toNum(it.qty)}</span>
                        <button type="button" className="fd-circle fd-circle--sm" onClick={() => incQty(it.id)}>+</button>
                      </div>
                      <span className="fd-price">{THB(lineTotal(it))} ฿</span>
                    </div>

                    <textarea
                      className="fd-textarea fd-textarea--sm"
                      placeholder="หมายเหตุของรายการนี้ (เช่น หวานน้อย, ไม่ใส่วิป)"
                      value={it.note || ""}
                      onChange={(e) => setItemNote(it.id, e.target.value)}
                      style={{ marginTop: ".35rem" }}
                    />
                  </div>

                  <button
                    type="button"
                    className="fd-circle fd-circle--sm fd-remove"
                    onClick={() => {
                      if (window.confirm("ลบรายการนี้?")) removeOne(it.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* โน้ตรวม + วิธีชำระเงิน */}
            <div className="fd-form">
              <div className="fd-card fd-compactCard">
                <label className="fd-fieldTitle">รายละเอียดเพิ่มเติมของออเดอร์</label>
                <textarea
                  className="fd-textarea"
                  placeholder="เช่น ไม่ใส่หลอด, เสิร์ฟพร้อมกัน"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  style={{ minHeight: 90 }}
                />
              </div>

              <div className="fd-card" style={{ padding: "1rem", marginTop: "14px" }}>
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
                    {qrLoading && <div className="muted">กำลังโหลดคิวอาร์โค้ด…</div>}
                    {!qrLoading && qrError && <div className="fd-error">{qrError}</div>}
                    {!qrLoading && !qrError && qr.src && (
                      <>
                        <img
                          src={qr.src}
                          alt="QR Payment"
                          style={{ maxWidth: 220, width: "100%", borderRadius: 12 }}
                        />
                        <div className="muted" style={{ marginTop: ".25rem" }}>
                          {qr.account_name || qr.promptpay_id || qr.account_no ? (
                            <>
                              {qr.account_name && <span>{qr.account_name}</span>}
                              {qr.promptpay_id && <span> • {qr.promptpay_id}</span>}
                              {qr.account_no && <span> • {qr.account_no}</span>}
                            </>
                          ) : null}
                        </div>
                      </>
                    )}

                    {/* อัปโหลดสลิป */}
                    <div style={{ marginTop: "1rem" }}>
                      <label htmlFor="slipUpload" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                        📎 อัปโหลดสลิป (สูงสุด 5MB)
                      </label>
                      <input
                        type="file"
                        id="slipUpload"
                        accept="image/*,application/pdf"
                        onChange={onPickSlip}
                      />
                      {slipErr && <div className="fd-error" style={{ marginTop: ".25rem" }}>{slipErr}</div>}

                      {/* Preview (เฉพาะ image/*) */}
                      {slip && slipPreview && (
                        <div style={{ marginTop: ".5rem", display: "grid", gridTemplateColumns: "80px 1fr", gap: ".5rem", alignItems: "center" }}>
                          <img src={slipPreview} alt="Slip Preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                          <div style={{ fontSize: ".9rem", color: "var(--muted)" }}>
                            <div>{slip.name}</div>
                            <div>{(slip.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                      )}
                      {/* ถ้าเป็น PDF หรือไฟล์ไม่ใช่ image */}
                      {slip && !slipPreview && (
                        <div className="muted" style={{ marginTop: ".5rem" }}>
                          แนบไฟล์: {slip.name} ({(slip.size / 1024).toFixed(1)} KB)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="fd-actionsRow">
                <button
                  type="button"
                  className="fd-circle fd-circle--sm"
                onClick={() => { if (window.confirm("ลบจำนวนทั้งหมดเป็น 0 ?")) clearAll(); }}
                >
                  🗑️
                </button>
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
