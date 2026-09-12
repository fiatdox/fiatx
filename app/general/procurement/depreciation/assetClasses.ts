// ตารางที่ ๑ การกำหนดอายุการใช้งานและอัตราค่าเสื่อมราคาสินทรัพย์ถาวร
// (หลักเกณฑ์การคำนวณค่าเสื่อมราคาสินทรัพย์ถาวรสำหรับหน่วยงานภาครัฐ)
//
// เก็บเฉพาะช่วง "อายุการใช้งาน (ปี)" เพราะอัตราค่าเสื่อม/ปี = 100 / อายุ อยู่แล้ว
// (ตัวเลขอัตราในเอกสารเป็นค่าปัดของ 100/อายุ เช่น อายุ 15 ปี -> 6.5% ซึ่งมาจาก 6.67%)

export interface AssetClass {
  no: string        // ลำดับในตารางที่ ๑
  name: string
  minYears: number
  maxYears: number
}

export const ASSET_CLASSES: AssetClass[] = [
  { no: '1',    name: 'อาคารถาวร',                                    minYears: 15, maxYears: 40 },
  { no: '2',    name: 'อาคารชั่วคราว / โรงเรือน',                      minYears: 8,  maxYears: 15 },
  { no: '3.1',  name: 'สิ่งก่อสร้าง — คอนกรีตเสริมเหล็ก/โครงเหล็ก',    minYears: 15, maxYears: 25 },
  { no: '3.2',  name: 'สิ่งก่อสร้าง — ไม้หรือวัสดุอื่น',                minYears: 5,  maxYears: 15 },
  { no: '4',    name: 'ครุภัณฑ์สำนักงาน',                              minYears: 3,  maxYears: 12 },
  { no: '5',    name: 'ครุภัณฑ์ยานพาหนะและขนส่ง',                      minYears: 5,  maxYears: 30 },
  { no: '6',    name: 'ครุภัณฑ์ไฟฟ้าและวิทยุ',                         minYears: 5,  maxYears: 10 },
  { no: '6*',   name: 'เครื่องกำเนิดไฟฟ้า (ข้อยกเว้นของข้อ 6)',        minYears: 15, maxYears: 20 },
  { no: '7',    name: 'ครุภัณฑ์โฆษณาและเผยแพร่',                       minYears: 5,  maxYears: 10 },
  { no: '8.1',  name: 'ครุภัณฑ์การเกษตร — เครื่องมือและอุปกรณ์',       minYears: 2,  maxYears: 5 },
  { no: '8.2',  name: 'ครุภัณฑ์การเกษตร — เครื่องจักรกล',              minYears: 3,  maxYears: 10 },
  { no: '9.1',  name: 'ครุภัณฑ์โรงงาน — เครื่องมือและอุปกรณ์',         minYears: 2,  maxYears: 5 },
  { no: '9.2',  name: 'ครุภัณฑ์โรงงาน — เครื่องจักรกล',                minYears: 3,  maxYears: 10 },
  { no: '10.1', name: 'ครุภัณฑ์ก่อสร้าง — เครื่องมือและอุปกรณ์',       minYears: 2,  maxYears: 5 },
  { no: '10.2', name: 'ครุภัณฑ์ก่อสร้าง — เครื่องจักรกล',              minYears: 3,  maxYears: 10 },
  { no: '11',   name: 'ครุภัณฑ์สำรวจ',                                 minYears: 5,  maxYears: 10 },
  { no: '12',   name: 'ครุภัณฑ์การแพทย์และวิทยาศาสตร์',                minYears: 5,  maxYears: 15 },
  { no: '13',   name: 'ครุภัณฑ์คอมพิวเตอร์',                           minYears: 3,  maxYears: 5 },
  { no: '14',   name: 'ครุภัณฑ์การศึกษา',                              minYears: 2,  maxYears: 5 },
  { no: '15',   name: 'ครุภัณฑ์งานบ้านงานครัว',                        minYears: 2,  maxYears: 5 },
  { no: '16',   name: 'ครุภัณฑ์กีฬา / กายภาพ',                         minYears: 2,  maxYears: 5 },
  { no: '17',   name: 'ครุภัณฑ์ดนตรี / นาฏศิลป์',                      minYears: 2,  maxYears: 5 },
  { no: '18',   name: 'ครุภัณฑ์อาวุธ',                                 minYears: 5,  maxYears: 10 },
  { no: '19',   name: 'ครุภัณฑ์สนาม',                                  minYears: 2,  maxYears: 5 },
  { no: '20.1', name: 'โครงสร้างพื้นฐาน — ถนนคอนกรีต',                 minYears: 10, maxYears: 20 },
  { no: '20.2', name: 'โครงสร้างพื้นฐาน — ถนนลาดยาง',                  minYears: 3,  maxYears: 10 },
  { no: '20.3', name: 'โครงสร้างพื้นฐาน — สะพานคอนกรีตเสริมเหล็ก',     minYears: 20, maxYears: 50 },
  { no: '20.4', name: 'โครงสร้างพื้นฐาน — เขื่อนดิน',                  minYears: 20, maxYears: 50 },
  { no: '20.5', name: 'โครงสร้างพื้นฐาน — เขื่อนปูน',                  minYears: 50, maxYears: 80 },
  { no: '20.6', name: 'โครงสร้างพื้นฐาน — อ่างเก็บน้ำ',                minYears: 30, maxYears: 80 },
  { no: '21',   name: 'ครุภัณฑ์อื่น',                                  minYears: 2,  maxYears: 15 },
  { no: '22',   name: 'สินทรัพย์ไม่มีตัวตน',                           minYears: 2,  maxYears: 20 },
]

const byNo = (no: string) => ASSET_CLASSES.find(c => c.no === no)!

/**
 * จับคู่ assetcatid ในทะเบียนครุภัณฑ์ (ตาราง assetcat) เข้ากับประเภทในตารางที่ ๑
 *
 * บางประเภทในเอกสารแยกเป็น "เครื่องมือและอุปกรณ์" กับ "เครื่องจักรกล" แต่ทะเบียนไม่ได้แยก
 * จึงใช้ช่วงรวมของทั้งสองข้อย่อย (อายุต่ำสุดของข้อแรก ถึงอายุสูงสุดของข้อหลัง)
 */
const MERGED = (a: string, b: string): AssetClass => ({
  no: `${byNo(a).no}, ${byNo(b).no}`,
  name: byNo(a).name.split(' — ')[0],
  minYears: Math.min(byNo(a).minYears, byNo(b).minYears),
  maxYears: Math.max(byNo(a).maxYears, byNo(b).maxYears),
})

export const CLASS_BY_ASSETCATID: Record<number, AssetClass> = {
  1:  byNo('12'),               // ครุภัณฑ์การแพทย์
  2:  byNo('6'),                // ครุภัณฑ์ไฟฟ้าและวิทยุ
  3:  MERGED('9.1', '9.2'),     // ครุภัณฑ์โรงงาน
  4:  MERGED('8.1', '8.2'),     // ครุภัณฑ์การเกษตร
  5:  byNo('14'),               // ครุภัณฑ์การศึกษา
  6:  byNo('13'),               // ครุภัณฑ์คอมพิวเตอร์
  7:  byNo('7'),                // ครุภัณฑ์โฆษณาและเผยแพร่
  8:  byNo('15'),               // ครุภัณฑ์งานบ้านงานครัว
  9:  byNo('5'),                // ครุภัณฑ์ยานพาหนะและขนส่ง
  10: byNo('12'),               // ครุภัณฑ์วิทยาศาสตร์
  11: byNo('4'),                // ครุภัณฑ์สำนักงาน
  12: byNo('1'),                // อาคารสิ่งก่อสร้าง — ใช้ช่วงของอาคารถาวร
  13: MERGED('10.1', '10.2'),   // ครุภัณฑ์ก่อสร้าง
  14: byNo('11'),               // ครุภัณฑ์สำรวจ
  15: byNo('17'),               // ครุภัณฑ์ดนตรี
  16: byNo('16'),               // ครุภัณฑ์กีฬา
}

export interface LifeCheck {
  cls: AssetClass | null
  inRange: boolean | null   // null = ไม่รู้ประเภท จึงตรวจไม่ได้
  message: string
}

/** อายุการใช้งานที่บันทึกไว้ อยู่ในช่วงที่หลักเกณฑ์กำหนดไหม */
export function checkLife(assetcatid: number | null, years: number | null): LifeCheck {
  const cls = assetcatid != null ? CLASS_BY_ASSETCATID[assetcatid] ?? null : null
  if (!cls || years == null) return { cls, inRange: null, message: '' }
  const inRange = years >= cls.minYears && years <= cls.maxYears
  return {
    cls,
    inRange,
    message: inRange
      ? `อยู่ในช่วง ${cls.minYears}–${cls.maxYears} ปี ตามตารางที่ ๑ (ข้อ ${cls.no})`
      : `อายุ ${years} ปี อยู่นอกช่วง ${cls.minYears}–${cls.maxYears} ปี ที่ตารางที่ ๑ ข้อ ${cls.no} กำหนดไว้`,
  }
}

/** ตัวเลือกสำหรับ dropdown เลือกหมวดเอง — เรียงตามลำดับข้อในตารางที่ ๑ */
export const CLASS_OPTIONS = ASSET_CLASSES.map(c => ({
  value: c.no,
  label: `${c.no}. ${c.name} (${c.minYears}–${c.maxYears} ปี)`,
  cls: c,
}))

export const classByNo = (no: string | null | undefined): AssetClass | null =>
  ASSET_CLASSES.find(c => c.no === no) ?? null

/** หมวดตามตารางที่ ๑ ที่ผูกไว้กับ assetcatid ของทะเบียน (null = จับคู่ไม่ได้) */
export const classForAssetcatid = (assetcatid: number | null | undefined): AssetClass | null =>
  assetcatid != null ? CLASS_BY_ASSETCATID[assetcatid] ?? null : null

// ── ทะเบียนครุภัณฑ์ระบบใหม่ (V2) ───────────────────────────────────────────
// รหัส assetcatid ของ V2 เป็นคนละชุดกับระบบเดิม
// (ยืนยันจากคอลัมน์ assetcatidv2 ในตาราง assetcat ของระบบเดิม เช่น สำนักงาน v1=11 -> v2=2)
// จึงต้องมีตารางจับคู่แยกต่างหาก ห้ามใช้ CLASS_BY_ASSETCATID ร่วมกัน
export const CLASS_BY_ASSETCATID_V2: Record<number, AssetClass> = {
  1:  byNo('12'),               // ครุภัณฑ์การแพทย์
  2:  byNo('4'),                // ครุภัณฑ์สำนักงาน
  3:  byNo('5'),                // ครุภัณฑ์ยานพาหนะ
  4:  byNo('7'),                // ครุภัณฑ์โฆษณาและเผยแพร่
  5:  byNo('6'),                // ครุภัณฑ์ไฟฟ้าและวิทยุ
  6:  byNo('15'),               // ครุภัณฑ์งานบ้านงานครัว
  7:  MERGED('8.1', '8.2'),     // ครุภัณฑ์การเกษตร
  8:  byNo('1'),                // อาคารสิ่งก่อสร้าง — ใช้ช่วงของอาคารถาวร
  9:  byNo('13'),               // ครุภัณฑ์คอมพิวเตอร์
  10: byNo('12'),               // "ทั้งหมด" ในตาราง V2 — ระบบเดิมเทียบไว้เป็นครุภัณฑ์วิทยาศาสตร์
  11: byNo('14'),               // ครุภัณฑ์การศึกษา
  12: byNo('21'),               // ครุภัณฑ์ไม่ระบุรายละเอียด -> ครุภัณฑ์อื่น
  13: MERGED('10.1', '10.2'),   // ครุภัณฑ์ก่อสร้าง
  14: byNo('11'),               // ครุภัณฑ์สำรวจ
}

export const classForAssetcatidV2 = (assetcatid: number | null | undefined): AssetClass | null =>
  assetcatid != null ? CLASS_BY_ASSETCATID_V2[assetcatid] ?? null : null
