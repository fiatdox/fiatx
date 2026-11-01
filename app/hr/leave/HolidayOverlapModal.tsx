'use client'
// แจ้งเตือนเมื่อช่วงวันลาคาบเกี่ยววันเสาร์-อาทิตย์ หรือวันหยุดนักขตฤกษ์ (ตาราง hr_holidays)
// ข้อมูลมาจาก /hr/leave-days/count — ประเภทที่นับเฉพาะวันทำการจะไม่หักวันเหล่านี้ ประเภทที่นับวันปฏิทินจะหักรวมด้วย
import { Alert, Button, Modal, Space, Table, Tag, Typography } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

export interface LeaveDayCount {
  calendar_days: number
  weekend_days: number
  holidays: { date: string; name: string }[]
  working_days_only: boolean
  computed_days: number
}

export interface OffDay { date: string; kind: 'weekend' | 'holiday'; label: string }

const DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const beDate = (d: dayjs.Dayjs) => `${d.date()} ${d.toDate().toLocaleDateString('th-TH', { month: 'short' })} ${d.year() + 543}`

/** วันหยุดในช่วง [start, end] เรียงตามวันที่ — วันหยุดนักขตฤกษ์ที่ตรงเสาร์-อาทิตย์แสดงครั้งเดียว */
export const offDaysInRange = (start: string, end: string, holidays: { date: string; name: string }[]): OffDay[] => {
  const byDate = new Map(holidays.map(h => [h.date.slice(0, 10), h.name]))
  const out: OffDay[] = []
  for (let d = dayjs(start); !d.isAfter(dayjs(end), 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD')
    const weekend = d.day() === 0 || d.day() === 6
    const name = byDate.get(key)
    if (name) out.push({ date: key, kind: 'holiday', label: weekend ? `${name} (ตรงวัน${DOW[d.day()]})` : name })
    else if (weekend) out.push({ date: key, kind: 'weekend', label: `วัน${DOW[d.day()]}` })
  }
  return out
}

export default function HolidayOverlapModal({ open, start, end, count, leaveTypeName, onClose, onChangeDates }: {
  open: boolean
  start: string
  end: string
  count: LeaveDayCount | null
  leaveTypeName?: string
  onClose: () => void
  /** เลือกช่วงวันลาใหม่ (ล้างช่วงวันที่ในฟอร์ม) */
  onChangeDates: () => void
}) {
  const days = count ? offDaysInRange(start, end, count.holidays) : []
  const holidayCount = days.filter(d => d.kind === 'holiday').length
  const weekendCount = days.length - holidayCount
  const s = dayjs(start), e = dayjs(end)

  return (
    <Modal
      open={open && !!count}
      onCancel={onClose}
      title={<Space><CalendarOutlined style={{ color: '#f59e0b' }} /><span>ช่วงวันลาคาบเกี่ยววันหยุด</span></Space>}
      footer={
        <Space>
          <Button onClick={onChangeDates}>เลือกวันใหม่</Button>
          <Button type="primary" onClick={onClose}>รับทราบ</Button>
        </Space>
      }
      width={560}
      destroyOnHidden
    >
      {count && (
        <>
          <Text>
            {leaveTypeName ? <>{leaveTypeName} · </> : null}
            <b>{beDate(s)}{s.isSame(e, 'day') ? '' : ` – ${beDate(e)}`}</b> ({count.calendar_days} วันปฏิทิน)
            {' '}มีวันหยุด <b>{days.length} วัน</b>
            {holidayCount > 0 && weekendCount > 0 ? ` (วันหยุดนักขตฤกษ์ ${holidayCount} · เสาร์-อาทิตย์ ${weekendCount})` : ''}
          </Text>
          <Table
            className="mt-3"
            size="small"
            rowKey="date"
            pagination={false}
            scroll={{ y: 240 }}
            dataSource={days}
            columns={[
              {
                title: 'วันที่', key: 'date', width: 170,
                render: (_: unknown, d: OffDay) => <Text>{DOW_SHORT[dayjs(d.date).day()]} {beDate(dayjs(d.date))}</Text>,
              },
              {
                title: 'วันหยุด', key: 'label',
                render: (_: unknown, d: OffDay) => (
                  <Space size={6}>
                    <Tag color={d.kind === 'holiday' ? 'red' : 'default'} style={{ marginInlineEnd: 0 }}>{d.kind === 'holiday' ? 'นักขตฤกษ์' : 'เสาร์-อาทิตย์'}</Tag>
                    <Text style={{ fontSize: 13 }}>{d.label}</Text>
                  </Space>
                ),
              },
            ]}
          />
          <Alert
            className="mt-3"
            showIcon
            type={count.working_days_only ? 'success' : 'warning'}
            title={count.working_days_only
              ? <>ประเภทการลานี้นับเฉพาะวันทำการ — <b>ไม่หักวันหยุด {days.length} วัน</b> คิดเป็น <b>{count.computed_days} วันทำการ</b></>
              : <>ประเภทการลานี้นับวันปฏิทินต่อเนื่อง — <b>หักรวมวันหยุดด้วย</b> คิดเป็น <b>{count.computed_days} วัน</b></>}
            description={count.working_days_only
              ? 'หากท่านต้องปฏิบัติงานในวันหยุด (เช่น อยู่เวร) และลาในวันนั้น แก้จำนวนวันในช่อง "จำนวนวันที่ใช้ลา" ได้ · งานทรัพยากรบุคคลตรวจซ้ำอีกครั้ง'
              : 'ตามระเบียบ การลาประเภทนี้นับวันหยุดที่อยู่ระหว่างวันลารวมด้วย · งานทรัพยากรบุคคลตรวจซ้ำอีกครั้ง'}
          />
        </>
      )}
    </Modal>
  )
}
