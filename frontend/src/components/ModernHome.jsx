import { useState } from 'react';
import { useCustomerAuth } from '../auth/useCustomerAuth';
import KeepTableLink from './KeepTableLink';
import { UIIcon } from './ExperienceShell';

const dishes = [
 { name: 'ข้าวคลุกน้ำพริกปลาทู', image: 'p5.png', tag: 'รสชาติไทย ๆ', category: 'อาหารจานหลัก' },
 { name: 'ข้าวปลาแกะ', image: 'p4.png', tag: 'เรียบง่าย แต่อร่อย', category: 'อาหารจานหลัก' },
 { name: 'ข้าวกุ้งผัดพริกขี้หนูสวน', image: 'p3.png', tag: 'เผ็ดหอม ลงตัว', category: 'อาหารจานหลัก' },
 { name: 'หมี่ไก่ฉีก', image: 'p2.png', tag: 'จานโปรดที่คุ้นเคย', category: 'เมนูเส้น' },
];
const categories = [['food', 'อาหารจานหลัก', 'อิ่มอร่อย ครบทุกคำ', '/foods'], ['snack', 'ของทานเล่น', 'เติมความสุขจานเล็ก', '/snacks'], ['drink', 'เครื่องดื่ม', 'สดชื่นในแก้วโปรด', '/drinks'], ['table', 'จองโต๊ะ', 'เลือกที่นั่งก่อนมา', '/booking']];
export default function ModernHome() {
 const { user, logout } = useCustomerAuth();
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function onLogout() { setBusy(true); setError(''); try { await logout(); } catch { setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง'); } finally { setBusy(false); } }
 return <main className="v2-home-content">
   {user && <div className="v2-welcome-bar"><span>สวัสดี, <strong>{user.name || 'คุณลูกค้า'}</strong> วันนี้ทานอะไรดี?</span><button type="button" onClick={onLogout} disabled={busy}>{busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}</button>{error && <p role="alert">{error}</p>}</div>}
   <section className="v2-home-hero">
    <div className="v2-home-copy"><span className="v2-eyebrow"><i /> A LITTLE HAPPINESS ON YOUR PLATE</span><h1>มื้ออร่อยที่ใช่<br />ในสไตล์<span>ของคุณ<svg viewBox="0 0 300 15" aria-hidden="true"><path d="M3 10Q140-6 296 9" /></svg></span></h1><p>อาหารทำสด จานโปรดที่คุ้นเคย<br />เติมความสุขง่าย ๆ ให้ทุกวัน ที่ TROK KU KPS</p><div className="v2-hero-buttons"><KeepTableLink to="/foods" className="v2-button v2-button--orange">สำรวจเมนูอร่อย <UIIcon /></KeepTableLink><KeepTableLink to="/booking" className="v2-text-link">จองโต๊ะล่วงหน้า <span>↗</span></KeepTableLink></div><div className="v2-hero-note"><span><UIIcon name="food" /> ปรุงสดทุกจาน</span><span><UIIcon name="spark" /> อร่อยใกล้รั้วเกษตร</span></div></div>
    <div className="v2-home-art"><span className="v2-art-word" aria-hidden="true">อร่อย!</span><div className="v2-art-orbit" /><img className="v2-hero-dish" src="/images/p1.png" alt="ผัดซีอิ๊วเส้นใหญ่ เมนูแนะนำของ TROK" /><div className="v2-art-label"><span className="v2-art-label-icon"><UIIcon name="food" /></span><div><small>CHEF’S PICK</small><strong>ผัดซีอิ๊วสูตรเด็ด</strong><span>หอมกระทะ เส้นเหนียวนุ่ม</span></div><KeepTableLink to="/foods" aria-label="ดูเมนูผัดซีอิ๊ว"><UIIcon /></KeepTableLink></div><span className="v2-art-sticker"><UIIcon name="spark" /> MADE<br />WITH LOVE</span></div>
   </section>
   <nav className="v2-category-grid" aria-label="เลือกหมวดหมู่">{categories.map(([icon,title,description,to],i)=><KeepTableLink key={to} to={to} className={`v2-category v2-category--${i}`}><span className="v2-category-icon"><UIIcon name={icon}/></span><div><h2>{title}</h2><p>{description}</p></div><UIIcon /></KeepTableLink>)}</nav>
   <section className="v2-popular"><div className="v2-section-heading"><div><span className="v2-eyebrow">THE GOOD STUFF</span><h2>จานโปรดที่อยากให้ลอง<span> ✳</span></h2><p>เมนูคุ้นเคย ที่อร่อยได้ทุกวัน</p></div><KeepTableLink className="v2-text-link" to="/foods">ดูเมนูทั้งหมด <UIIcon /></KeepTableLink></div><div className="v2-dish-grid">{dishes.map((dish,i)=><KeepTableLink key={dish.name} className="v2-dish-card" to="/foods"><div className={`v2-dish-photo v2-dish-photo--${i}`}><span>{dish.tag}</span><img src={`/images/${dish.image}`} alt={dish.name} loading="lazy" /></div><div className="v2-dish-body"><small>{dish.category}</small><h3>{dish.name}</h3><div><span>ดูรายละเอียดเมนู</span><b><UIIcon /></b></div></div></KeepTableLink>)}</div></section>
   <section className="v2-booking-banner"><div className="v2-booking-banner-copy"><span className="v2-eyebrow">SAVE YOUR FAVORITE SPOT</span><h2>ชวนคนโปรด<br />มานั่งทานอะไรอร่อย ๆ</h2><p>เลือกโต๊ะที่ชอบ จองไว้ล่วงหน้า<br />แล้วให้มื้อพิเศษของคุณเริ่มต้นได้อย่างสบายใจ</p><KeepTableLink to="/booking" className="v2-button">เลือกโต๊ะของคุณ <UIIcon /></KeepTableLink></div><div className="v2-booking-banner-art" aria-hidden="true"><UIIcon name="table"/><span>A SEAT<br />FOR YOU.</span></div></section>
 </main>;
}
