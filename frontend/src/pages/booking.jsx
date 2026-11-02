import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./booking.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const ZONES = ["โซนในร้าน", "โซนนอกร้าน"];
const INSIDE_MAX = 18;

function deriveZoneFromLabel(label = "") {
  const tableNumber = Number(String(label).match(/(\d+)/)?.[1]);
  return Number.isNaN(tableNumber) || tableNumber <= INSIDE_MAX ? "โซนในร้าน" : "โซนนอกร้าน";
}

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [zone, setZone] = useState("โซนในร้าน");
  const [highlight, setHighlight] = useState(searchParams.get("highlight") || "");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_BASE}/tables`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const ordered = (Array.isArray(data) ? data : []).map((table) => ({
          id: table.table_id,
          number: table.table_number || `T${table.table_id}`,
          status: table.status || "ว่าง",
          zone: table.zone?.trim() || deriveZoneFromLabel(table.table_number || ""),
        })).sort((a, b) => Number(a.number.match(/\d+/)?.[0] ?? 1e9) - Number(b.number.match(/\d+/)?.[0] ?? 1e9));
        if (alive) setTables(ordered);
      } catch (requestError) {
        if (alive) setError(requestError.message || "โหลดข้อมูลโต๊ะไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!highlight) return undefined;
    const timer = setTimeout(() => setHighlight(""), 2500);
    return () => clearTimeout(timer);
  }, [highlight]);

  const visibleTables = useMemo(() => tables.filter((table) => table.zone?.trim() === zone.trim()), [tables, zone]);
  const isReserved = (table) => table.status === "จองแล้ว" || table.status === "กำลังใช้งาน";
  const countBusy = visibleTables.filter(isReserved).length;
  const countFree = visibleTables.length - countBusy;

  useEffect(() => {
    if (selected && !visibleTables.some((table) => table.number === selected)) setSelected(null);
  }, [zone, visibleTables, selected]);

  const onConfirm = (event) => {
    event.preventDefault();
    if (!selected) return;
    navigate("/confirm", { state: { tableNo: selected, zone } });
  };

  return (
    <main className="booking-page">
      <header className="booking-hero">
        <button className="booking-back" onClick={() => navigate(-1)} type="button" aria-label="ย้อนกลับ">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <div className="booking-hero__copy">
          <p><span /> TROK KU KPS · RESERVATION</p>
          <h1>เลือกโต๊ะที่ใช่<br /><em>สำหรับมื้อของคุณ</em></h1>
        </div>
        <div className="booking-hero__badge"><span>STEP</span><strong>01</strong><small>/ 02</small></div>
      </header>

      <section className="booking-content" aria-label="เลือกโต๊ะ">
        <div className="booking-content__top">
          <div>
            <p className="booking-kicker">SELECT YOUR AREA</p>
            <h2>เลือกโซนที่ต้องการ</h2>
          </div>
          <div className="booking-zones" role="group" aria-label="โซนที่นั่ง">
            {ZONES.map((item) => <button key={item} className={zone === item ? "is-active" : ""} onClick={() => setZone(item)} type="button"><span aria-hidden="true" />{item}</button>)}
          </div>
        </div>

        <div className="booking-stats" aria-label="สรุปจำนวนโต๊ะ">
          <div><span>โต๊ะในโซนนี้</span><strong>{visibleTables.length}</strong><small>โต๊ะ</small></div>
          <div><span>พร้อมให้จอง</span><strong className="is-free">{countFree}</strong><small>โต๊ะ</small></div>
          <div><span>ไม่ว่าง</span><strong className="is-busy">{countBusy}</strong><small>โต๊ะ</small></div>
        </div>

        <section className="booking-map">
          <div className="booking-map__heading"><div><p>TABLE MAP</p><h2>{zone}</h2></div><div className="booking-map__key"><span><i className="is-free" />ว่าง</span><span><i className="is-reserved" />จองแล้ว</span><span><i className="is-busy" />กำลังใช้งาน</span></div></div>
          <div className="booking-map__stage"><span>เวที</span></div>
          {loading && <div className="booking-state"><i />กำลังโหลดผังโต๊ะ...</div>}
          {error && <div className="booking-error">ไม่สามารถโหลดข้อมูลโต๊ะได้: {error}</div>}
          {!loading && !error && <div className="booking-grid" role="list" aria-label={`ผังโต๊ะ ${zone}`}>
            {visibleTables.map((table) => {
              const reserved = isReserved(table);
              const active = selected === table.number;
              const className = ["booking-table", reserved ? (table.status === "กำลังใช้งาน" ? "is-busy" : "is-reserved") : "is-free", active && "is-selected", highlight === table.number && "is-highlighted"].filter(Boolean).join(" ");
              return <button key={table.id} className={className} onClick={() => !reserved && setSelected((current) => current === table.number ? null : table.number)} type="button" disabled={reserved} role="listitem" aria-label={reserved ? `${table.number} ${table.status}` : `เลือกโต๊ะ ${table.number}`}><b>{table.number}</b><span>{reserved ? table.status : active ? "เลือกแล้ว" : "ว่าง"}</span></button>;
            })}
          </div>}
          {!loading && !error && visibleTables.length === 0 && <div className="booking-state">ไม่พบโต๊ะในโซนนี้</div>}
          <div className="booking-map__entry"><span>ทางเข้า</span></div>
        </section>

        <form onSubmit={onConfirm} className="booking-confirm">
          <div className="booking-confirm__selection"><span>โต๊ะที่เลือก</span><strong>{selected || "ยังไม่ได้เลือก"}</strong><small>{selected ? zone : "เลือกโต๊ะว่างจากผังด้านบน"}</small></div>
          <button type="submit" disabled={!selected}>ดำเนินการต่อ <span aria-hidden="true">→</span></button>
        </form>
      </section>
    </main>
  );
}
