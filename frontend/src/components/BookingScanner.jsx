import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import jsQR from "jsqr";
import "./BookingScanner.css";

function Camera({ onResult, onError }) {
  const video = useRef(null);

  useEffect(() => {
    let active = true;
    let stream;
    let timer;
    const preview = video.current;

        const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function scan() {
      if (!active) return;
      try {
        if (preview.readyState >= 2 && preview.videoWidth && preview.videoHeight) {
          const scale = Math.min(1, 720 / Math.max(preview.videoWidth, preview.videoHeight));
          const width = Math.max(1, Math.round(preview.videoWidth * scale));
          const height = Math.max(1, Math.round(preview.videoHeight * scale));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          context.drawImage(preview, 0, 0, width, height);
          const frame = context.getImageData(0, 0, width, height);
          const code = jsQR(frame.data, width, height);
          if (code) {
            onResult(code.data);
            return;
          }
        }
        timer = window.setTimeout(scan, 200);
      } catch {
        onError("อ่าน QR จากกล้องไม่สำเร็จ");
      }
    }

async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        preview.srcObject = stream;
        await preview.play();
        scan();
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

  return (
    <div className="booking-scanner__camera">
      <div className="booking-scanner__preview">
        <video ref={video} muted playsInline aria-label="ภาพจากกล้องสำหรับสแกน QR" />
        <span className="booking-scanner__guide" aria-hidden="true" />
      </div>
      <p role="status">วาง QR ให้อยู่ในกรอบ กล้องจะอ่านให้อัตโนมัติ</p>
    </div>
  );
}

export default function BookingScanner() {
  const [params, setParams] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const table = params.get("bookingTable");
  const canScan = Boolean(navigator.mediaDevices?.getUserMedia);

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

  async function scanImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanning(false);
    setError("");

    let image;
    try {
      image = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height);
      if (code) showResult(code.data);
      else reportError("ไม่พบ QR ในรูปที่เลือก");
    } catch {
      reportError("เปิดรูปไม่ได้ ลองเลือกรูป PNG หรือ JPG");
    } finally {
      image?.close();
    }
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
        <p>เล็งกล้องไปที่ QR ที่ได้รับหลังจองโต๊ะ</p>
        {table?.trim() && <p className="booking-scanner__result" role="status">โต๊ะที่จอง <strong>{table}</strong></p>}
      </div>
      <div className="booking-scanner__action">
        <label className="booking-scanner__upload">
          <span aria-hidden="true">🖼️</span> แนบรูป QR จากเครื่อง
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={scanImage} />
        </label>
        {canScan ? (
          <button className="home-button home-button--primary" type="button" onClick={() => {
            setError("");
            setScanning(!scanning);
          }}>
            {scanning ? "ปิดกล้อง" : "เปิดกล้องสแกน QR"}
          </button>
        ) : (
          <p className="booking-scanner__hint">เปิดเว็บผ่าน HTTPS หรือ localhost เพื่อใช้กล้องในเว็บ หรือสแกน QR ด้วยกล้องโทรศัพท์</p>
        )}
      </div>
      {scanning && <Camera onResult={showResult} onError={reportError} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
