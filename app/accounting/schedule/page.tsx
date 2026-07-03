'use client'
import React, { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  Typography, Breadcrumb, Card, Tag, Button, Table, Tabs, Badge,
  Modal, Form, Input, Select, Row, Col, Alert, Space, InputNumber, App,
  DatePicker, Tooltip, Statistic, Empty,
} from 'antd'
import type { Dayjs } from 'dayjs'
import {
  CalendarOutlined, PlusOutlined, SwapOutlined, UserAddOutlined,
  DollarOutlined, TeamOutlined, WarningOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, ScheduleOutlined, SettingOutlined,
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography
const { TextArea } = Input

// ── Types ──────────────────────────────────────────────────────────────────

// ประเภทเวร 6 แบบ ตามเงื่อนไขระบบ
type ShiftKey = 'morning' | 'afternoon' | 'night' | 'ot_in' | 'ot_out' | 'on_call'

interface ShiftType {
  key: ShiftKey
  label: string
  short: string        // ตัวย่อในช่องตาราง
  time: string
  color: string
  unit: 'shift' | 'hour'   // คิดเงินต่อเวร หรือต่อชั่วโมง
  doctorOnly?: boolean      // on call เฉพาะแพทย์
}

// กลุ่มตำแหน่ง — ใช้กำหนดอัตราค่าตอบแทนที่ต่างกัน (แพทย์ > พยาบาล > เทคนิคฯ > ทั่วไป)
type PositionGroup = 'doctor' | 'nurse' | 'medtech' | 'general'

const POSITION_GROUPS: { key: PositionGroup; label: string; color: string }[] = [
  { key: 'doctor',  label: 'แพทย์',              color: '#ef4444' },
  { key: 'nurse',   label: 'พยาบาล',             color: '#3b82f6' },
  { key: 'medtech', label: 'เทคนิคการแพทย์',     color: '#8b5cf6' },
  { key: 'general', label: 'เจ้าหน้าที่ทั่วไป',   color: '#64748b' },
]
const GROUP_MAP = Object.fromEntries(POSITION_GROUPS.map(g => [g.key, g])) as Record<PositionGroup, typeof POSITION_GROUPS[number]>

interface Staff {
  id: string
  name: string
  position: string
  group: PositionGroup      // กลุ่มตำแหน่งสำหรับคิดอัตราค่าตอบแทน
  department: string
  isDoctor?: boolean
}

// ตารางเวร 1 ชุด — แผนกหนึ่งสร้างได้หลายตาราง (เวรปกติ / โอทีแยก)
interface Schedule {
  id: string
  name: string
  department: string
  kind: 'regular' | 'ot'    // เวรปฏิบัติงานปกติ หรือตารางโอทีเฉพาะ
  month: string             // YYYY-MM
  memberIds: string[]       // เจ้าหน้าที่ในตาราง (รวมเสริมข้ามแผนก)
}

// การจัดเวร 1 ช่อง = คน + วัน + ประเภทเวร (+ ชั่วโมงถ้าเป็น OT)
interface Assignment {
  id: string
  scheduleId: string
  staffId: string
  date: string              // YYYY-MM-DD
  shift: ShiftKey
  hours?: number            // เฉพาะเวรคิดต่อชั่วโมง
}

interface SwapRequest {
  id: string
  assignmentAId: string
  assignmentBId: string
  requestBy: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestDate: string
}

// ── Config / Mock data ─────────────────────────────────────────────────────

const SHIFT_TYPES: ShiftType[] = [
  { key: 'morning',   label: 'เวรเช้า',                 short: 'ช',  time: '08:00–16:00', color: '#f59e0b', unit: 'shift' },
  { key: 'afternoon', label: 'เวรบ่าย',                 short: 'บ',  time: '16:00–24:00', color: '#3b82f6', unit: 'shift' },
  { key: 'night',     label: 'เวรดึก',                  short: 'ด',  time: '00:00–08:00', color: '#8b5cf6', unit: 'shift' },
  { key: 'ot_in',     label: 'โอทีในเวลาราชการ',       short: 'OT', time: 'ตามชั่วโมงจริง', color: '#10b981', unit: 'hour' },
  { key: 'ot_out',    label: 'โอทีนอกเวลาราชการ',      short: 'OTn', time: 'ตามชั่วโมงจริง', color: '#14b8a6', unit: 'hour' },
  { key: 'on_call',   label: 'On call (แพทย์)',         short: 'OC', time: 'ตลอด 24 ชม.',  color: '#ef4444', unit: 'shift', doctorOnly: true },
]
const SHIFT_MAP = Object.fromEntries(SHIFT_TYPES.map(s => [s.key, s])) as Record<ShiftKey, ShiftType>

// อัตราค่าตอบแทนเริ่มต้น แยกตามกลุ่มตำแหน่ง — แก้ได้ในแท็บตั้งค่ารายได้ (เงื่อนไขที่ 4)
// แถว = กลุ่มตำแหน่ง, คอลัมน์ = ประเภทเวร (บาท/เวร หรือ บาท/ชม. ตาม unit ของเวร)
type RateTable = Record<PositionGroup, Record<ShiftKey, number>>
const DEFAULT_RATES: RateTable = {
  doctor:  { morning: 1100, afternoon: 1200, night: 1400, ot_in: 100, ot_out: 240, on_call: 1500 },
  nurse:   { morning:  600, afternoon:  700, night:  800, ot_in:  50, ot_out: 120, on_call: 0 },
  medtech: { morning:  550, afternoon:  650, night:  750, ot_in:  50, ot_out: 110, on_call: 0 },
  general: { morning:  420, afternoon:  480, night:  550, ot_in:  50, ot_out:  90, on_call: 0 },
}

const DEPARTMENTS = ['แผนก OPD', 'แผนก IPD', 'ห้องฉุกเฉิน (ER)', 'ห้องปฏิบัติการ', 'องค์กรแพทย์']

const MOCK_STAFF: Staff[] = [
  { id: 'S01', name: 'นางสาวกานดา ใจดี',     position: 'พยาบาลวิชาชีพ',  group: 'nurse',   department: 'แผนก OPD' },
  { id: 'S02', name: 'นางเพ็ญศรี สุขสม',      position: 'พยาบาลวิชาชีพ',  group: 'nurse',   department: 'แผนก OPD' },
  { id: 'S03', name: 'นายอนุชา แข็งขัน',      position: 'ผู้ช่วยพยาบาล',   group: 'general', department: 'แผนก OPD' },
  { id: 'S04', name: 'นางสาววิภา รักงาน',     position: 'พยาบาลวิชาชีพ',  group: 'nurse',   department: 'แผนก IPD' },
  { id: 'S05', name: 'นางสาวมยุรี ตั้งใจ',     position: 'พยาบาลวิชาชีพ',  group: 'nurse',   department: 'แผนก IPD' },
  { id: 'S06', name: 'นายสมโชค พร้อมเสมอ',   position: 'ผู้ช่วยพยาบาล',   group: 'general', department: 'แผนก IPD' },
  { id: 'S07', name: 'นางสาวปรียา ว่องไว',    position: 'พยาบาลวิชาชีพ',  group: 'nurse',   department: 'ห้องฉุกเฉิน (ER)' },
  { id: 'S08', name: 'นายเข้มแข็ง กล้าหาญ',   position: 'เวชกิจฉุกเฉิน',   group: 'general', department: 'ห้องฉุกเฉิน (ER)' },
  { id: 'S09', name: 'นางสาวสุดา แล็บดี',     position: 'นักเทคนิคการแพทย์', group: 'medtech', department: 'ห้องปฏิบัติการ' },
  { id: 'D01', name: 'นพ.ประเสริฐ รักษาดี',   position: 'นายแพทย์ชำนาญการ', group: 'doctor', department: 'องค์กรแพทย์', isDoctor: true },
  { id: 'D02', name: 'พญ.สุมาลี ใส่ใจ',       position: 'นายแพทย์ปฏิบัติการ', group: 'doctor', department: 'องค์กรแพทย์', isDoctor: true },
]
const STAFF_MAP = Object.fromEntries(MOCK_STAFF.map(s => [s.id, s])) as Record<string, Staff>

const CURRENT_MONTH = dayjs().format('YYYY-MM')
const d = (day: number) => `${CURRENT_MONTH}-${String(day).padStart(2, '0')}`

// ตัวอย่างตามโจทย์: แผนก ก สร้างตาราง a (เวรปกติ) + ตาราง b (โอทีเฉพาะ) / แผนกที่ 2 มีตารางของตัวเอง
const MOCK_SCHEDULES: Schedule[] = [
  { id: 'SC-A', name: 'ตารางเวรปฏิบัติงาน OPD',   department: 'แผนก OPD',        kind: 'regular', month: CURRENT_MONTH, memberIds: ['S01', 'S02', 'S03', 'S04'] }, // S04 = เสริมจาก IPD
  { id: 'SC-B', name: 'ตารางโอทีเฉพาะ OPD',       department: 'แผนก OPD',        kind: 'ot',      month: CURRENT_MONTH, memberIds: ['S01', 'S02'] },
  { id: 'SC-C', name: 'ตารางเวรปฏิบัติงาน IPD',   department: 'แผนก IPD',        kind: 'regular', month: CURRENT_MONTH, memberIds: ['S04', 'S05', 'S06'] },
  { id: 'SC-D', name: 'ตารางเวร ER + แพทย์ on call', department: 'ห้องฉุกเฉิน (ER)', kind: 'regular', month: CURRENT_MONTH, memberIds: ['S07', 'S08', 'D01', 'D02'] },
]

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'A01', scheduleId: 'SC-A', staffId: 'S01', date: d(1), shift: 'morning' },
  { id: 'A02', scheduleId: 'SC-A', staffId: 'S02', date: d(1), shift: 'afternoon' },
  { id: 'A03', scheduleId: 'SC-A', staffId: 'S03', date: d(1), shift: 'night' },
  { id: 'A04', scheduleId: 'SC-A', staffId: 'S01', date: d(2), shift: 'morning' },
  // ตัวอย่าง: คนเดียวกันอยู่ เช้า + บ่าย วันเดียวกันได้ (ต่างประเภทกัน) — ห้ามเฉพาะประเภทซ้ำ
  { id: 'A16', scheduleId: 'SC-A', staffId: 'S01', date: d(2), shift: 'afternoon' },
  { id: 'A05', scheduleId: 'SC-A', staffId: 'S04', date: d(2), shift: 'afternoon' },  // เสริมข้ามแผนก
  { id: 'A06', scheduleId: 'SC-A', staffId: 'S02', date: d(3), shift: 'morning' },
  { id: 'A07', scheduleId: 'SC-B', staffId: 'S01', date: d(3), shift: 'ot_in',  hours: 4 },
  { id: 'A08', scheduleId: 'SC-B', staffId: 'S02', date: d(5), shift: 'ot_out', hours: 3 },
  { id: 'A09', scheduleId: 'SC-C', staffId: 'S05', date: d(1), shift: 'morning' },
  { id: 'A10', scheduleId: 'SC-C', staffId: 'S06', date: d(1), shift: 'night' },
  { id: 'A11', scheduleId: 'SC-C', staffId: 'S04', date: d(3), shift: 'morning' },
  { id: 'A12', scheduleId: 'SC-D', staffId: 'S07', date: d(1), shift: 'morning' },
  { id: 'A13', scheduleId: 'SC-D', staffId: 'D01', date: d(1), shift: 'on_call' },
  { id: 'A14', scheduleId: 'SC-D', staffId: 'D02', date: d(2), shift: 'on_call' },
  { id: 'A15', scheduleId: 'SC-D', staffId: 'S08', date: d(2), shift: 'afternoon' },
]

const MOCK_SWAPS: SwapRequest[] = [
  { id: 'SW-01', assignmentAId: 'A01', assignmentBId: 'A02', requestBy: 'นางสาวกานดา ใจดี', reason: 'ติดธุระครอบครัวช่วงเช้า', status: 'pending', requestDate: d(1) },
]

const SWAP_STATUS = {
  pending:  { color: 'warning', label: 'รออนุมัติ' },
  approved: { color: 'success', label: 'อนุมัติแล้ว' },
  rejected: { color: 'error',   label: 'ไม่อนุมัติ' },
} as const

const fmtBaht = (n: number) => n.toLocaleString('th-TH')
const fmtThDate = (iso: string) => {
  const dj = dayjs(iso)
  return `${dj.date()}/${dj.month() + 1}/${dj.year() + 543}`
}

// ── PageContent ────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message, modal } = App.useApp()

  const [schedules, setSchedules] = useState<Schedule[]>(MOCK_SCHEDULES)
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS)
  const [swaps, setSwaps] = useState<SwapRequest[]>(MOCK_SWAPS)
  const [rates, setRates] = useState<RateTable>(() => JSON.parse(JSON.stringify(DEFAULT_RATES)))

  // อัตราของเจ้าหน้าที่คนหนึ่งสำหรับเวรหนึ่ง — ตามกลุ่มตำแหน่ง
  const rateOf = (staffId: string, shift: ShiftKey): number =>
    rates[STAFF_MAP[staffId]?.group ?? 'general'][shift]

  const [activeScheduleId, setActiveScheduleId] = useState<string>(schedules[0]?.id)
  const activeSchedule = schedules.find(s => s.id === activeScheduleId)

  const [createModal, setCreateModal] = useState(false)
  const [assignModal, setAssignModal] = useState<{ staffId?: string; date?: string } | null>(null)
  const [memberModal, setMemberModal] = useState(false)
  const [swapModal, setSwapModal] = useState(false)
  const [createForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const [memberForm] = Form.useForm()
  const [swapForm] = Form.useForm()

  const monthDays = useMemo(() => {
    const m = activeSchedule ? dayjs(activeSchedule.month + '-01') : dayjs()
    return Array.from({ length: m.daysInMonth() }, (_, i) => m.date(i + 1))
  }, [activeSchedule])

  // ── เงื่อนไขที่ 1: ตรวจเวรซ้ำข้ามทุกตาราง (ทุกแผนก) ─────────────────────
  // คนเดียวกัน + วันเดียวกัน + ประเภทเวรเดียวกัน = ห้ามซ้ำเด็ดขาด
  // คนเดียวกัน + วันเดียวกัน + ประเภทต่างกัน = เตือน (เช่น เวรปกติ + โอที ทำได้)
  const findDuplicate = (staffId: string, date: string, shift: ShiftKey, exceptId?: string) =>
    assignments.find(a => a.id !== exceptId && a.staffId === staffId && a.date === date && a.shift === shift)

  const findSameDay = (staffId: string, date: string, exceptId?: string) =>
    assignments.filter(a => a.id !== exceptId && a.staffId === staffId && a.date === date)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const submitCreateSchedule = (v: { name: string; department: string; kind: Schedule['kind']; month: Dayjs }) => {
    const id = `SC-${String(schedules.length + 1).padStart(2, '0')}`
    const sc: Schedule = { id, name: v.name, department: v.department, kind: v.kind, month: v.month.format('YYYY-MM'), memberIds: [] }
    setSchedules(prev => [...prev, sc])
    setActiveScheduleId(id)
    setCreateModal(false)
    createForm.resetFields()
    message.success(`สร้าง "${v.name}" แล้ว — เพิ่มเจ้าหน้าที่เข้าตารางได้เลย`)
  }

  const submitAssign = (v: { staffId: string; date: Dayjs; shift: ShiftKey; hours?: number }) => {
    if (!activeSchedule) return
    const date = v.date.format('YYYY-MM-DD')
    const staff = STAFF_MAP[v.staffId]
    const st = SHIFT_MAP[v.shift]

    if (st.doctorOnly && !staff.isDoctor) {
      message.error(`เวร ${st.label} จัดได้เฉพาะแพทย์เท่านั้น`)
      return
    }
    // เงื่อนไขที่ 1 — ห้ามประเภทซ้ำในวันเดียวกัน (เช็คข้ามทุกตาราง/ทุกแผนก)
    const dup = findDuplicate(v.staffId, date, v.shift)
    if (dup) {
      const dupSc = schedules.find(s => s.id === dup.scheduleId)
      message.error(`${staff.name} มี "${st.label}" วันที่ ${fmtThDate(date)} อยู่แล้วในตาราง "${dupSc?.name}" — จัดซ้ำไม่ได้`)
      return
    }
    const doAssign = () => {
      setAssignments(prev => [...prev, {
        id: `A${Date.now()}`, scheduleId: activeSchedule.id, staffId: v.staffId, date, shift: v.shift,
        hours: st.unit === 'hour' ? (v.hours ?? 1) : undefined,
      }])
      setAssignModal(null)
      assignForm.resetFields()
      message.success(`จัด ${st.label} ให้ ${staff.name} วันที่ ${fmtThDate(date)} แล้ว`)
    }
    // มีเวรอื่นวันเดียวกัน → เตือนก่อนยืนยัน (เช่น เวรเช้า + โอทีนอกเวลา ทำได้)
    const sameDay = findSameDay(v.staffId, date)
    if (sameDay.length > 0) {
      modal.confirm({
        title: 'มีเวรอื่นในวันเดียวกัน',
        icon: <WarningOutlined style={{ color: '#f59e0b' }} />,
        content: (
          <div>
            <div style={{ marginBottom: 8 }}>{staff.name} มีเวรวันที่ {fmtThDate(date)} อยู่แล้ว:</div>
            {sameDay.map(a => {
              const sc = schedules.find(s => s.id === a.scheduleId)
              return <Tag key={a.id} color={SHIFT_MAP[a.shift].color}>{SHIFT_MAP[a.shift].label} · {sc?.name}</Tag>
            })}
            <div style={{ marginTop: 8 }}>ยืนยันจัด {st.label} เพิ่มหรือไม่?</div>
          </div>
        ),
        okText: 'ยืนยันจัดเวร', cancelText: 'ยกเลิก',
        onOk: doAssign,
      })
      return
    }
    doAssign()
  }

  const removeAssignment = (a: Assignment) => {
    modal.confirm({
      title: 'ลบเวรนี้?',
      content: `${STAFF_MAP[a.staffId]?.name} · ${SHIFT_MAP[a.shift].label} · ${fmtThDate(a.date)}`,
      okText: 'ลบ', okButtonProps: { danger: true }, cancelText: 'ยกเลิก',
      onOk: () => setAssignments(prev => prev.filter(x => x.id !== a.id)),
    })
  }

  // เงื่อนไขที่ 3 — เพิ่มเจ้าหน้าที่เข้าตาราง (เลือกข้ามแผนกได้ = เสริมกำลัง)
  const submitAddMember = (v: { staffIds: string[] }) => {
    if (!activeSchedule) return
    setSchedules(prev => prev.map(s => s.id === activeSchedule.id
      ? { ...s, memberIds: [...new Set([...s.memberIds, ...v.staffIds])] }
      : s))
    setMemberModal(false)
    memberForm.resetFields()
    message.success(`เพิ่มเจ้าหน้าที่ ${v.staffIds.length} คนเข้าตารางแล้ว`)
  }

  const removeMember = (staffId: string) => {
    if (!activeSchedule) return
    const has = assignments.some(a => a.scheduleId === activeSchedule.id && a.staffId === staffId)
    if (has) {
      message.error('เจ้าหน้าที่คนนี้มีเวรในตารางอยู่ — ลบเวรออกก่อนจึงนำออกจากตารางได้')
      return
    }
    setSchedules(prev => prev.map(s => s.id === activeSchedule.id
      ? { ...s, memberIds: s.memberIds.filter(id => id !== staffId) }
      : s))
  }

  // เงื่อนไขที่ 2 — แลกเวร: ตรวจว่าอยู่กลุ่มงาน/แผนกเดียวกันก่อน
  const submitSwap = (v: { assignmentAId: string; assignmentBId: string; reason: string }) => {
    const a = assignments.find(x => x.id === v.assignmentAId)
    const b = assignments.find(x => x.id === v.assignmentBId)
    if (!a || !b) return
    const staffA = STAFF_MAP[a.staffId], staffB = STAFF_MAP[b.staffId]
    if (staffA.department !== staffB.department) {
      message.error(`แลกเวรได้เฉพาะกลุ่มงาน/แผนกเดียวกัน — ${staffA.name} (${staffA.department}) แลกกับ ${staffB.name} (${staffB.department}) ไม่ได้`)
      return
    }
    // เช็คว่าหลังแลกแล้วไม่เกิดเวรซ้ำ (สลับคนกัน)
    if (findDuplicate(staffB.id, a.date, a.shift, a.id) || findDuplicate(staffA.id, b.date, b.shift, b.id)) {
      message.error('แลกไม่ได้ — หลังแลกจะเกิดเวรประเภทเดียวกันซ้ำในวันเดียวกัน')
      return
    }
    setSwaps(prev => [{
      id: `SW-${String(prev.length + 1).padStart(2, '0')}`,
      assignmentAId: v.assignmentAId, assignmentBId: v.assignmentBId,
      requestBy: staffA.name, reason: v.reason, status: 'pending',
      requestDate: dayjs().format('YYYY-MM-DD'),
    }, ...prev])
    setSwapModal(false)
    swapForm.resetFields()
    message.success('ส่งคำขอแลกเวรแล้ว — รอหัวหน้าอนุมัติ')
  }

  const decideSwap = (sw: SwapRequest, ok: boolean) => {
    if (ok) {
      // สลับผู้ปฏิบัติงานของ 2 เวร
      const a = assignments.find(x => x.id === sw.assignmentAId)
      const b = assignments.find(x => x.id === sw.assignmentBId)
      if (a && b) {
        setAssignments(prev => prev.map(x =>
          x.id === a.id ? { ...x, staffId: b.staffId }
          : x.id === b.id ? { ...x, staffId: a.staffId }
          : x))
      }
    }
    setSwaps(prev => prev.map(x => x.id === sw.id ? { ...x, status: ok ? 'approved' : 'rejected' } : x))
    message.success(ok ? 'อนุมัติแลกเวรแล้ว — สลับเวรให้เรียบร้อย' : 'ปฏิเสธคำขอแลกเวรแล้ว')
  }

  // ── รายได้ประมาณการรายคน (เงื่อนไขที่ 4) ─────────────────────────────────
  const incomeRows = useMemo(() => {
    const byStaff: Record<string, { staff: Staff; count: Record<ShiftKey, number>; hours: Record<ShiftKey, number>; total: number }> = {}
    assignments.forEach(a => {
      const staff = STAFF_MAP[a.staffId]
      if (!staff) return
      if (!byStaff[a.staffId]) {
        byStaff[a.staffId] = {
          staff,
          count: { morning: 0, afternoon: 0, night: 0, ot_in: 0, ot_out: 0, on_call: 0 },
          hours: { morning: 0, afternoon: 0, night: 0, ot_in: 0, ot_out: 0, on_call: 0 },
          total: 0,
        }
      }
      const row = byStaff[a.staffId]
      row.count[a.shift] += 1
      const st = SHIFT_MAP[a.shift]
      const rate = rates[staff.group][a.shift]
      if (st.unit === 'hour') {
        row.hours[a.shift] += a.hours ?? 0
        row.total += (a.hours ?? 0) * rate
      } else {
        row.total += rate
      }
    })
    return Object.values(byStaff).sort((x, y) => y.total - x.total)
  }, [assignments, rates])

  const totalPayout = incomeRows.reduce((s, r) => s + r.total, 0)

  // ── ตารางกริดเวรรายเดือน ─────────────────────────────────────────────────
  const scheduleAssignments = assignments.filter(a => a.scheduleId === activeScheduleId)

  const gridColumns = [
    {
      title: 'เจ้าหน้าที่', key: 'staff', fixed: 'left' as const, width: 190,
      render: (_: unknown, staffId: string) => {
        const s = STAFF_MAP[staffId]
        if (!s) return staffId
        const isReinforce = activeSchedule && s.department !== activeSchedule.department
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {s.name}
              <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                onClick={() => removeMember(staffId)} style={{ minWidth: 0, height: 18, padding: '0 2px' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--app-text-3)' }}>{s.position}</div>
            {isReinforce && <Tag color="gold" style={{ fontSize: 9, lineHeight: '14px', padding: '0 4px', marginTop: 2 }}>เสริมจาก {s.department}</Tag>}
            {s.isDoctor && <Tag color="red" style={{ fontSize: 9, lineHeight: '14px', padding: '0 4px', marginTop: 2 }}>แพทย์</Tag>}
          </div>
        )
      },
    },
    ...monthDays.map(day => {
      const iso = day.format('YYYY-MM-DD')
      const isWeekend = [0, 6].includes(day.day())
      return {
        title: (
          <div style={{ textAlign: 'center' as const, lineHeight: 1.2 }}>
            <div style={{ fontSize: 10, color: isWeekend ? '#f87171' : 'var(--app-text-3)' }}>{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][day.day()]}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isWeekend ? '#f87171' : 'var(--app-text)' }}>{day.date()}</div>
          </div>
        ),
        key: iso, width: 52, align: 'center' as const,
        onCell: () => ({ style: { padding: 2, background: isWeekend ? 'rgba(248,113,113,0.05)' : undefined, cursor: 'pointer' } }),
        render: (_: unknown, staffId: string) => {
          const cell = scheduleAssignments.filter(a => a.staffId === staffId && a.date === iso)
          return (
            <div
              style={{ minHeight: 30, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center' }}
              onClick={() => {
                // คลิกช่อง (พื้นที่ว่าง) = เพิ่มเวร — เพิ่มซ้อนได้แม้มีเวรอื่นอยู่แล้ว (เช่น ช + บ)
                assignForm.setFieldsValue({ staffId, date: day, shift: undefined, hours: undefined })
                setAssignModal({ staffId, date: iso })
              }}
            >
              {cell.map(a => {
                const st = SHIFT_MAP[a.shift]
                return (
                  <Tooltip key={a.id} title={`${st.label} ${st.time}${a.hours ? ` · ${a.hours} ชม.` : ''} — คลิกเพื่อลบ`}>
                    <span
                      onClick={e => { e.stopPropagation(); removeAssignment(a) }}
                      style={{
                        display: 'inline-block', width: '100%', fontSize: 10, fontWeight: 700,
                        color: '#fff', background: st.color, borderRadius: 4, padding: '1px 0', lineHeight: '16px',
                      }}>
                      {st.short}{a.hours ? `·${a.hours}` : ''}
                    </span>
                  </Tooltip>
                )
              })}
              {/* ปุ่มเพิ่มเวรซ้อนในวันเดียวกัน — โผล่เฉพาะช่องที่มีเวรแล้ว */}
              {cell.length > 0 && (
                <span style={{ fontSize: 10, lineHeight: '12px', color: 'var(--app-text-3)', border: '1px dashed var(--app-border-strong)', borderRadius: 4, width: '100%' }}>
                  +
                </span>
              )}
            </div>
          )
        },
      }
    }),
  ]

  // ── สร้าง options สำหรับ swap (เฉพาะเวรที่จัดแล้ว) ───────────────────────
  const assignmentOption = (a: Assignment) => {
    const s = STAFF_MAP[a.staffId]; const st = SHIFT_MAP[a.shift]
    const sc = schedules.find(x => x.id === a.scheduleId)
    return { value: a.id, label: `${fmtThDate(a.date)} · ${st.label} · ${s?.name} (${sc?.name})` }
  }

  const pendingSwaps = swaps.filter(s => s.status === 'pending').length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { href: '/', title: 'หน้าหลัก' },
            { title: 'งานการเงินและบัญชี' },
            { title: 'ระบบจัดตารางเวร' },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <Title level={4} style={{ margin: 0 }}>
            <ScheduleOutlined style={{ color: '#0d9488', marginRight: 10 }} />
            ระบบจัดตารางเวรเจ้าหน้าที่โรงพยาบาล
          </Title>
          <Tag color="orange">MOCKUP — ข้อมูลจำลอง ยังไม่เชื่อม API</Tag>
        </div>

        {/* สรุปภาพรวม */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}><Card size="small"><Statistic title="ตารางเวรเดือนนี้" value={schedules.length} prefix={<CalendarOutlined style={{ color: '#0d9488' }} />} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="เวรที่จัดแล้ว" value={assignments.length} prefix={<TeamOutlined style={{ color: '#3b82f6' }} />} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="คำขอแลกเวรรออนุมัติ" value={pendingSwaps} prefix={<SwapOutlined style={{ color: '#f59e0b' }} />} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="ค่าตอบแทนประมาณการ (บาท)" value={totalPayout} precision={0} prefix={<DollarOutlined style={{ color: '#10b981' }} />} /></Card></Col>
        </Row>

        <Card>
          <Tabs type="line" items={[
            // ══ แท็บ 1: ตารางเวร (กริดรายเดือน) ══════════════════════════════
            {
              key: 'board',
              label: <span><CalendarOutlined /> ตารางเวร</span>,
              children: (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <Select
                      style={{ minWidth: 300 }}
                      value={activeScheduleId}
                      onChange={setActiveScheduleId}
                      options={schedules.map(s => ({
                        value: s.id,
                        label: `${s.name} · ${s.department} ${s.kind === 'ot' ? '· (โอทีเฉพาะ)' : ''}`,
                      }))}
                    />
                    <Button icon={<PlusOutlined />} type="primary" onClick={() => { assignForm.resetFields(); setAssignModal({}) }}>จัดเวร</Button>
                    <Button icon={<UserAddOutlined />} onClick={() => { memberForm.resetFields(); setMemberModal(true) }}>เพิ่มเจ้าหน้าที่ / เสริมข้ามแผนก</Button>
                    <div style={{ flex: 1 }} />
                    <Space size={4} wrap>
                      {SHIFT_TYPES.map(st => (
                        <Tag key={st.key} color={st.color} style={{ margin: 0 }}>{st.short} = {st.label}</Tag>
                      ))}
                    </Space>
                  </div>

                  <Alert
                    type="info" showIcon style={{ marginBottom: 12 }}
                    title="คลิกช่องว่างเพื่อจัดเวร · คลิกเวรที่จัดแล้วเพื่อลบ · ระบบตรวจเวรประเภทซ้ำในวันเดียวกันข้ามทุกตาราง/ทุกแผนกให้อัตโนมัติ"
                  />

                  {activeSchedule && activeSchedule.memberIds.length > 0 ? (
                    <Table
                      size="small"
                      dataSource={activeSchedule.memberIds}
                      rowKey={id => id}
                      pagination={false}
                      scroll={{ x: 190 + monthDays.length * 52 }}
                      columns={gridColumns as never}
                    />
                  ) : (
                    <Empty description="ยังไม่มีเจ้าหน้าที่ในตารางนี้ — กดปุ่ม เพิ่มเจ้าหน้าที่" />
                  )}
                </div>
              ),
            },
            // ══ แท็บ 2: จัดการตารางเวร ═══════════════════════════════════════
            {
              key: 'schedules',
              label: <span><SettingOutlined /> จัดการตารางเวร</span>,
              children: (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateModal(true) }}>
                      สร้างตารางเวรใหม่
                    </Button>
                  </div>
                  <Table
                    size="small"
                    dataSource={schedules}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: 'รหัส', dataIndex: 'id', width: 90, render: (v: string) => <code style={{ color: '#2dd4bf', fontSize: 11 }}>{v}</code> },
                      { title: 'ชื่อตาราง', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'แผนก/กลุ่มงาน', dataIndex: 'department', width: 160 },
                      { title: 'ประเภท', dataIndex: 'kind', width: 130,
                        render: (v: Schedule['kind']) => v === 'ot'
                          ? <Tag color="green">โอทีเฉพาะ</Tag>
                          : <Tag color="blue">เวรปฏิบัติงานปกติ</Tag> },
                      { title: 'เดือน', dataIndex: 'month', width: 100,
                        render: (v: string) => `${dayjs(v + '-01').month() + 1}/${dayjs(v + '-01').year() + 543}` },
                      { title: 'เจ้าหน้าที่', key: 'members', width: 110, align: 'center' as const,
                        render: (_: unknown, s: Schedule) => {
                          const reinforce = s.memberIds.filter(id => STAFF_MAP[id]?.department !== s.department).length
                          return <span>{s.memberIds.length} คน{reinforce > 0 && <Tag color="gold" style={{ marginLeft: 6, fontSize: 10 }}>เสริม {reinforce}</Tag>}</span>
                        } },
                      { title: 'เวรที่จัด', key: 'assigned', width: 90, align: 'center' as const,
                        render: (_: unknown, s: Schedule) => assignments.filter(a => a.scheduleId === s.id).length },
                      { title: '', key: 'open', width: 90,
                        render: (_: unknown, s: Schedule) => (
                          <Button size="small" onClick={() => setActiveScheduleId(s.id)}>เปิดตาราง</Button>
                        ) },
                    ]}
                  />
                </div>
              ),
            },
            // ══ แท็บ 3: แลกเวร ═══════════════════════════════════════════════
            {
              key: 'swap',
              label: (
                <Badge count={pendingSwaps} size="small" offset={[8, -2]}>
                  <span><SwapOutlined /> แลกเวร</span>
                </Badge>
              ),
              children: (
                <div>
                  <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                    title="แลกเวรได้เฉพาะเจ้าหน้าที่ในกลุ่มงาน/แผนกเดียวกันเท่านั้น และหลังแลกต้องไม่เกิดเวรประเภทซ้ำในวันเดียวกัน" />
                  <div style={{ marginBottom: 12 }}>
                    <Button type="primary" icon={<SwapOutlined />} onClick={() => { swapForm.resetFields(); setSwapModal(true) }}>
                      ขอแลกเวร
                    </Button>
                  </div>
                  <Table
                    size="small"
                    dataSource={swaps}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: 'ไม่มีคำขอแลกเวร' }}
                    columns={[
                      { title: 'รหัส', dataIndex: 'id', width: 80, render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
                      { title: 'เวรที่ 1', key: 'a', render: (_: unknown, sw: SwapRequest) => {
                          const a = assignments.find(x => x.id === sw.assignmentAId)
                          return a ? assignmentOption(a).label : '-'
                        } },
                      { title: 'เวรที่ 2', key: 'b', render: (_: unknown, sw: SwapRequest) => {
                          const b = assignments.find(x => x.id === sw.assignmentBId)
                          return b ? assignmentOption(b).label : '-'
                        } },
                      { title: 'เหตุผล', dataIndex: 'reason', width: 200 },
                      { title: 'สถานะ', dataIndex: 'status', width: 110,
                        render: (v: SwapRequest['status']) => <Tag color={SWAP_STATUS[v].color}>{SWAP_STATUS[v].label}</Tag> },
                      { title: 'พิจารณา', key: 'act', width: 150,
                        render: (_: unknown, sw: SwapRequest) => sw.status === 'pending' ? (
                          <Space size={4}>
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => decideSwap(sw, true)}>อนุมัติ</Button>
                            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => decideSwap(sw, false)} />
                          </Space>
                        ) : null },
                    ]}
                  />
                </div>
              ),
            },
            // ══ แท็บ 4: ตั้งค่ารายได้ + สรุปรายได้ ═══════════════════════════
            {
              key: 'income',
              label: <span><DollarOutlined /> ตั้งค่ารายได้</span>,
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={13}>
                    <Card size="small" title={<span><SettingOutlined style={{ marginRight: 6 }} />อัตราค่าตอบแทน — แยกตามกลุ่มตำแหน่ง × ประเภทเวร</span>}>
                      <Alert type="info" showIcon style={{ marginBottom: 12 }}
                        title="ค่าตอบแทนแต่ละกลุ่มตำแหน่งไม่เท่ากัน (แพทย์ / พยาบาล / เทคนิคการแพทย์ / เจ้าหน้าที่ทั่วไป) — On call ตั้งอัตราได้เฉพาะแพทย์" />
                      <Table
                        size="small"
                        dataSource={SHIFT_TYPES}
                        rowKey="key"
                        pagination={false}
                        scroll={{ x: 640 }}
                        columns={[
                          { title: 'ประเภทเวร', key: 'label', fixed: 'left' as const, width: 150,
                            render: (_: unknown, st: ShiftType) => (
                              <div>
                                <Tag color={st.color} style={{ marginBottom: 2 }}>{st.label}</Tag>
                                <div style={{ fontSize: 10, color: 'var(--app-text-3)' }}>
                                  {st.time} · {st.unit === 'hour' ? 'บาท/ชม.' : 'บาท/เวร'}{st.doctorOnly ? ' · เฉพาะแพทย์' : ''}
                                </div>
                              </div>
                            ) },
                          ...POSITION_GROUPS.map(g => ({
                            title: <span style={{ color: g.color, fontWeight: 700 }}>{g.label}</span>,
                            key: g.key, width: 130,
                            render: (_: unknown, st: ShiftType) => {
                              // เวรเฉพาะแพทย์ — กลุ่มอื่นไม่มีอัตรา
                              if (st.doctorOnly && g.key !== 'doctor') {
                                return <Text style={{ color: 'var(--app-text-3)' }}>—</Text>
                              }
                              return (
                                <InputNumber
                                  min={0} size="small" style={{ width: '100%' }}
                                  value={rates[g.key][st.key]}
                                  onChange={v => setRates(prev => ({
                                    ...prev,
                                    [g.key]: { ...prev[g.key], [st.key]: v ?? 0 },
                                  }))}
                                />
                              )
                            },
                          })),
                        ]}
                      />
                      <Button type="primary" block style={{ marginTop: 12 }}
                        onClick={() => message.success('บันทึกอัตราค่าตอบแทนแล้ว (mock)')}>
                        บันทึกการตั้งค่า
                      </Button>
                    </Card>
                  </Col>
                  <Col xs={24} xl={11}>
                    <Card size="small" title={<span><DollarOutlined style={{ marginRight: 6 }} />รายได้ประมาณการรายเจ้าหน้าที่ (เดือนนี้)</span>}>
                      <Table
                        size="small"
                        dataSource={incomeRows}
                        rowKey={r => r.staff.id}
                        pagination={false}
                        locale={{ emptyText: 'ยังไม่มีการจัดเวร' }}
                        columns={[
                          { title: 'เจ้าหน้าที่', key: 'staff',
                            render: (_: unknown, r: typeof incomeRows[number]) => (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.staff.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--app-text-3)' }}>
                                  <span style={{ color: GROUP_MAP[r.staff.group].color, fontWeight: 600 }}>{GROUP_MAP[r.staff.group].label}</span>
                                  {' · '}{r.staff.department}
                                </div>
                              </div>
                            ) },
                          { title: 'เวรที่ได้รับ', key: 'shifts',
                            render: (_: unknown, r: typeof incomeRows[number]) => (
                              <Space size={4} wrap>
                                {SHIFT_TYPES.filter(st => r.count[st.key] > 0).map(st => (
                                  <Tag key={st.key} color={st.color} style={{ margin: 0, fontSize: 10 }}>
                                    {st.label} ×{r.count[st.key]}{st.unit === 'hour' ? ` (${r.hours[st.key]} ชม.)` : ''}
                                  </Tag>
                                ))}
                              </Space>
                            ) },
                          { title: 'รวม (บาท)', key: 'total', width: 110, align: 'right' as const,
                            render: (_: unknown, r: typeof incomeRows[number]) => (
                              <Text strong style={{ color: '#10b981' }}>{fmtBaht(r.total)}</Text>
                            ) },
                        ]}
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}><Text strong>รวมทั้งหมด</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#10b981' }}>{fmtBaht(totalPayout)}</Text></Table.Summary.Cell>
                          </Table.Summary.Row>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]} />
        </Card>
      </div>

      {/* ══ Modal สร้างตารางเวร ══════════════════════════════════════════════ */}
      <Modal
        title={<span><PlusOutlined style={{ color: '#0d9488', marginRight: 8 }} />สร้างตารางเวรใหม่</span>}
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={() => createForm.submit()}
        okText="สร้างตาราง" cancelText="ยกเลิก"
      >
        <Form form={createForm} layout="vertical" onFinish={submitCreateSchedule} initialValues={{ kind: 'regular', month: dayjs() }}>
          <Form.Item name="name" label="ชื่อตารางเวร" rules={[{ required: true, message: 'ระบุชื่อตาราง' }]}>
            <Input placeholder="เช่น ตารางเวรปฏิบัติงาน OPD / ตารางโอทีเฉพาะ" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="department" label="แผนก/กลุ่มงานเจ้าของตาราง" rules={[{ required: true, message: 'เลือกแผนก' }]}>
                <Select options={DEPARTMENTS.map(dp => ({ value: dp, label: dp }))} placeholder="เลือกแผนก" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="month" label="ประจำเดือน" rules={[{ required: true }]}>
                <DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="kind" label="ประเภทตาราง" rules={[{ required: true }]}>
            <Select options={[
              { value: 'regular', label: 'เวรปฏิบัติงานปกติ (เช้า/บ่าย/ดึก/on call)' },
              { value: 'ot', label: 'ตารางโอทีเฉพาะ (แยกจากเวรปกติ)' },
            ]} />
          </Form.Item>
          <Alert type="info" showIcon title="แผนกเดียวกันสร้างได้หลายตาราง (เช่น เวรปกติ 1 ตาราง + โอทีเฉพาะ 1 ตาราง) — ระบบจะตรวจเวรประเภทซ้ำในวันเดียวกันข้ามตารางให้" />
        </Form>
      </Modal>

      {/* ══ Modal จัดเวร ═════════════════════════════════════════════════════ */}
      <Modal
        title={<span><CalendarOutlined style={{ color: '#0d9488', marginRight: 8 }} />จัดเวร — {activeSchedule?.name}</span>}
        open={!!assignModal}
        onCancel={() => setAssignModal(null)}
        onOk={() => assignForm.submit()}
        okText="จัดเวร" cancelText="ยกเลิก"
      >
        <Form form={assignForm} layout="vertical" onFinish={submitAssign}>
          <Form.Item name="staffId" label="เจ้าหน้าที่" rules={[{ required: true, message: 'เลือกเจ้าหน้าที่' }]}>
            <Select
              showSearch optionFilterProp="label"
              placeholder="เลือกเจ้าหน้าที่ในตารางนี้"
              options={(activeSchedule?.memberIds ?? []).map(id => {
                const s = STAFF_MAP[id]
                return { value: id, label: `${s?.name} · ${s?.position}${s?.department !== activeSchedule?.department ? ` (เสริมจาก ${s?.department})` : ''}` }
              })}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="วันที่" rules={[{ required: true, message: 'เลือกวันที่' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shift" label="ประเภทเวร" rules={[{ required: true, message: 'เลือกประเภทเวร' }]}>
                <Select
                  placeholder="เลือกประเภทเวร"
                  options={SHIFT_TYPES.map(st => ({
                    value: st.key,
                    label: `${st.label} (${st.time})${st.doctorOnly ? ' — เฉพาะแพทย์' : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate={(p, c) => p.shift !== c.shift || p.staffId !== c.staffId}>
            {({ getFieldValue }) => {
              const sh: ShiftKey | undefined = getFieldValue('shift')
              const sid: string | undefined = getFieldValue('staffId')
              if (!sh) return null
              const rate = sid ? rateOf(sid, sh) : undefined
              const groupLabel = sid ? GROUP_MAP[STAFF_MAP[sid]?.group ?? 'general'].label : undefined
              return SHIFT_MAP[sh].unit === 'hour' ? (
                <Form.Item name="hours"
                  label={`จำนวนชั่วโมง${rate != null ? ` (อัตรา${groupLabel ? `กลุ่ม${groupLabel}` : ''} ${fmtBaht(rate)} บาท/ชม.)` : ''}`}
                  rules={[{ required: true, message: 'ระบุชั่วโมง' }]}>
                  <InputNumber min={1} max={24} style={{ width: '100%' }} addonAfter="ชั่วโมง" />
                </Form.Item>
              ) : rate != null ? (
                <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--app-text-3)' }}>
                  อัตราค่าตอบแทนกลุ่ม{groupLabel}: <Text strong style={{ color: '#10b981' }}>{fmtBaht(rate)} บาท/เวร</Text>
                </div>
              ) : null
            }}
          </Form.Item>
          <Alert type="info" showIcon
            title="ระบบตรวจสอบให้อัตโนมัติ: ห้ามเวรประเภทเดียวกันซ้ำในวันเดียวกัน (เช็คข้ามทุกตาราง/ทุกแผนก) — ถ้ามีเวรอื่นวันเดียวกันจะเตือนก่อนยืนยัน" />
        </Form>
      </Modal>

      {/* ══ Modal เพิ่มเจ้าหน้าที่ / เสริมข้ามแผนก ═══════════════════════════ */}
      <Modal
        title={<span><UserAddOutlined style={{ color: '#0d9488', marginRight: 8 }} />เพิ่มเจ้าหน้าที่เข้าตาราง — {activeSchedule?.name}</span>}
        open={memberModal}
        onCancel={() => setMemberModal(false)}
        onOk={() => memberForm.submit()}
        okText="เพิ่มเข้าตาราง" cancelText="ยกเลิก"
      >
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          title="เลือกเจ้าหน้าที่แผนกอื่นได้ — จะติดป้าย “เสริม” ในตาราง (เงื่อนไขที่ 3: เสริมกำลังข้ามแผนก)" />
        <Form form={memberForm} layout="vertical" onFinish={submitAddMember}>
          <Form.Item name="staffIds" label="เจ้าหน้าที่" rules={[{ required: true, message: 'เลือกอย่างน้อย 1 คน' }]}>
            <Select
              mode="multiple" showSearch optionFilterProp="label"
              placeholder="ค้นหาชื่อเจ้าหน้าที่ (ทุกแผนก)"
              options={MOCK_STAFF
                .filter(s => !activeSchedule?.memberIds.includes(s.id))
                .map(s => ({
                  value: s.id,
                  label: `${s.name} · ${s.position} · ${s.department}${s.department !== activeSchedule?.department ? ' (ต่างแผนก)' : ''}`,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Modal ขอแลกเวร ═══════════════════════════════════════════════════ */}
      <Modal
        title={<span><SwapOutlined style={{ color: '#f59e0b', marginRight: 8 }} />ขอแลกเวร</span>}
        open={swapModal}
        onCancel={() => setSwapModal(false)}
        onOk={() => swapForm.submit()}
        okText="ส่งคำขอแลกเวร" cancelText="ยกเลิก"
        width={640}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          title="แลกได้เฉพาะเจ้าหน้าที่กลุ่มงาน/แผนกเดียวกัน (เงื่อนไขที่ 2) — ระบบตรวจแผนกและเวรซ้ำให้ตอนส่งคำขอ" />
        <Form form={swapForm} layout="vertical" onFinish={submitSwap}>
          <Form.Item name="assignmentAId" label="เวรของผู้ขอแลก" rules={[{ required: true, message: 'เลือกเวร' }]}>
            <Select showSearch optionFilterProp="label" placeholder="เลือกเวรที่ต้องการแลกออก"
              options={assignments.map(assignmentOption)} />
          </Form.Item>
          <Form.Item name="assignmentBId" label="เวรที่ต้องการแลกด้วย" rules={[{ required: true, message: 'เลือกเวร' }]}>
            <Select showSearch optionFilterProp="label" placeholder="เลือกเวรของเพื่อนร่วมแผนก"
              options={assignments.map(assignmentOption)} />
          </Form.Item>
          <Form.Item name="reason" label="เหตุผล" rules={[{ required: true, message: 'ระบุเหตุผล' }]}>
            <TextArea rows={2} placeholder="เช่น ติดธุระครอบครัว / นัดแพทย์" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <AppThemeProvider colorPrimary="#0d9488">
      <PageContent />
    </AppThemeProvider>
  )
}
