import PageSkeleton from '@/app/components/Skeleton'

// แสดงทันทีที่กดเปลี่ยนไปหน้าในโมดูลนี้ ระหว่างรอหน้าใหม่พร้อม (แทนการค้างอยู่ที่หน้าเดิม)
// ไม่วางไว้ที่ app/ ชั้นบนสุด เพราะจะไปครอบหน้า login และหน้าแบบประเมินสาธารณะที่ไม่มีแถบหัวด้วย
export default function Loading() {
  return <PageSkeleton />
}
