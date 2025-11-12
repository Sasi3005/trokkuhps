// src/utils/safeStorage.js
// กัน Safari โหมด Private/โควต้า 0 โยน error เวลา setItem/getItem
// ใช้แทน window.localStorage ได้ทันที
export const safeStorage = (() => {
  const noop = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
    clear() {},
    key() { return null; },
    get length() { return 0; }
  };

  try {
    if (typeof window === "undefined") return noop; // กัน SSR
    const s = window.localStorage;
    // ทดสอบสิทธิ์/โควต้า
    const k = "__tst__" + Math.random();
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return noop; // ถ้า throw จะใช้ no-op แทน (แอปไม่ล้ม)
  }
})();

// helper เก็บ/อ่าน JSON สะดวก ๆ
export const storageJSON = {
  get(key, fallback = null) {
    try {
      const v = safeStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      safeStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try { safeStorage.removeItem(key); } catch {}
  }
};
