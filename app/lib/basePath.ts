// basePath ของแอป (ฝังตอน build จาก next.config.ts) เช่น "/exp" เมื่อรันหลัง reverse proxy ใต้ path เดียวกับเว็บอื่น
// fetch / <img src> / <a href> / window.location ที่เขียนพาธเอง Next ไม่เติมให้ ต้องผ่าน withBase()
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** เติม basePath หน้าพาธภายในแอป (ขึ้นต้นด้วย "/" เดี่ยว) — ไม่แตะ URL เต็ม, protocol-relative หรือพาธที่มี basePath แล้ว */
export function withBase(path: string): string {
  if (!BASE_PATH || !path.startsWith('/') || path.startsWith('//')) return path
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`) || path.startsWith(`${BASE_PATH}?`)) return path
  return `${BASE_PATH}${path}`
}
