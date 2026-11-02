import { useLocation, useNavigate } from "react-router-dom";
import "./Success.css";

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableNo, zone, name, date, time, phone } = location.state || {};
  const missingState = !tableNo || !zone || !name || !date || !time || !phone;

  if (missingState) {
    return (
      <main className="success-page">
        <section className="success-card success-card--missing">
          <div className="success-symbol success-symbol--warn" aria-hidden="true">!</div>
          <span className="success-eyebrow">TROK KU KPS · RESERVATION</span>
          <h1>ไม่พบข้อมูลการจอง</h1>
          <p className="success-lead">โปรดกลับไปเลือกโต๊ะและกรอกรายละเอียดใหม่อีกครั้ง</p>
          <div className="success-actions">
            <button className="success-button success-button--primary" onClick={() => navigate("/booking")} type="button">ไปหน้าเลือกโต๊ะ <span>→</span></button>
            <button className="success-button success-button--secondary" onClick={() => navigate("/")} type="button">กลับหน้าแรก</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="success-page">
      <section className="success-card">
        <div className="success-topline"><span className="success-eyebrow">TROK KU KPS · RESERVATION</span><span className="success-status"><i /> ยืนยันแล้ว</span></div>
        <div className="success-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="m8 16 5.2 5.2L24 10.8" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <h1>จองสำเร็จ!</h1>
        <p className="success-lead">ระบบบันทึกคำขอของคุณเรียบร้อยแล้ว</p>

        <div className="success-table">
          <span className="success-table-icon" aria-hidden="true">▦</span>
          <span><small>โต๊ะที่จอง</small><strong>{tableNo}</strong><em>{zone}</em></span>
          <span className="success-table-check" aria-hidden="true">✓</span>
        </div>

        <section className="success-details" aria-label="รายละเอียดการจอง">
          <div className="success-details-heading"><span>BOOKING DETAILS</span><strong>รายละเอียดการจอง</strong></div>
          <div className="success-row"><span className="success-row-icon" aria-hidden="true">♙</span><span className="success-label">ผู้จอง</span><strong className="success-value">{name}</strong></div>
          <div className="success-row"><span className="success-row-icon" aria-hidden="true">◷</span><span className="success-label">วันที่ / เวลา</span><strong className="success-value">{date} เวลา {time} น.</strong></div>
          <div className="success-row"><span className="success-row-icon" aria-hidden="true">☎</span><span className="success-label">เบอร์โทร</span><strong className="success-value">{phone}</strong></div>
        </section>

        <div className="success-tip"><span aria-hidden="true">ℹ</span><p>โปรดแสดงรายละเอียดการจองนี้ให้พนักงานเมื่อมาถึงร้าน หรือเก็บภาพหน้าจอไว้เป็นหลักฐาน</p></div>
        <div className="success-actions">
          <button className="success-button success-button--primary" onClick={() => navigate("/")} type="button">กลับหน้าแรก <span>→</span></button>
          <button className="success-button success-button--secondary" onClick={() => navigate("/booking")} type="button">จองโต๊ะเพิ่ม</button>
        </div>
      </section>
    </main>
  );
}
