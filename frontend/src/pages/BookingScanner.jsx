import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./BookingScanner.css";

function Camera({ onResult, onError }) {
  const video = useRef(null);

  useEffect(() => {
    let active = true;
    let stream;
    let timer;
    const preview = video.current;

    async function scan(detector) {
      if (!active) return;
      try {
        const codes = preview.readyState >= 2 ? await detector.detect(preview) : [];
        if (!active) return;
        if (codes.length) onResult(codes[0].rawValue);
        else timer = window.setTimeout(() => scan(detector), 200);
      } catch {
        if (active) onError("อ่าน QR จากกล้องไม่สำเร็จ");
      }
    }

    async function start() {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        preview.srcObject = stream;
        await preview.play();
        scan(detector);
      } catch {
        if (active) onError("เปิดกล้องไม่ได้ โปรดตรวจสอบสิทธิ์การเข้าถึงกล้อง");
      }
    }

    start();
    return () => {
      active = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult, onError]);

  return <video ref={video} muted playsInline aria-label="ภาพจากกล้องสำหรับสแกน QR" />;
}

export default function BookingScanner() {
  const [params, setParams] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const table = params.get("bookingTable");
  const canScan = Boolean(window.BarcodeDetector && navigator.mediaDevices?.getUserMedia);

  function reportError(message) {
    setScanning(false);
    setError(message);
  }

  function showResult(value) {
    setScanning(false);
    try {
      const url = new URL(value);
      const tableNumber = url.searchParams.get("bookingTable");
      if (url.origin === window.location.origin && url.pathname === "/" && tableNumber?.trim()) {
        const next = new URLSearchParams(params);
        next.set("bookingTable", tableNumber);
        setParams(next, { replace: true });
        return;
      }
    } catch {
      // The scanned text is not a URL.
    }
    setError("QR นี้ไม่ใช่ QR การจองของเว็บไซต์นี้");
  }

  return (
    <section className="booking-scanner" aria-labelledby="booking-scanner-title">
      <div className="booking-scanner__icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M11 4H4v7m17-7h7v7M4 21v7h7m17-7v7h-7" />
          <path d="M9 9h5v5H9zm9 0h5v5h-5zM9 18h5v5H9zm9 0h5m-5 0v5h5v-2" />
        </svg>
      </div>
      <div className="booking-scanner__copy">
        <span className="booking-scanner__label">สำหรับลูกค้าที่จองโต๊ะ</span>
        <h2 id="booking-scanner-title">สแกน QR ดูเลขโต๊ะ</h2>
        <p>ใช้ QR ที่ได้รับหลังจองโต๊ะสำเร็จ</p>
        {table?.trim() && <p className="booking-scanner__result" role="status">โต๊ะที่จอง <strong>{table}</strong></p>}
      </div>
      <div className="booking-scanner__action">
        {canScan ? (
          <button className="home-button home-button--primary" type="button" onClick={() => {
            setError("");
            setScanning(!scanning);
          }}>
            {scanning ? "ปิดกล้อง" : "เปิดกล้องสแกน QR"}
          </button>
        ) : (
          <p className="booking-scanner__hint">เปิดกล้องของโทรศัพท์เพื่อสแกน QR แล้วแตะลิงก์เพื่อดูเลขโต๊ะ</p>
        )}
      </div>
      {scanning && <Camera onResult={showResult} onError={reportError} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
