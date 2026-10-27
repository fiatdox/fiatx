import { redirect } from 'next/navigation'

// ทะเบียนเงินเดือนรวมอยู่ในหน้า "เลขที่เงินเดือนบุคลากร" (แท็บทะเบียนเงินเดือน) — ลิงก์/บุ๊กมาร์กเดิมยังใช้ได้
export default function SalaryRegisterRedirect() {
  redirect('/accounting/salary-ids?tab=register')
}
