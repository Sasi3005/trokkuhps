// src/pages/Snacks.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import "./Snacks.css";

const API_BASE=import.meta.env.VITE_API_BASE||"http://localhost:5000";
const SNACKS_API=`${API_BASE}/snacks`;
const PLACEHOLDER="/images/snacks/placeholder.jpg";
const cartKey=(table)=>`sn_cart_${table||"unknown"}`;
const getTableFromParams=(sp)=>(sp.get("table")||sp.get("tableId")||"").trim();
const toNum=(v)=> (Number.isFinite(Number(v))?Number(v):0);
const normText=(s)=>String(s||"").toLowerCase().normalize("NFKD").replace(/\s+/g," ").trim();
const highlight=(text,q)=>{ if(!q) return text; const t=String(text||""); const i=t.toLowerCase().indexOf(q.toLowerCase()); if(i===-1) return t; return(<>{t.slice(0,i)}<mark className="fd-mark">{t.slice(i,i+q.length)}</mark>{t.slice(i+q.length)}</>); };
function pickImageSrc(d){ if(d?.image && typeof d.image==="string") return `data:image/png;base64,${d.image}`; const raw=d?.image_path??d?.img??d?.image_file??d?.imageUrl??d?.image??""; if(!raw) return PLACEHOLDER; if(/^https?:\/\//i.test(raw)) return raw; if(raw.startsWith("/uploads/")) return `${API_BASE}${raw}`; if(raw.startsWith("/")) return raw; return `${API_BASE}/uploads/${raw}`; }

/* แถบแจ้งเตือน */
function NeedTableNotice() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      role="alert"
      style={{
        margin: "8px",
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255, 230, 0, .12)",
        border: "1px solid rgba(255, 200, 0, .6)",
        color: "#7a5b00",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 20 }}>🪑</span>
      <div style={{ lineHeight: 1.35, flex: 1 }}>
        <strong>ยังไม่มีหมายเลขโต๊ะ</strong> — กรุณาจองโต๊ะก่อนจึงจะสั่งได้ และ สแกน QR ที่พนักงาน
      </div>
      <button
        type="button"
        onClick={() => navigate("/booking", { state: { from: location, reason: "needTable" } })}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #d4b106",
          background: "#fadb14",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ไปจองโต๊ะ
      </button>
    </div>
  );
}

export default function Snacks(){
  const navigate=useNavigate();
  const [sp,setSp]=useSearchParams();
  const tableLabel=getTableFromParams(sp);
  const qs = tableLabel ? `?table=${encodeURIComponent(tableLabel)}` : "";
  const canOrder = !!tableLabel;

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [items,setItems]=useState([]);

  // search
  const initialQ=sp.get("q")??"";
  const [query,setQuery]=useState(initialQ);
  const [debouncedQ,setDebouncedQ]=useState(initialQ);
  const qTimer=useRef(null);
  useEffect(()=>{ const now=sp.get("q")??""; setQuery(now); setDebouncedQ(now); },[sp.get("q")]);
  const onChangeQuery=(v)=>{ setQuery(v); if(qTimer.current) clearTimeout(qTimer.current); qTimer.current=setTimeout(()=>{ setDebouncedQ(v); const next=new URLSearchParams(sp); if(v) next.set("q",v); else next.delete("q"); setSp(next,{replace:true}); },220); };
  const clearQuery=()=>onChangeQuery("");

  useEffect(()=>{ let alive=true;(async()=>{
    try{
      setError(null); setLoading(true);
      const res=await fetch(`${SNACKS_API}?limit=200`,{headers:{Accept:"application/json"}});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const payload=Array.isArray(data)?data:(data.items??data.snacks??[]);
      const base=payload.map(d=>{
        const idRaw=d.id??d.item_id??d.snack_id??d.menu_id;
        const id=(idRaw!==null&&idRaw!==undefined&&idRaw!=="")?String(idRaw):`name:${d.name??d.snack_name}`;
        const price=toNum(d.price??d.default_price??d.snack_price??0);
        return { id,name:d.name??d.snack_name??"-",price,img:pickImageSrc(d),qty:0,itemNote:"" };
      });
      const saved=sessionStorage.getItem(cartKey(tableLabel));
      if(saved){
        const arr=JSON.parse(saved||"[]");
        const byId=Object.fromEntries((Array.isArray(arr)?arr:[]).map(x=>[String(x.id),x]));
        for(const it of base){ const prev=byId[it.id]; if(!prev) continue; it.qty=Math.max(0,toNum(prev.qty)); if(typeof prev.itemNote==="string") it.itemNote=prev.itemNote; }
      }
      if(alive) setItems(base);
    }catch(e){ if(alive) setError(e.message||"โหลดข้อมูลล้มเหลว"); }
    finally{ if(alive) setLoading(false); }
  })(); return()=>{alive=false}; },[tableLabel]);

  useEffect(()=>{ try{ sessionStorage.setItem(cartKey(tableLabel),JSON.stringify(items)); }catch{} },[items,tableLabel]);

  const dec=(id)=> canOrder && setItems(list=>list.map(it=>it.id===id?{...it,qty:Math.max(0,toNum(it.qty)-1)}:it));
  const inc=(id)=> canOrder && setItems(list=>list.map(it=>it.id===id?{...it,qty:toNum(it.qty)+1}:it));

  const filtered=useMemo(()=>{ const q=normText(debouncedQ); if(!q) return items; return items.filter(it=>normText(it.name).includes(q)); },[items,debouncedQ]);
  const cartCount=useMemo(()=>items.reduce((s,it)=>s+toNum(it.qty),0),[items]);
  const cartTotal=useMemo(()=>items.reduce((s,it)=>s+toNum(it.qty)*toNum(it.price),0),[items]);

  const goConfirm=()=>{ 
    if(!canOrder){ alert("กรุณาสแกน/จองโต๊ะก่อนครับ"); return; }
    const selected=items.map(x=>({...x,qty:toNum(x.qty),price:toNum(x.price)})).filter(x=>x.qty>0);
    if(!selected.length){ alert("ยังไม่ได้เลือกของทานเล่น"); return; }
    try{
      sessionStorage.setItem(`${cartKey(tableLabel)}_selected`, JSON.stringify(selected.map(x=>({...x,snack_id:String(x.id),price:Number(x.price)}))));
      sessionStorage.setItem(cartKey(tableLabel), JSON.stringify(items));
    }catch{}
    navigate(`/snacks/confirm${qs}`, { state:{ items:selected.map(x=>({...x,snack_id:String(x.id),price:Number(x.price)})) } });
  };

  return (
    <div className="fd-page">
      <header className="fd-topbar">
        <button className="fd-back" onClick={()=>navigate(qs ? "/"+qs : "/")} aria-label="ย้อนกลับ">‹</button>
        <div className="fd-title"><span>หมายเลขโต๊ะ</span><strong>{tableLabel || "—"}</strong></div>
        <button className="fd-cartBtn" onClick={goConfirm} aria-label="ไปยืนยันออเดอร์" disabled={!canOrder}>
          <span className="fd-cartIcon">🧺</span><span className="fd-badge">{cartCount}</span>
        </button>
      </header>

      {!canOrder && <NeedTableNotice />}

      <main className="fd-container">
        <h2 className="fd-sectionTitle">เมนูของทานเล่น</h2>

        <div className="fd-searchWrap" role="search">
          <span className="fd-searchIcon" aria-hidden>🔎</span>
          <input className="fd-search" value={query} onChange={(e)=>onChangeQuery(e.target.value)} placeholder="ค้นหา เช่น “ไก่ทอด”, “นักเก็ต”, “เฟรนช์ฟรายส์”…" aria-label="ค้นหาของทานเล่น" inputMode="search"/>
          {query && <button className="fd-clearBtn" onClick={clearQuery} aria-label="ล้างคำค้น">✕</button>}
        </div>

        {!loading && <div className="fd-resultMeta" aria-live="polite">{debouncedQ?<>ผลลัพธ์ <b>{filtered.length}</b> รายการ สำหรับ “{debouncedQ}”</>:<>ทั้งหมด <b>{items.length}</b> รายการ</>}</div>}
        {error && <div className="fd-error">❌ โหลดข้อมูลล้มเหลว: {error}</div>}

        {loading ? (
          <ul className="fd-grid">{Array.from({length:8}).map((_,i)=>(<li key={`sk-${i}`} className="fd-card fd-skeleton"><div className="fd-thumbWrap sk"/><div className="fd-info"><div className="sk sk-line sk-1"/><div className="sk sk-line sk-2"/></div><div className="fd-ctrl"><div className="sk sk-pill"/></div></li>))}</ul>
        ) : filtered.length ? (
          <ul className="fd-grid">
            {filtered.map(it=>(
              <li key={`sn-${it.id}`} className="fd-card">
                <div className="fd-thumbWrap">
                  <img className="fd-thumb" src={it.img} alt={it.name} loading="lazy"
                       onError={(e)=>{ if(e.currentTarget.src!==PLACEHOLDER) e.currentTarget.src=PLACEHOLDER; }}/>
                </div>
                <div className="fd-info">
                  <h3 className="fd-name" title={it.name}>{highlight(it.name,debouncedQ)}</h3>
                  <div className="fd-price">{toNum(it.price).toFixed(2)} ฿</div>
                </div>
                <div className="fd-ctrl" aria-label={`ตัวควบคุมจำนวน ${it.name}`}>
                  <button className="fd-circle" onClick={()=>dec(it.id)} disabled={!canOrder} aria-label={`ลด ${it.name}`}>–</button>
                  <span className="fd-qty" aria-live="polite">{toNum(it.qty)}</span>
                  <button className="fd-circle" onClick={()=>inc(it.id)} disabled={!canOrder} aria-label={`เพิ่ม ${it.name}`}>+</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fd-empty">
            <div className="fd-emptyEmoji" aria-hidden>🍟</div>
            <div className="fd-emptyTitle">ไม่พบรายการที่ตรงกับ “{debouncedQ}”</div>
            <div className="fd-emptyHint">ลองพิมพ์ให้สั้นลง เช่น “ไก่”, “หมู”, “เฟรนช์” หรือกดล้างคำค้น</div>
            <button className="fd-emptyBtn" onClick={clearQuery}>แสดงทั้งหมด</button>
          </div>
        )}
      </main>

      <div className={`fd-bottom ${cartCount ? "show" : ""}`} role="region" aria-live="polite">
        <div className="fd-bottomInfo"><span className="fd-bottomCount">{cartCount} รายการ</span><span className="fd-bottomTotal">{cartTotal.toFixed(2)} ฿</span></div>
        <button className="fd-bottomBtn" onClick={goConfirm} disabled={!canOrder}>ยืนยันออเดอร์</button>
      </div>
    </div>
  );
}
