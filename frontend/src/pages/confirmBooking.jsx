// src/pages/ConfirmBooking.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./confirmBooking.css";

/* ===== Config ===== */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const AFTER_SAVE_PATH = "/success";

/* ===== QR (FRONT-END ONLY) */
const STATIC_QR_URL = (import.meta.env.VITE_QR_SRC || "/qr-payment.jpg").trim();

const STATIC_QR_META = {
  provider: import.meta.env.VITE_QR_PROVIDER || "promptpay",
  account_name: import.meta.env.VITE_QR_ACCOUNT_NAME || "",
  account_no: import.meta.env.VITE_QR_ACCOUNT_NO || "",
  promptpay_id: import.meta.env.VITE_QR_PROMPTPAY_ID || "",
};

/* ===== Utils ===== */
function toLocalDateInputValue(date = new Date()) {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}
function toLocalTimeHHmm(date = new Date()) {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60 * 1000);
  return local.toISOString().slice(11, 16);
}
function roundToNext30Min(d = new Date()) {
  const date = new Date(d);
  date.setSeconds(0, 0);
  const m = date.getMinutes();
  date.setMinutes(m % 30 === 0 ? m : m + (30 - (m % 30)));
  return date;
}
function guessMime(url = "") {
  const u = url.toLowerCase();
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".png")) return "image/png";
  return "image/*";
}

/* ===== Zone Mapping ===== */
const ZONE_MAP_TO_TH = {
  inside: "โซนในร้าน",
  outside: "โซนนอกร้าน",
  "โซนในร้าน": "โซนในร้าน",
  "โซนนอกร้าน": "โซนนอกร้าน",
};
const ZONE_MAP_TO_DB = { inside: "โซนในร้าน", outside: "โซนนอกร้าน" };

/* ===== Component ===== */
export default function ConfirmBooking() {
  const navigate = useNavigate();
  const location = useLocation();

  const rawTableNo = location.state?.tableNo || "A1";
  const rawZone = location.state?.zone ?? "inside";
  const zoneDisplay = ZONE_MAP_TO_TH[rawZone] || "โซนในร้าน";

  const todayStr = toLocalDateInputValue(new Date());
  const next30 = roundToNext30Min(new Date());
  const nextTimeStr = toLocalTimeHHmm(next30);

  const [form, setForm] = useState({
    name: "",
    date: todayStr,
    time: nextTimeStr,
    phone: "",
    slip: null,
  });

  /* ===== Slip Preview ===== */
  const [slipPreview, setSlipPreview] = useState(null);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;

    if (!form.slip) {
      setSlipPreview(null);
      return;
    }
    if (form.slip.type?.startsWith("image/")) {
      const url = URL.createObjectURL(form.slip);
      previewUrlRef.current = url;
      setSlipPreview(url);
    } else {
      setSlipPreview(null);
    }
  }, [form.slip]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const slipInputRef = useRef(null);
  const [errMsg, setErrMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ===== Payment QR ===== */
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [qr, setQr] = useState({ src: "", mime: "image/jpeg", ...STATIC_QR_META });

  useEffect(() => {
    setQrLoading(true);
    setQrError("");
    if (!STATIC_QR_URL) {
      setQrError("ยังไม่ได้กำหนดรูปคิวอาร์โค้ด (STATIC_QR_URL ว่าง)");
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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      const file = files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setErrMsg("ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)");
          e.target.value = "";
          return;
        }
        const okTypes = [
          "image/png", "image/jpeg", "image/webp", "application/pdf", "image/heic", "image/heif",
        ];
        if (!okTypes.includes(file.type)) {
          setErrMsg("รองรับเฉพาะ PNG / JPG / WEBP / PDF / HEIC เท่านั้น");
          e.target.value = "";
          return;
        }
        setErrMsg("");
        setForm((f) => ({ ...f, [name]: file }));
      } else {
        setForm((f) => ({ ...f, [name]: null }));
      }
    } else {
      setErrMsg("");
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date || !form.time) {
      setErrMsg("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!form.slip) {
      setErrMsg("กรุณาแนบสลิปก่อนยืนยัน");
      if (slipInputRef.current) slipInputRef.current.click();
      return;
    }

    try {
      setSubmitting(true);
      setErrMsg("");

      const fd = new FormData();
      // ---- ชื่อต้อง “ตรงกับฝั่งหลัง” ----
      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("table_number", rawTableNo);         // ถ้าหลังบ้านใช้ table_id ให้เปลี่ยนเป็น table_id
      fd.append("zone", ZONE_MAP_TO_DB[rawZone] || "โซนในร้าน");
      fd.append("date", form.date);
      fd.append("time", form.time);
      fd.append("slip", form.slip);

      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        body: fd,                 // อย่าตั้ง Content-Type เอง
        // ถ้าใช้คุกกี้ session ให้เปิดบรรทัดนี้ด้วย และ backend ต้อง set credentials:true
        // credentials: "include",
      });

      // อ่าน body แบบปลอดภัยเพื่อให้เห็นสาเหตุ 502/500
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* not json */ }

      if (!res.ok) {
        console.error("POST /bookings failed:", res.status, text);
        throw new Error(data?.error || `บันทึกล้มเหลว (HTTP ${res.status})`);
      }

      const payload = {
        booking_id: data.booking_id,
        tableNo: rawTableNo,
        zone: zoneDisplay,
        name: form.name,
        date: form.date,
        time: form.time,
        phone: form.phone,
      };

      try {
        sessionStorage.setItem("last_booking", JSON.stringify(payload));
      } catch {}

      navigate(AFTER_SAVE_PATH, { replace: true, state: payload });
    } catch (err) {
      setErrMsg(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="confirm-page">
      <header className="confirm-header">
        <button className="bk-back" onClick={handleBack} aria-label="ย้อนกลับ">←</button>
        <h2>ยืนยันการจอง</h2>
        <div></div>
      </header>

      <section className="summary-card">
        <div className="left">
          <div className="badge">โต๊ะที่เลือก</div>
          <div className="table-no">{rawTableNo}</div>
        </div>
        <div className="right">
          <div className="zone">{zoneDisplay}</div>
        </div>
      </section>

      <form className="confirm-form" onSubmit={handleSubmit}>
        <div className="grid-2">
          <label className="field">
            <span className="field__label">เลขโต๊ะ</span>
            <input type="text" value={rawTableNo} readOnly />
          </label>
          <label className="field">
            <span className="field__label">โซน</span>
            <input type="text" value={zoneDisplay} readOnly />
          </label>
        </div>

        <label className="field">
          <span className="field__label">ผู้จอง</span>
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="field__label">วันที่</span>
            <input type="date" name="date" value={form.date} min={todayStr} onChange={handleChange} required />
          </label>
          <label className="field">
            <span className="field__label">เวลา</span>
            <input type="time" name="time" value={form.time} onChange={handleChange} required />
          </label>
        </div>

        <label className="field">
          <span className="field__label">เบอร์โทร</span>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} pattern="[0-9]{9,10}" required />
        </label>

        {/* Payment QR */}
        <section className="payment-card">
          {qrLoading && <div className="muted">กำลังโหลดคิวอาร์โค้ด…</div>}
          {!qrLoading && qrError && <div className="form-error">{qrError}</div>}
          {!qrLoading && !qrError && qr.src && (
            <div className="qr-wrap">
              <img src={qr.src} alt="QR Payment" className="qr-img" />
            </div>
          )}
        </section>

        {/* Slip Upload */}
        <div className="field upload">
          <div className="field__label">แนบสลิป</div>

          <label className="upload__drop">
            <div className="icon">📎</div>
            <div className="t1">ลากสลิปมาที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>
            <div className="t2">รองรับ JPG, PNG, WEBP, PDF, HEIC ขนาดไม่เกิน 5MB</div>
            <input
              ref={slipInputRef}
              type="file"
              name="slip"
              accept="image/*,application/pdf"
              onChange={handleChange}
              required
            />
          </label>

          {slipPreview && (
            <div className="preview">
              <img src={slipPreview} alt="Slip Preview" className="slip-img" />
              <div className="preview__meta">
                <span className="name">{form.slip.name}</span>
                <span className="size">{(form.slip.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}
        </div>

        {errMsg && <div className="form-error">{errMsg}</div>}

        <div className="btn-row">
          <button type="button" className="btn cancel" onClick={handleBack} disabled={submitting}>ยกเลิก</button>
          <button type="submit" className="btn confirm" disabled={submitting || qrLoading || !!qrError}>
            {submitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
          </button>
        </div>
      </form>
    </div>
  );
}
