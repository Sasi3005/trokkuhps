import { Link, useLocation } from 'react-router-dom';
import KeepTableLink from './KeepTableLink';
import BookingScanner from './BookingScanner';

export function UIIcon({ name = 'arrow', ...props }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    food: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3v18m0-18c-4 4-4 9 0 9" /></>,
    drink: <><path d="M5 8h14l-2 13H7L5 8Zm7 0 2-6h4M4 8h16" /></>,
    snack: <><path d="m5 9 2 12h10l2-12H5Zm2-6 2 6m3-7v7m5-6-2 6" /></>,
    table: <><rect x="3" y="4" width="18" height="11" rx="3" /><path d="M6 15v6m12-6v6M8 4V2m8 2V2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

const PAGE_DESIGNS = {
  '/': ['home', 'หน้าแรก', 'อาหารดี ๆ ทำให้ทุกวันพิเศษ'],
  '/foods': ['food', 'อาหารจานหลัก', 'เลือกความอร่อยในแบบคุณ'],
  '/snacks': ['snack', 'ของทานเล่น', 'เติมความอร่อยระหว่างมื้อ'],
  '/drinks': ['drink', 'เครื่องดื่ม', 'แก้วโปรดสำหรับวันดี ๆ'],
  '/booking': ['table', 'จองโต๊ะ', 'เลือกมุมโปรด แล้วพบกันที่ร้าน'],
  '/confirm': ['booking-confirm', 'รายละเอียดการจอง', 'อีกนิดเดียว ก็พร้อมสำหรับมื้อดี ๆ'],
  '/foods/confirm': ['checkout', 'ตรวจสอบอาหารของคุณ', 'เช็กรายการ เพิ่มหมายเหตุ แล้วส่งให้ครัวได้เลย'],
  '/snacks/confirm': ['checkout', 'ตรวจสอบของทานเล่น', 'ความอร่อยจานเล็ก ๆ พร้อมส่งต่อให้ครัว'],
  '/drinks/confirm': ['checkout', 'ตรวจสอบเครื่องดื่ม', 'เช็กแก้วโปรดของคุณก่อนยืนยันรายการ'],
  '/drinks/payment': ['payment', 'เตรียมเสิร์ฟความสดชื่น', 'เลือกความหวานและวิธีชำระเงินให้เรียบร้อย'],
  '/success': ['success', 'เรียบร้อยแล้ว', 'เก็บรายละเอียดนี้ไว้ แล้วพบกันที่ร้าน'],
  '/login': ['auth', 'ยินดีต้อนรับกลับ', 'มื้อโปรดของคุณรออยู่'],
  '/register': ['auth', 'เริ่มต้นมื้อดี ๆ ด้วยกัน', 'สมัครสมาชิกเพื่อจองโต๊ะได้สะดวกขึ้น'],
  '/admin/login': ['admin-auth', 'เข้าสู่ระบบผู้ดูแล', 'จัดการร้านของคุณในพื้นที่เดียว'],
  '/admin': ['admin', 'ภาพรวมร้าน', 'ติดตามยอดขายและความเคลื่อนไหวของร้าน'],
  '/admin/menu': ['admin', 'จัดการเมนู', 'ดูแลความอร่อย ราคา และรูปภาพเมนู'],
  '/admin/users': ['admin', 'รายการจอง', 'ตรวจสอบข้อมูลผู้จองและหลักฐานการชำระเงิน'],
  '/admin/reports': ['admin', 'รายงานยอดขาย', 'เปลี่ยนข้อมูลในร้านให้เป็นภาพรวมที่ชัดเจน'],
  '/admin/tables': ['admin', 'จัดการโต๊ะ', 'ดูสถานะที่นั่งและพื้นที่ในร้านได้ในหน้าเดียว'],
};

export function PageHeading({ eyebrow = 'YOUR ORDER', title, description }) {
  return <section className="v2-page-heading"><div><span className="v2-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><span className="v2-heading-symbol"><UIIcon name="spark" /></span></section>;
}

export default function ExperienceShell({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const design = PAGE_DESIGNS[pathname] || (isAdmin ? ['admin', 'รายละเอียดการจอง', 'ตรวจสอบและจัดการข้อมูลการจอง'] : ['page', 'TROK KU KPS', 'ความอร่อยที่เลือกได้']);
  const auth = design[0] === 'auth';
  const checkout = ['checkout', 'payment'].includes(design[0]);
  return <div className={`trok-v2 ${isAdmin ? 'v2-admin' : 'v2-customer'} v2-${design[0]}`} data-page={pathname}>
    {!isAdmin && <header className="v2-site-header"><KeepTableLink to="/" className="v2-brand"><span className="v2-brand-mark"><UIIcon name="food" /></span><span>trok<span className="v2-brand-dot">.</span><small>KU KAMPHAENG SAEN</small></span></KeepTableLink><div className="v2-header-actions"><Link to="/login" className="v2-account-link" aria-label="บัญชีของฉัน"><UIIcon name="user" /></Link><KeepTableLink to="/booking" className="v2-reserve-link"><UIIcon name="table" /><span>จองโต๊ะ</span></KeepTableLink></div><section className="v2-qr-section v2-header-qr" aria-label="ตรวจสอบโต๊ะที่จอง"><div><span className="v2-eyebrow">ALREADY HAVE A RESERVATION?</span><h2>จองโต๊ะไว้แล้ว?</h2><p>สแกน QR การจองของคุณ เพื่อดูเลขโต๊ะได้เลย</p></div><BookingScanner /></section></header>}
    {checkout && <div className="v2-checkout-intro"><PageHeading title={design[1]} description={design[2]} /><ol className="v2-progress"><li className="is-complete"><b>✓</b> เลือกเมนู</li><li className="is-current"><b>02</b> ตรวจสอบรายการ</li><li><b>03</b> ยืนยันออเดอร์</li></ol></div>}
    {auth ? <div className="v2-auth-layout"><aside className="v2-auth-story"><span className="v2-eyebrow">GOOD FOOD. GREAT MOMENTS.</span><h2>ทุกมื้ออร่อย<br />มีเรื่องราวดี ๆ</h2><p>ให้เราเป็นส่วนหนึ่งของมื้อโปรดของคุณ<br />เลือกจานที่ชอบ แล้วมาพบกันที่ TROK</p><img src="/images/p5.png" alt="อาหารจานโปรดจาก TROK" /><span className="v2-auth-caption"><UIIcon name="spark" /> ทำสดด้วยใจ ในทุก ๆ จาน</span></aside>{children}</div> : children}
    {!isAdmin && <footer className="v2-site-footer"><KeepTableLink to="/" className="v2-footer-logo">trok.</KeepTableLink><p>อาหารอร่อย มื้อดี ๆ ใกล้รั้วเกษตร</p><span>KU KAMPHAENG SAEN</span><Link to="/admin/login">สำหรับผู้ดูแล <UIIcon /></Link></footer>}
  </div>;
}
