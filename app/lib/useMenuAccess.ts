// สิทธิ์การมองเห็นเมนูส่วนที่ต้องถาม backend — ใช้ร่วมกันระหว่าง Navbar และเมนูลัดหน้าหลัก
// (ส่วนที่มาจาก role อ่านจาก cookie ได้เลย ไม่ต้องอยู่ในนี้ — ดูกฎทั้งหมดที่ menuAccess.ts)
//
// ทำไมต้องจำคำตอบไว้ระดับโมดูล: Navbar และหน้าหลักถูก mount ใหม่ทุกครั้งที่เปลี่ยนหน้า
// ถ้าเริ่มจาก "ไม่มีโมดูลไหนถูกปิด" ทุกรอบ เมนูของโมดูลที่ผู้ดูแลระบบปิดไว้จะโผล่แวบหนึ่ง
// ก่อนคำตอบจะมาถึง — เริ่มจากคำตอบล่าสุดแทน แล้วค่อยถามใหม่เบื้องหลัง
import { useEffect, useState } from 'react'

export interface ServerMenuAccess {
  /** สิทธิ์อนุมัติการลา — มาจากการถูกแต่งตั้งเป็นหัวหน้าหน่วย ไม่ใช่ role */
  isLeaveApprover: boolean
  /** route_prefix ของโมดูลที่ผู้ดูแลระบบปิดการมองเห็นไว้ (/account/modules) */
  disabledModules: string[]
}

// คำตอบล่าสุดของแท็บนี้ — ฝั่ง server ไม่เคยถูกตั้งค่า (ถามใน effect เท่านั้น)
// ตอนเปิดเว็บครั้งแรก (hydrate) จึงเป็น null ทั้งสองฝั่ง HTML ตรงกัน
let last: ServerMenuAccess | null = null

const getJson = (url: string) => fetch(url).then(r => r.json()).catch(() => null)

const fetchAccess = async (): Promise<ServerMenuAccess> => {
  const [approver, modules] = await Promise.all([
    getJson('/api/v1/hr/leave-approver-check'),
    getJson('/api/v1/modules/disabled'),
  ])
  return {
    isLeaveApprover: approver?.success ? !!approver.data?.is_approver : false,
    // ถามไม่สำเร็จถือว่าไม่มีโมดูลไหนถูกปิด — สวิตช์นี้คุมการมองเห็น ไม่ได้กั้นสิทธิ์
    // ปิดทุกเมนูเพราะ API ล่มจะทำให้ใช้งานระบบไม่ได้เลย
    disabledModules: modules?.success ? (modules.data?.disabled ?? []) : [],
  }
}

/**
 * null = ยังไม่รู้ผล (ครั้งแรกหลังเปิดเว็บเท่านั้น) — ผู้เรียกต้องยังไม่แสดงเมนูที่ขึ้นกับค่านี้
 * refreshKey เปลี่ยนเมื่อไรถามใหม่ (Navbar ส่ง pathname มา ให้สวิตช์ที่เพิ่งสลับมีผลในหน้าถัดไป)
 */
export function useServerMenuAccess(refreshKey?: string): ServerMenuAccess | null {
  const [access, setAccess] = useState<ServerMenuAccess | null>(last)
  useEffect(() => {
    let alive = true
    fetchAccess().then(a => {
      last = a
      if (alive) setAccess(a)
    })
    return () => { alive = false }
  }, [refreshKey])
  return access
}
