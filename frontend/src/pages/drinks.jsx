// src/pages/Drinks.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import "./drinks.css";

const TEMP_KEYS=["ร้อน","เย็น","ปั่น"];
const API=import.meta.env?.VITE_API_BASE||"http://localhost:5000";
const cartKey=(table)=>`dr_cart_${table||"unknown"}`;
const selectedKey=(table)=>`${cartKey(table)}_selected`;
const getTableFromParams=(sp)=>(sp.get("table")||sp.get("tableId")||"").trim();

function norm(v){ if(v===null||v===undefined||v==="") return null; const n=Number(v); return Number.isFinite(n)?n:null; }
const buildBasePrices=(d)=>({ "ร้อน":norm(d.price_hot??d.hot_price??d.hot), "เย็น":norm(d.price_iced??d.ice_price??d.cold_price??d.ice), "ปั่น":norm(d.price_frappe??d.price_blend??d.blend_price??d.spin) });
function pickDefaultTemp(p){ const has=k=>p?.[k]!==null&&p?.[k]!==undefined; if(has("เย็น"))return"เย็น"; if(has("ร้อน"))return"ร้อน"; if(has("ปั่น"))return"ปั่น"; return null; }
const normText=(s)=>String(s||"").toLowerCase().normalize("NFKD").replace(/\s+/g," ").trim();
const highlight=(text,q)=>{ if(!q) return text; const t=String(text||""); const i=t.toLowerCase().indexOf(q.toLowerCase()); if(i===-1) return t; return(<>{t.slice(0,i)}<mark className="fd-mark">{t.slice(i,i+q.length)}</mark>{t.slice(i+q.length)}</>); };

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

export default function Drinks(){
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

  const prevTableRef=useRef(tableLabel);

  useEffect(()=>{ let alive=true;(async()=>{
    try{
      setError(null); setLoading(true);
      const res=await fetch(`${API}/drinks`,{headers:{Accept:"application/json"}});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const payload=Array.isArray(data)?data:(data.items||[]);
      const base=payload.map(d=>{
        const base_prices=buildBasePrices(d);
        const tempDefault=d.default_temperature||pickDefaultTemp(base_prices);
        const img=d.image?`data:image/png;base64,${d.image}`:"/images/drinks/placeholder.jpg";
        const idRaw=d.id??d.drink_id??d.item_id??d.m_id??d.menu_id;
        const id=(idRaw!==null&&idRaw!==undefined&&idRaw!=="")?String(idRaw):`name:${d.name}`;
        return { id,name:d.name,base_prices,extra_price:norm(d.extra_price)??0,temp:tempDefault,img,qty:0 };
      });
      const saved=sessionStorage.getItem(cartKey(tableLabel));
      if(saved){
        let parsed=[]; try{ parsed=JSON.parse(saved)||[] }catch{}
        const byId=Object.fromEntries((Array.isArray(parsed)?parsed:[]).map(x=>[String(x.id),x]));
        for(const it of base){ const keep=byId[it.id]; if(!keep) continue; it.qty=Math.max(0,keep.qty??0); if(keep.temp && it.base_prices?.[keep.temp]!=null) it.temp=keep.temp; }
      }
      if(alive) setItems(base);
    }catch(e){ if(alive) setError(e.message||"โหลดข้อมูลล้มเหลว"); }
    finally{ if(alive) setLoading(false); }
  })(); return()=>{alive=false}; },[tableLabel]);

  useEffect(()=>{ const prev=prevTableRef.current; if(!prev && tableLabel){ try{
    const fromKey=cartKey(""); const fromSel=`${fromKey}_selected`; const raw=sessionStorage.getItem(fromKey);
    if(raw){
      const toKey=cartKey(tableLabel); const exist=sessionStorage.getItem(toKey);
      if(!exist){ sessionStorage.setItem(toKey,raw); }
      else{
        const a=JSON.parse(raw||"[]"), b=JSON.parse(exist||"[]");
        const by=new Map(b.map(x=>[String(x.id),{...x}]));
        for(const x of a){ const k=String(x.id); if(by.has(k)) by.set(k,{...by.get(k),qty:Math.max(0,(by.get(k).qty||0)+(x.qty||0))}); else by.set(k,{...x}); }
        sessionStorage.setItem(toKey,JSON.stringify(Array.from(by.values())));
      }
      sessionStorage.removeItem(fromKey); sessionStorage.removeItem(fromSel);
    }
  }catch{} } prevTableRef.current=tableLabel; },[tableLabel]);

  useEffect(()=>{ try{ sessionStorage.setItem(cartKey(tableLabel),JSON.stringify(items)); }catch{} },[items,tableLabel]);

  const unitPrice=(it)=>{ const base=it.base_prices?.[it.temp]!=null?Number(it.base_prices[it.temp]):0; return base+Number(it.extra_price??0); };

  const dec=(id)=> canOrder && setItems(list=>list.map(it=>it.id===id?{...it,qty:Math.max(0,it.qty-1)}:it));
  const inc=(id)=> canOrder && setItems(list=>list.map(it=>it.id===id?{...it,qty:it.qty+1}:it));
  const setTemp=(id,temp)=> canOrder && setItems(list=>list.map(it=>it.id!==id?it: (it.base_prices?.[temp]!=null?{...it,temp}:it)));

  const filtered=useMemo(()=>{ const q=normText(debouncedQ); if(!q) return items; return items.filter(it=>normText(it.name).includes(q)); },[items,debouncedQ]);
  const cartCount=useMemo(()=>items.reduce((s,it)=>s+(it.qty||0),0),[items]);
  const cartTotal=useMemo(()=>items.reduce((s,it)=>s+unitPrice(it)*(it.qty||0),0),[items]);

  const goCart=()=>{ 
    if(!canOrder){ alert("กรุณาสแกน/จองโต๊ะก่อนครับ"); return; }
    const selected=items.filter(it=>(it.qty||0)>0); 
    if(!selected.length){ alert("ยังไม่ได้เลือกเครื่องดื่ม"); return; }
    try{
      sessionStorage.setItem(selectedKey(tableLabel), JSON.stringify(selected.map(x=>({...x,drink_id:String(x.id),price:unitPrice(x)}))));
      sessionStorage.setItem(cartKey(tableLabel), JSON.stringify(items));
    }catch{}
    navigate(`/drinks/confirm${qs}`, { state:{ items:selected.map(x=>({...x,drink_id:String(x.id),price:unitPrice(x)})) } });
  };

  return (
    <div className="fd-page v2-menu-page v2-menu-drinks">
      <header className="fd-topbar" role="banner">
        <button type="button" className="fd-back" onClick={()=>navigate(qs ? "/"+qs : "/")} aria-label="ย้อนกลับ">‹</button>
        <div className="fd-title"><span>หมายเลขโต๊ะ</span><strong>{tableLabel || "—"}</strong></div>
        <button type="button" className="fd-cartBtn" onClick={goCart} aria-label="ไปตะกร้า" disabled={!canOrder}>
          <span className="fd-cartIcon" aria-hidden>🧺</span><span className="fd-badge" aria-live="polite">{cartCount}</span>
        </button>
      </header>

      {!canOrder && <NeedTableNotice />}

      <main className="fd-container" role="main">
        <section className="fd-hero" aria-label="เมนูเครื่องดื่ม">
          <div className="fd-hero__copy"><p><span /> TROK KU KPS · DRINKS</p><h1>เติมความสดชื่น<br /><em>ให้ทุกมื้อของคุณ</em></h1><small>เครื่องดื่มเย็นชื่นใจ · เลือกอุณหภูมิได้ตามใจ</small></div>
          <div className="fd-hero__table"><span>YOUR TABLE</span><strong>{tableLabel || "—"}</strong><small>{tableLabel ? "พร้อมสั่งเครื่องดื่ม" : "กรุณาจองโต๊ะก่อน"}</small></div>
          <div className="fd-hero__visual" aria-hidden="true"><span>SIP<br />HAPPY</span><img src="/images/p3.png" alt="" /></div>
        </section>
        <div className="fd-menu-heading"><div><p>BREWED FOR YOUR GOOD MOOD</p><h2 className="fd-sectionTitle">เมนูเครื่องดื่ม</h2></div><span>{!loading && `${items.length} เมนู`}</span></div>

        <div className="fd-searchWrap" role="search">
          <span className="fd-searchIcon" aria-hidden>🔎</span>
          <input className="fd-search" value={query} onChange={(e)=>onChangeQuery(e.target.value)} placeholder="ค้นหาเครื่องดื่ม เช่น “กาแฟ”, “ชา”, “โกโก้”…" aria-label="ค้นหาเครื่องดื่ม" inputMode="search"/>
          {query && <button className="fd-clearBtn" onClick={clearQuery} aria-label="ล้างคำค้น">✕</button>}
        </div>

        {!loading && <div className="fd-resultMeta" aria-live="polite">{debouncedQ?<>ผลลัพธ์ <b>{filtered.length}</b> รายการ สำหรับ “{debouncedQ}”</>:<>ทั้งหมด <b>{items.length}</b> รายการ</>}</div>}
        {error && <div className="fd-error" role="alert">❌ โหลดข้อมูลล้มเหลว: {error}</div>}

        {loading ? (
          <ul className="fd-grid">{Array.from({length:8}).map((_,i)=>(<li key={`sk-${i}`} className="fd-card fd-skeleton"><div className="fd-thumbWrap sk"/><div className="fd-info"><div className="sk sk-line sk-1"/><div className="sk sk-line sk-2"/></div><div className="fd-ctrl"><div className="sk sk-pill"/></div></li>))}</ul>
        ) : filtered.length ? (
          <ul className="fd-grid">
            {filtered.map(it=>{
              const price=unitPrice(it);
              return (
                <li key={`dr-${it.id}`} className="fd-card">
                  <div className="fd-thumbWrap">
                    <img className="fd-thumb" src={it.img} alt={it.name} loading="lazy"
                      onError={(e)=>{ if(e.currentTarget.src!="/images/drinks/placeholder.jpg") e.currentTarget.src="/images/drinks/placeholder.jpg"; }}/>
                  </div>
                  <div className="fd-info">
                    <h3 className="fd-name" title={it.name}>{highlight(it.name,debouncedQ)}</h3>
                    <div className="fd-price">{price.toFixed(2)} ฿</div>

                    {/* อุณหภูมิ (ล็อกเมื่อไม่มีโต๊ะ) */}
                    <div style={{display:"flex",gap:".5rem",marginTop:".55rem",flexWrap:"wrap"}}>
                      {TEMP_KEYS.map(t=>{
                        const has=it.base_prices?.[t]!=null; const active=it.temp===t;
                        return (
                          <button key={t} type="button"
                            onClick={()=>canOrder && has && setTemp(it.id,t)}
                            disabled={!canOrder || !has}
                            aria-pressed={active}
                            title={has?`${t} (${Number(it.base_prices[t]).toFixed(0)} ฿)`:`ไม่มีราคา ${t}`}
                            style={{padding:".35rem .6rem",borderRadius:"999px",border:"1px solid var(--border)",background:active?"var(--brand)":"var(--chip)",color:active?"#fff":"var(--ink)",cursor:has&&canOrder?"pointer":"not-allowed",opacity:has&&canOrder?1:.5,fontWeight:700,boxShadow:"var(--shadow)",fontSize:".85rem"}}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="fd-ctrl" aria-label={`ตัวควบคุมจำนวน ${it.name}`}>
                    <button type="button" className="fd-circle" onClick={()=>dec(it.id)} disabled={!canOrder} aria-label={`ลด ${it.name}`}>–</button>
                    <span className="fd-qty" aria-live="polite">{it.qty}</span>
                    <button type="button" className="fd-circle" onClick={()=>inc(it.id)} disabled={!canOrder} aria-label={`เพิ่ม ${it.name}`}>+</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="fd-empty">
            <div className="fd-emptyEmoji" aria-hidden>🥤</div>
            <div className="fd-emptyTitle">ไม่พบเครื่องดื่มที่ตรงกับ “{debouncedQ}”</div>
            <div className="fd-emptyHint">ลองพิมพ์ให้สั้นลง เช่น “กาแฟ”, “ชา”, “นม” หรือกดล้างคำค้น</div>
            <button className="fd-emptyBtn" onClick={clearQuery}>แสดงทั้งหมด</button>
          </div>
        )}
      </main>

      <div className={`fd-bottom ${cartCount ? "show" : ""}`} role="region" aria-live="polite">
        <div className="fd-bottomInfo"><span className="fd-bottomCount">{cartCount} รายการ</span><span className="fd-bottomTotal">{cartTotal.toFixed(2)} ฿</span></div>
        <button className="fd-bottomBtn" onClick={goCart} disabled={!canOrder}>ยืนยันออเดอร์</button>
      </div>
    </div>
  );
}
