'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Select,
  Button, Modal, Form, Input, InputNumber, DatePicker, Space, Table, Drawer,
  Descriptions, Progress, Divider, Popconfirm, Timeline, Empty, Row, Col, Switch,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, ProjectOutlined, InfoCircleOutlined,
  SyncOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  RiseOutlined, ReloadOutlined, DollarOutlined, FlagOutlined, TeamOutlined,
  FileTextOutlined, SettingOutlined,
} from '@ant-design/icons'
import { FaMicrochip } from 'react-icons/fa'
import dayjs, { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import EChart from '@/app/components/EChart'
import { StatCard, ACCENTS, gBtn } from '@/app/components/StatCard'
import {
  fetchRoadmap, fetchMeta, apiCreateTask, apiUpdateTask, apiDeleteTask, apiAddProgress, apiResetRoadmap,
  apiCreateKpi, apiUpdateKpi, apiDeleteKpi,
  MISSION_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS,
  DEPARTMENT_OPTIONS, KPI_OPTIONS,
  formatTHB, budgetUtilization, taskFiscalYear, fiscalYearOf,
  getProgressColor, getStatusMeta, getMissionMeta, getPriorityMeta,
  type Task, type LinkRow, type TaskType, type Mission, type ProjectStatus,
  type Priority, type RoadmapMeta,
} from './data'

const { Title, Text } = Typography
const { TextArea } = Input

const DAY = 86400000

type FormShape = {
  type: TaskType
  text: string
  code?: string
  parent?: string
  mission: Mission
  fiscalYear?: number
  status?: ProjectStatus
  priority?: Priority
  range: [Dayjs, Dayjs]
  progress?: number
  ownerUserId?: number
  ownerPosition?: string
  department?: string
  contact?: string
  budgetRequested?: number
  budgetApproved?: number
  budgetSpent?: number
  budgetSource?: string
  kpiCode?: string
  description?: string
  expectedOutcome?: string
  vendor?: string
  riskNote?: string
}

const computeStats = (taskData: Task[]) => {
  const t = taskData.filter(x => x.type !== 'milestone' && typeof x.progress === 'number')
  const done     = t.filter(x => (x.progress ?? 0) >= 100).length
  const notStart = t.filter(x => (x.progress ?? 0) <= 0).length
  const slow     = t.filter(x => (x.progress ?? 0) > 0 && (x.progress ?? 0) < 40).length
  const active   = t.filter(x => (x.progress ?? 0) >= 40 && (x.progress ?? 0) < 100).length
  return { done, notStart, slow, active, total: t.length }
}

const sumBudget = (tasks: Task[]) => {
  const projects = tasks.filter(t => t.type === 'project')
  const requested = projects.reduce((s, p) => s + (p.budgetRequested ?? 0), 0)
  const approved  = projects.reduce((s, p) => s + (p.budgetApproved  ?? 0), 0)
  const spent     = projects.reduce((s, p) => s + (p.budgetSpent     ?? 0), 0)
  return { requested, approved, spent }
}


const GanttPageContent = () => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  // ม่วงอ่อน (#c4b5fd) อ่านยากบนการ์ดขาว — โหมด light ใช้ม่วงเข้มแทน
  const cPurple = isDark ? '#c4b5fd' : '#7c3aed'
  const { message, modal } = App.useApp()

  const [hydrated, setHydrated] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [meta, setMeta] = useState<RoadmapMeta | null>(null)
  const [selectedFY, setSelectedFY] = useState<string>('all')
  const [selectedMission, setSelectedMission] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorType, setEditorType] = useState<TaskType>('project')
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressTargetId, setProgressTargetId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const [form] = Form.useForm<FormShape>()
  const [progressForm] = Form.useForm<{ progress: number; note: string; reportedBy: string; budgetSpentDelta?: number }>()
  const watchedType = Form.useWatch('type', form)
  const watchedFY = Form.useWatch('fiscalYear', form)
  const watchedKpi = Form.useWatch('kpiCode', form)

  // KPI master manager
  type KpiFormShape = { code: string; name: string; target?: string; years?: number[]; active?: boolean }
  const [kpiMgrOpen, setKpiMgrOpen] = useState(false)
  const [editingKpiCode, setEditingKpiCode] = useState<string | null>(null)
  const [kpiForm] = Form.useForm<KpiFormShape>()

  const reload = async () => {
    try {
      const { tasks: t, links: l } = await fetchRoadmap()
      setTasks(t)
      setLinks(l)
    } catch {
      message.error('โหลดข้อมูลแผนงานไม่สำเร็จ')
    }
  }

  const reloadMeta = () => fetchMeta().then(setMeta).catch(() => {})

  useEffect(() => {
    Promise.all([reload(), reloadMeta()]).finally(() => setHydrated(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const staffOptions = useMemo(
    () => (meta?.staff ?? []).map(s => ({
      value: s.id,
      label: s.position ? `${s.name} — ${s.position}` : s.name,
      staff: s,
    })),
    [meta]
  )

  // ตัวเลือกปีงบสำหรับ multi-select ของ KPI (ช่วงรอบปีปัจจุบัน + ปีที่มีข้อมูลจริง)
  const yearOptions = useMemo(() => {
    const cur = fiscalYearOf(dayjs().toISOString())
    const set = new Set<number>()
    for (let y = cur - 1; y <= cur + 5; y++) set.add(y)
    ;(meta?.kpis ?? []).forEach(k => k.years.forEach(y => set.add(y)))
    tasks.forEach(t => set.add(taskFiscalYear(t)))
    return Array.from(set).sort((a, b) => a - b).map(y => ({ value: y, label: `ปีงบ ${y}` }))
  }, [meta, tasks])

  // KPI ที่เลือกได้ในฟอร์มงาน — กรองตามปีงบของงาน (years ว่าง = ใช้ได้ทุกปี)
  const kpiChoices = useMemo(() => {
    const fy = watchedFY ? Number(watchedFY) : undefined
    const all = meta?.kpis ?? []
    let list = all.filter(k => !fy || k.years.length === 0 || k.years.includes(fy))
    if (watchedKpi && !list.some(k => k.code === watchedKpi)) {
      const cur = all.find(k => k.code === watchedKpi)
      if (cur) list = [cur, ...list]   // คง KPI เดิมของงานไว้แม้ไม่ตรงปีงบ
    }
    return list
  }, [meta, watchedFY, watchedKpi])

  const openKpiCreate = () => {
    setEditingKpiCode(null)
    kpiForm.resetFields()
    kpiForm.setFieldsValue({ active: true, years: [] })
  }
  const openKpiEdit = (k: { code: string; name: string; target: string; years: number[] }) => {
    setEditingKpiCode(k.code)
    kpiForm.setFieldsValue({ code: k.code, name: k.name, target: k.target, years: k.years, active: true })
  }
  const submitKpi = async () => {
    const v = await kpiForm.validateFields()
    try {
      if (editingKpiCode) await apiUpdateKpi(editingKpiCode, { name: v.name, target: v.target, years: v.years, active: v.active })
      else await apiCreateKpi({ code: v.code, name: v.name, target: v.target, years: v.years, active: v.active })
      await reloadMeta()
      message.success(editingKpiCode ? 'อัปเดต KPI สำเร็จ' : 'เพิ่ม KPI สำเร็จ')
      setEditingKpiCode(null)
      kpiForm.resetFields()
      kpiForm.setFieldsValue({ active: true, years: [] })
    } catch (e) {
      message.error((e as Error).message)
    }
  }
  const deleteKpiRow = async (code: string) => {
    try {
      await apiDeleteKpi(code)
      await reloadMeta()
      message.success('ลบ KPI เรียบร้อย')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  // ปีงบที่มีข้อมูล (พ.ศ.) เรียงมาก→น้อย สำหรับตัวกรอง
  const fiscalYears = useMemo(
    () => Array.from(new Set(tasks.map(taskFiscalYear))).sort((a, b) => b - a),
    [tasks]
  )

  const filteredTasks = useMemo(() => {
    let t = tasks
    if (selectedFY !== 'all')      t = t.filter(x => taskFiscalYear(x) === Number(selectedFY))
    if (selectedMission !== 'all') t = t.filter(x => x.mission === selectedMission)
    if (selectedStatus !== 'all')  t = t.filter(x => x.status === selectedStatus)
    return t
  }, [tasks, selectedFY, selectedMission, selectedStatus])

  const filteredLinks = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.id))
    return links.filter(l => ids.has(l.source) && ids.has(l.target))
  }, [links, filteredTasks])

  const stats = useMemo(() => computeStats(filteredTasks), [filteredTasks])
  const budget = useMemo(() => sumBudget(filteredTasks), [filteredTasks])

  const projectChoices = useMemo(
    () => tasks.filter(t => t.type === 'project').map(t => ({ value: t.id, label: t.text })),
    [tasks]
  )

  const openCreate = (type: TaskType) => {
    setEditingId(null)
    setEditorType(type)
    form.resetFields()
    form.setFieldsValue({
      type,
      mission: 'application',
      fiscalYear: fiscalYearOf(dayjs().toISOString()),
      status: 'draft',
      priority: 'medium',
      progress: type === 'milestone' ? undefined : 0,
      range: [dayjs(), dayjs().add(30, 'day')],
    })
    setEditorOpen(true)
  }

  const openEdit = (id: string) => {
    const t = tasks.find(x => x.id === id)
    if (!t) return
    setEditingId(id)
    setEditorType(t.type)
    form.resetFields()
    form.setFieldsValue({
      type: t.type,
      text: t.text,
      code: t.code,
      parent: t.parent,
      mission: t.mission,
      fiscalYear: taskFiscalYear(t),
      status: t.status ?? 'draft',
      priority: t.priority ?? 'medium',
      range: [dayjs(t.start), dayjs(t.end)],
      progress: t.progress,
      ownerUserId: t.ownerUserId,
      ownerPosition: t.ownerPosition,
      department: t.department,
      contact: t.contact,
      budgetRequested: t.budgetRequested,
      budgetApproved: t.budgetApproved,
      budgetSpent: t.budgetSpent,
      budgetSource: t.budgetSource,
      kpiCode: t.kpiCode,
      description: t.description,
      expectedOutcome: t.expectedOutcome,
      vendor: t.vendor,
      riskNote: t.riskNote,
    })
    setEditorOpen(true)
  }

  const submitEditor = async () => {
    const values = await form.validateFields()
    const kpi = KPI_OPTIONS.find(k => k.code === values.kpiCode)
    const staff = meta?.staff.find(s => s.id === values.ownerUserId)
    const start = values.range[0].toISOString()
    const end = (values.type === 'milestone' ? values.range[0] : values.range[1]).toISOString()

    const existing = editingId ? tasks.find(t => t.id === editingId) : undefined
    const payload: Partial<Task> = {
      text: values.text,
      code: values.code,
      type: values.type,
      parent: values.type === 'project' ? undefined : values.parent,
      mission: values.mission,
      fiscalYear: values.fiscalYear ?? fiscalYearOf(start),
      start, end,
      progress: values.type === 'milestone' ? undefined : (values.progress ?? 0),
      status: values.status,
      priority: values.priority,
      owner: staff?.name ?? existing?.owner,
      ownerUserId: values.ownerUserId,
      ownerPosition: values.ownerPosition ?? staff?.position,
      department: values.department,
      contact: values.contact,
      budgetRequested: values.budgetRequested,
      budgetApproved: values.budgetApproved,
      budgetSpent: values.budgetSpent,
      budgetSource: values.budgetSource,
      kpiCode: values.kpiCode,
      kpiName: kpi?.name,
      kpiTarget: kpi?.target,
      description: values.description,
      expectedOutcome: values.expectedOutcome,
      vendor: values.vendor,
      riskNote: values.riskNote,
      // team/documents ไม่ได้แก้ในฟอร์ม — ส่งค่าเดิมกลับเพื่อไม่ให้ถูกล้างตอนอัปเดต
      team: existing?.team,
      documents: existing?.documents,
    }

    try {
      if (editingId) await apiUpdateTask(editingId, payload)
      else await apiCreateTask(payload)
      await reload()
      setEditorOpen(false)
      message.success(editingId ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มรายการสำเร็จ')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteTask(id)
      await reload()
      message.success('ลบรายการเรียบร้อย')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const openProgress = (id: string) => {
    const t = tasks.find(x => x.id === id)
    if (!t) return
    setProgressTargetId(id)
    progressForm.resetFields()
    progressForm.setFieldsValue({ progress: t.progress ?? 0, note: '', reportedBy: t.owner ?? '' })
    setProgressOpen(true)
  }

  const submitProgress = async () => {
    if (!progressTargetId) return
    const values = await progressForm.validateFields()
    try {
      await apiAddProgress(progressTargetId, {
        progress: values.progress,
        note: values.note,
        reportedBy: values.reportedBy,
        budgetSpentDelta: values.budgetSpentDelta,
      })
      await reload()
      setProgressOpen(false)
      message.success('บันทึกความคืบหน้าเรียบร้อย')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }
  const detailTask = tasks.find(t => t.id === detailId)

  const handleReset = () => {
    modal.confirm({
      title: 'รีเซ็ตข้อมูลทั้งหมด?',
      content: 'จะคืนค่าเป็นข้อมูลตัวอย่างในฐานข้อมูล — ข้อมูลที่แก้ไขทั้งหมดจะถูกลบ',
      okText: 'รีเซ็ต', okButtonProps: { danger: true }, cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await apiResetRoadmap()
          await reload()
          message.success('รีเซ็ตเรียบร้อย')
        } catch (e) {
          message.error((e as Error).message)
        }
      },
    })
  }

  const ganttOption = useMemo(() => {
    // ECharts วาดบน canvas — ใช้ var(--app-*) ไม่ได้ ต้องเป็นค่าสีจริงและปรับตามโหมด
    const cAxis      = isDark ? '#e2e8f0' : '#334155'
    const cMuted     = isDark ? '#64748b' : '#94a3b8'
    const cGrid      = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)'
    const cGridFaint = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.09)'
    const cBarTrack  = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.14)'
    const ordered = filteredTasks
    if (!ordered.length) {
      return { backgroundColor: 'transparent', title: { text: 'ไม่มีข้อมูล', textStyle: { color: cMuted }, left: 'center', top: 'middle' } }
    }
    const categories = ordered.map(t => t.text)
    const idToIdx = new Map(ordered.map((t, i) => [t.id, i]))

    // กรอบแกนเวลาแบบปีงบประมาณ (ต.ค. – ก.ย.) ไม่ใช่ ม.ค. – ธ.ค.
    // ปีงบ N (พ.ศ.) = 1 ต.ค. (ค.ศ. N-543-1) ถึง 30 ก.ย. (ค.ศ. N-543)
    const fys = ordered.map(taskFiscalYear)
    const fyStart = new Date(Math.min(...fys) - 543 - 1, 9, 1).getTime()          // 1 ต.ค. ปีงบแรก
    const fyEnd   = new Date(Math.max(...fys) - 543, 8, 30, 23, 59, 59).getTime() // 30 ก.ย. ปีงบสุดท้าย
    const dataMin = Math.min(...ordered.map(t => new Date(t.start).getTime()))
    const dataMax = Math.max(...ordered.map(t => new Date(t.end).getTime()))
    // เริ่มที่ ต.ค. ของปีงบ แต่ไม่ตัดงานที่ล้นออกนอกกรอบ
    const minTime = Math.min(fyStart, dataMin)
    const maxTime = Math.max(fyEnd, dataMax)

    const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const fyAxisLabel = (val: number) => {
      const d = new Date(val)
      const m = d.getMonth()
      // ต้นปีงบ (ต.ค.) เน้นด้วยปีงบ พ.ศ.
      const fyOfMonth = (m >= 9 ? d.getFullYear() + 1 : d.getFullYear()) + 543
      return m === 9 ? `{fy|ปีงบ ${fyOfMonth}}\n${TH_MON[m]}` : TH_MON[m]
    }

    const barData = ordered.map((t, i) => ({
      value: [
        i,
        new Date(t.start).getTime(),
        new Date(t.end).getTime(),
        t.progress ?? 0,
        t.type,
        t.text,
        t.id,
      ],
    }))

    const linkData = filteredLinks.map(l => {
      const src = ordered.find(t => t.id === l.source)
      const tgt = ordered.find(t => t.id === l.target)
      if (!src || !tgt) return null
      return {
        value: [
          idToIdx.get(l.source),
          new Date(src.end).getTime(),
          idToIdx.get(l.target),
          new Date(tgt.start).getTime(),
        ],
      }
    }).filter(Boolean) as { value: number[] }[]

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      grid: { top: 60, bottom: 30, left: 320, right: 30 },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(148,163,184,0.3)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0' },
        formatter: (p: { seriesName: string; value?: (string | number)[] }) => {
          if (p.seriesName !== 'tasks' || !p.value) return ''
          const [, s, e, prog, type, text] = p.value as [number, number, number, number, TaskType, string, string]
          const start = new Date(s).toLocaleDateString('th-TH', { dateStyle: 'medium' })
          const end   = new Date(e).toLocaleDateString('th-TH', { dateStyle: 'medium' })
          if (type === 'milestone') {
            return `
              <div style="font-weight:700;color:#f8fafc">${text}</div>
              <div style="color:#fca5a5;font-size:11px">📍 Milestone — ${start}</div>
            `
          }
          const c = getProgressColor(prog)
          return `
            <div style="font-weight:700;margin-bottom:6px;color:#f8fafc">${text}</div>
            <div style="font-size:11px;color:#94a3b8">เริ่ม: <b style="color:#cbd5e1">${start}</b></div>
            <div style="font-size:11px;color:#94a3b8">สิ้นสุด: <b style="color:#cbd5e1">${end}</b></div>
            <div style="margin-top:6px;color:${c.fill};font-weight:700">ความคืบหน้า ${prog}% — ${c.label}</div>
          `
        },
      },
      xAxis: {
        type: 'time', position: 'top',
        min: minTime, max: maxTime,
        minInterval: 28 * DAY, maxInterval: 31 * DAY,   // ปักหมุดรายเดือน (ตามรอบปีงบ)
        splitLine: { show: true, lineStyle: { color: cGrid } },
        axisLine: { lineStyle: { color: cMuted } },
        axisLabel: {
          color: cAxis, fontSize: 11, fontWeight: 600,
          formatter: fyAxisLabel,
          rich: { fy: { color: cPurple, fontSize: 10, fontWeight: 800, padding: [0, 0, 2, 0] } },
        },
      },
      yAxis: {
        type: 'category', data: categories, inverse: true,
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: cGridFaint } },
        axisLabel: {
          color: cAxis, fontSize: 12, width: 300, overflow: 'truncate',
          formatter: (v: string, i: number) => {
            const t = ordered[i]
            if (t.type === 'project')   return `{p|■} ${v}`
            if (t.type === 'milestone') return `{m|◆} ${v}`
            return `   {s|·} ${v}`
          },
          rich: {
            p: { color: '#a855f7', fontSize: 14, fontWeight: 700 },
            m: { color: '#ef4444', fontSize: 14, fontWeight: 700 },
            s: { color: cMuted, fontSize: 12 },
          },
        },
      },
      series: [
        {
          name: 'links', type: 'custom', z: 1, silent: true,
          renderItem: (_p: unknown, api: { value: (i: number) => number; coord: (v: [number, number]) => [number, number] }) => {
            const p1 = api.coord([api.value(1), api.value(0)])
            const p2 = api.coord([api.value(3), api.value(2)])
            const elbow = p1[0] + 12
            return {
              type: 'polyline',
              shape: { points: [[p1[0], p1[1]], [elbow, p1[1]], [elbow, p2[1]], [p2[0] - 4, p2[1]]] },
              style: { stroke: 'rgba(148,163,184,0.55)', lineWidth: 1.2, lineDash: [3, 3], fill: 'transparent' },
            }
          },
          encode: { x: [1, 3], y: [0, 2] },
          data: linkData,
        },
        {
          name: 'tasks', type: 'custom', z: 2,
          renderItem: (
            _p: unknown,
            api: {
              value: (i: number) => string | number
              coord: (v: [number, number]) => [number, number]
              size: (v: [number, number]) => [number, number]
            }
          ) => {
            const catIdx = api.value(0) as number
            const start = api.coord([api.value(1) as number, catIdx])
            const end   = api.coord([api.value(2) as number, catIdx])
            const progress = api.value(3) as number
            const type = api.value(4) as TaskType
            const cellH = api.size([0, 1])[1]
            const barH = cellH * 0.55

            if (type === 'milestone') {
              const r = Math.min(barH * 0.75, 18)
              return {
                type: 'polygon',
                shape: { points: [[start[0], start[1] - r], [start[0] + r, start[1]], [start[0], start[1] + r], [start[0] - r, start[1]]] },
                style: { fill: '#ef4444', stroke: '#fecaca', lineWidth: 2, shadowBlur: 12, shadowColor: 'rgba(239,68,68,0.55)' },
              }
            }

            const c = getProgressColor(progress)
            const isProject = type === 'project'
            const baseColor = isProject ? '#a855f7' : c.fill
            const x = start[0]
            const y = start[1] - barH / 2
            const w = Math.max(end[0] - start[0], 2)
            const progW = (w * progress) / 100

            const children: unknown[] = [
              { type: 'rect', shape: { x, y, width: w, height: barH, r: 4 }, style: { fill: cBarTrack, stroke: baseColor + '99', lineWidth: 1 } },
              { type: 'rect', shape: { x, y, width: progW, height: barH, r: 4 }, style: { fill: baseColor, shadowBlur: 10, shadowColor: baseColor + '70' } },
              { type: 'rect', shape: { x, y, width: w, height: barH, r: 4 }, style: { fill: 'transparent', stroke: baseColor, lineWidth: isProject ? 2 : 1.4 } },
            ]
            if (w > 70) {
              children.push({
                type: 'text',
                style: {
                  x: x + 8, y: start[1], text: `${progress}%`,
                  fill: '#ffffff', fontSize: 10, fontWeight: 700,
                  textVerticalAlign: 'middle', textShadowBlur: 3, textShadowColor: 'rgba(0,0,0,0.5)',
                },
              })
            }
            return { type: 'group', children }
          },
          encode: { x: [1, 2], y: 0 },
          data: barData,
          markLine: {
            silent: true, symbol: 'none',
            label: { show: true, formatter: 'Today', color: '#fbbf24', fontSize: 10, fontWeight: 700, position: 'insideEndTop' },
            lineStyle: { color: '#fbbf24', width: 1.5, type: 'dashed' },
            data: [{ xAxis: Date.now() }],
          },
        },
      ],
    }
  }, [filteredTasks, filteredLinks, isDark])

  const heightPx = Math.max(420, filteredTasks.length * 38 + 100)

  const columns: ColumnsType<Task> = [
    {
      title: 'รหัส', dataIndex: 'code', width: 130,
      render: (v?: string) => v ? <Text style={{ color: cPurple, fontWeight: 600 }}>{v}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'ปีงบ', width: 90, align: 'center' as const,
      sorter: (a: Task, b: Task) => taskFiscalYear(a) - taskFiscalYear(b),
      render: (_: unknown, r: Task) => <Tag color="geekblue" style={{ margin: 0 }}>{taskFiscalYear(r)}</Tag>,
    },
    {
      title: 'รายการ', dataIndex: 'text',
      render: (_: string, r: Task) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={r.type === 'project' ? 'purple' : r.type === 'milestone' ? 'red' : 'blue'} style={{ margin: 0 }}>
              {r.type === 'project' ? 'โครงการ' : r.type === 'milestone' ? 'Milestone' : 'กิจกรรม'}
            </Tag>
            <Text style={{ color: 'var(--app-text)', fontWeight: 600 }}>{r.text}</Text>
          </div>
          {r.kpiCode && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <FlagOutlined /> {r.kpiCode} · {r.kpiName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'ผู้รับผิดชอบ', width: 200,
      render: (_, r) => (
        <div>
          <div style={{ color: 'var(--app-text)' }}>{r.owner ?? '-'}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.department ?? ''}</Text>
        </div>
      ),
    },
    {
      title: 'สถานะ', dataIndex: 'status', width: 130,
      render: (v?: ProjectStatus) => {
        const m = getStatusMeta(v)
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: 'งบ (อนุมัติ/เบิก)', width: 200, align: 'right' as const,
      render: (_, r) => {
        if (r.type !== 'project') return <Text type="secondary">-</Text>
        const pct = budgetUtilization(r.budgetSpent, r.budgetApproved)
        return (
          <div>
            <div style={{ color: 'var(--app-text)', fontSize: 12 }}>{formatTHB(r.budgetApproved)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Progress percent={pct} size="small" showInfo={false} strokeColor={pct > 90 ? '#ef4444' : '#a855f7'} style={{ flex: 1, margin: 0 }} />
              <Text style={{ fontSize: 11, color: 'var(--app-text-2)', minWidth: 36, textAlign: 'right' }}>{pct}%</Text>
            </div>
          </div>
        )
      },
    },
    {
      title: 'ความคืบหน้า', dataIndex: 'progress', width: 160,
      render: (v: number | undefined, r) => {
        if (r.type === 'milestone') return <Tag color="red">Milestone</Tag>
        const pct = v ?? 0
        const c = getProgressColor(pct)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={c.fill} style={{ flex: 1, margin: 0 }} />
            <Text strong style={{ color: c.fill, minWidth: 36 }}>{pct}%</Text>
          </div>
        )
      },
    },
    {
      title: 'การจัดการ', width: 200, align: 'center' as const, fixed: 'right' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)} />
          <Button size="small" icon={<RiseOutlined />} onClick={() => openProgress(r.id)} disabled={r.type === 'milestone'} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r.id)} />
          <Popconfirm title="ลบรายการนี้?" description="หากลบโครงการ กิจกรรมในโครงการจะถูกลบด้วย" onConfirm={() => handleDelete(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text pb-12 relative overflow-hidden">
      <Navbar />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[10%] left-[-8%] w-[28%] h-[28%] bg-purple-500/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-[8%] right-[-6%] w-[30%] h-[30%] bg-fuchsia-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[55%] left-[40%] w-[22%] h-[22%] bg-indigo-500/15 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-10 w-full">

        <div className="mb-6">
          <Breadcrumb
            items={[
              { href: '/', title: <span className="text-app-text-2 hover:text-purple-400 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
              { title: <span className="text-app-text-2"><FaMicrochip /> งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ</span> },
              { title: <span className="text-app-text font-bold">แผนโครงการ IT</span> },
            ]}
            className="mb-4 text-xs uppercase tracking-tighter"
          />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-3xl shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                <ProjectOutlined />
              </div>
              <div>
                <Title level={2} style={{ color: 'var(--app-text)', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }} className="uppercase">
                  IT Project Roadmap 2026
                </Title>
                <Text className="text-app-text-2 text-sm">แผนโครงการเทคโนโลยีสารสนเทศ {selectedFY === 'all' ? 'ทุกปีงบประมาณ' : `ประจำปีงบประมาณ ${selectedFY}`} — กลุ่มงาน IT</Text>
              </div>
            </div>

            <Space wrap>
              <Button icon={<PlusOutlined />} type="primary" style={gBtn('#a855f7', '#d946ef')}
                className="transition-all duration-200 hover:-translate-y-px hover:brightness-110"
                onClick={() => openCreate('project')}>เพิ่มโครงการ</Button>
              <Button icon={<PlusOutlined />} style={gBtn('#3b82f6', '#06b6d4')}
                className="transition-all duration-200 hover:-translate-y-px hover:brightness-110"
                onClick={() => openCreate('task')}>เพิ่มกิจกรรม</Button>
              <Button icon={<FlagOutlined />} style={gBtn('#f43f5e', '#fb7185')}
                className="transition-all duration-200 hover:-translate-y-px hover:brightness-110"
                onClick={() => openCreate('milestone')}>เพิ่ม Milestone</Button>
              <Button icon={<SettingOutlined />} style={gBtn('#0ea5e9', '#22d3ee')}
                className="transition-all duration-200 hover:-translate-y-px hover:brightness-110"
                onClick={() => { setEditingKpiCode(null); setKpiMgrOpen(true) }}>จัดการ KPI</Button>
              <Button icon={<ReloadOutlined />} danger ghost
                className="transition-all duration-200 hover:-translate-y-px"
                onClick={handleReset}>รีเซ็ตข้อมูล</Button>
            </Space>
          </div>
        </div>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <StatCard
              accent="purple" isDark={isDark}
              label="โครงการทั้งหมด"
              value={filteredTasks.filter(t => t.type === 'project').length}
              icon={<ProjectOutlined />}
              footer={<Text type="secondary" style={{ fontSize: 11 }}>{filteredTasks.filter(t => t.type === 'task').length} กิจกรรม · {filteredTasks.filter(t => t.type === 'milestone').length} milestone</Text>}
            />
          </Col>
          <Col xs={12} md={6}>
            <StatCard
              accent="emerald" isDark={isDark}
              label="งบที่อนุมัติ (รวม)" suffix="฿"
              value={Number(budget.approved).toLocaleString('th-TH')}
              icon={<DollarOutlined />}
              footer={<Text type="secondary" style={{ fontSize: 11 }}>ขอทั้งหมด {Number(budget.requested).toLocaleString('th-TH')} ฿</Text>}
            />
          </Col>
          <Col xs={12} md={6}>
            <StatCard
              accent="amber" isDark={isDark}
              label="เบิกจ่ายแล้ว" suffix="฿"
              value={Number(budget.spent).toLocaleString('th-TH')}
              icon={<DollarOutlined />}
              footer={<Progress percent={budgetUtilization(budget.spent, budget.approved)} size="small" showInfo={false} strokeColor={{ from: ACCENTS.amber.from, to: ACCENTS.amber.to }} />}
            />
          </Col>
          <Col xs={12} md={6}>
            <StatCard
              accent="cyan" isDark={isDark}
              label="% เสร็จสิ้น" suffix="%"
              value={stats.total ? Math.round((stats.done / stats.total) * 100) : 0}
              icon={<RiseOutlined />}
              footer={<Text type="secondary" style={{ fontSize: 11 }}>{stats.done} / {stats.total} กิจกรรมเสร็จสิ้น</Text>}
            />
          </Col>
        </Row>

        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-app-surface/70 border border-app-border rounded-xl backdrop-blur-sm items-center shadow-lg">
          <Tag icon={<SyncOutlined spin />} className="font-bold border-0" color="purple">ECharts Gantt</Tag>
          <div className="h-4 w-px bg-app-border mx-1 hidden sm:block" />

          <Select
            value={selectedFY} onChange={setSelectedFY}
            options={[
              { value: 'all', label: '📅 ทุกปีงบประมาณ' },
              ...fiscalYears.map(y => ({ value: String(y), label: `ปีงบ ${y}` })),
            ]}
            className="w-full sm:w-40" popupMatchSelectWidth={false}
          />

          <Select
            value={selectedMission} onChange={setSelectedMission}
            options={[{ value: 'all', label: '🟣 ทุกกลุ่มงาน IT' }, ...MISSION_OPTIONS.map(m => ({ value: m.value, label: m.label }))]}
            className="w-full sm:w-[280px]" popupMatchSelectWidth={false}
          />

          <Select
            value={selectedStatus} onChange={setSelectedStatus}
            options={[{ value: 'all', label: 'ทุกสถานะ' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
            className="w-full sm:w-[180px]" popupMatchSelectWidth={false}
          />

          <div className="ml-auto flex items-center gap-2 text-app-text-2 bg-app-bg/60 px-3 py-1.5 rounded-full text-[10px] border border-app-border">
            <InfoCircleOutlined />
            <span>ใช้ตารางด้านล่างเพื่อแก้ไข / อัปเดตความคืบหน้า / ดูรายละเอียดเต็ม</span>
          </div>
        </div>

        <Card variant="borderless" className="bg-app-surface/60 border border-app-border backdrop-blur-md rounded-2xl shadow-2xl mb-6"
          styles={{ body: { padding: 12 } }}>
          <EChart option={ganttOption} height={heightPx} />
        </Card>

        <Card variant="borderless" className="bg-app-surface/60 border border-app-border backdrop-blur-md rounded-2xl shadow-2xl"
          title={<span className="text-app-text font-bold"><FileTextOutlined /> รายการโครงการและกิจกรรม IT</span>}
          styles={{ body: { padding: 12 } }}>
          <Table<Task>
            columns={columns}
            dataSource={filteredTasks}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="ไม่มีข้อมูล" /> }}
          />
        </Card>

        <style jsx global>{`
          .ant-breadcrumb-separator { color: var(--app-text-3) !important; margin: 0 12px; }
        `}</style>
      </div>

      <Modal
        title={
          <span>
            {editingId ? <EditOutlined /> : <PlusOutlined />}{' '}
            {editingId ? 'แก้ไข' : 'เพิ่ม'} {editorType === 'project' ? 'โครงการ' : editorType === 'milestone' ? 'Milestone' : 'กิจกรรม'}
          </span>
        }
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={submitEditor}
        okText="บันทึก" cancelText="ยกเลิก"
        width={880} destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="ประเภท" name="type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'project',   label: 'โครงการ' },
                    { value: 'task',      label: 'กิจกรรม' },
                    { value: 'milestone', label: 'Milestone' },
                  ]}
                  onChange={(v) => setEditorType(v)}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="รหัส" name="code">
                <Input placeholder="IT-2026-XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ชื่อรายการ" name="text" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}>
                <Input placeholder="ชื่อโครงการ / กิจกรรม / Milestone" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={7}>
              <Form.Item label="กลุ่มงาน IT" name="mission" rules={[{ required: true }]}>
                <Select options={MISSION_OPTIONS.map(m => ({ value: m.value, label: m.label }))} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="ปีงบ (พ.ศ.)" name="fiscalYear" tooltip="เว้นว่างได้ ระบบจะคำนวณจากวันที่เริ่มให้อัตโนมัติ">
                <InputNumber min={2500} max={2700} style={{ width: '100%' }} placeholder="2569" />
              </Form.Item>
            </Col>
            <Col span={12}>
              {watchedType !== 'project' && (
                <Form.Item label="โครงการแม่ (Parent)" name="parent" rules={[{ required: true, message: 'กรุณาเลือกโครงการ' }]}>
                  <Select options={projectChoices} placeholder="เลือกโครงการ" />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={watchedType === 'milestone' ? 24 : 12}>
              <Form.Item
                label={watchedType === 'milestone' ? 'วันที่ Milestone' : 'ช่วงเวลาดำเนินการ'}
                name="range" rules={[{ required: true }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            {watchedType !== 'milestone' && (
              <Col span={12}>
                <Form.Item label="ความคืบหน้า (%)" name="progress">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider style={{ margin: '8px 0 16px' }}>ผู้รับผิดชอบ</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="ผู้รับผิดชอบหลัก" name="ownerUserId" tooltip="เลือกจากเจ้าหน้าที่กลุ่มงาน IT (role IT_STAFF)">
                <Select
                  showSearch allowClear
                  placeholder="เลือกเจ้าหน้าที่ IT"
                  suffixIcon={<TeamOutlined />}
                  options={staffOptions}
                  filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  onChange={(v) => {
                    const s = staffOptions.find(o => o.value === v)?.staff
                    if (s?.position) form.setFieldValue('ownerPosition', s.position)
                  }}
                  notFoundContent={meta ? 'ไม่พบเจ้าหน้าที่ IT' : 'กำลังโหลด...'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ตำแหน่ง" name="ownerPosition" tooltip="เติมอัตโนมัติจากผู้รับผิดชอบ แก้ไขได้">
                <Input placeholder="ตำแหน่ง" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="เบอร์ติดต่อ" name="contact">
                <Input placeholder="เบอร์โทร / อีเมล" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="งาน / หน่วยงาน" name="department">
                <Select showSearch options={DEPARTMENT_OPTIONS.map(d => ({ value: d, label: d }))} placeholder="เลือกหน่วยงาน" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="สถานะ" name="status">
                <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="ลำดับความสำคัญ" name="priority">
                <Select options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))} />
              </Form.Item>
            </Col>
          </Row>

          {watchedType === 'project' && (
            <>
              <Divider style={{ margin: '8px 0 16px' }}>งบประมาณ</Divider>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="งบที่ขอ (บาท)" name="budgetRequested">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="งบที่อนุมัติ" name="budgetApproved">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="เบิกจ่ายแล้ว" name="budgetSpent">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="แหล่งเงิน" name="budgetSource">
                    <Input placeholder="เช่น งบ 2569 / เงินบำรุง" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '8px 0 16px' }}>
                ตัวชี้วัด IT (KPI)
                <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => { setEditingKpiCode(null); setKpiMgrOpen(true) }}>จัดการ KPI</Button>
              </Divider>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label={`KPI ที่เกี่ยวข้อง${watchedFY ? ` (ใช้ได้ในปีงบ ${watchedFY})` : ''}`} name="kpiCode">
                    <Select
                      allowClear showSearch placeholder="เลือก KPI ที่โครงการนี้สนับสนุน"
                      filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      options={kpiChoices.map(k => ({ value: k.code, label: `${k.code} — ${k.name}${k.target ? ` (เป้า ${k.target})` : ''}` }))}
                      notFoundContent={<span>ไม่มี KPI สำหรับปีงบนี้ — <a onClick={() => { setEditingKpiCode(null); setKpiMgrOpen(true) }}>เพิ่ม KPI</a></span>}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider style={{ margin: '8px 0 16px' }}>รายละเอียด</Divider>
          <Form.Item label="คำอธิบาย" name="description">
            <TextArea rows={2} placeholder="คำอธิบายโครงการ / ขอบเขต" />
          </Form.Item>
          {watchedType === 'project' && (
            <Form.Item label="ผลลัพธ์ที่คาดหวัง" name="expectedOutcome">
              <TextArea rows={2} placeholder="ผลลัพธ์ / Outcome ที่คาดว่าจะได้" />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ผู้รับจ้าง / Vendor" name="vendor">
                <Input placeholder="ชื่อบริษัท (ถ้ามี)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ความเสี่ยง / อุปสรรค" name="riskNote">
                <Input placeholder="ปัญหาที่พบ" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={<><RiseOutlined /> บันทึกความคืบหน้า</>}
        open={progressOpen} onCancel={() => setProgressOpen(false)} onOk={submitProgress}
        okText="บันทึก" cancelText="ยกเลิก" destroyOnHidden
      >
        <Form form={progressForm} layout="vertical" className="mt-2">
          <Form.Item label="% ความคืบหน้า ณ ปัจจุบัน" name="progress" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="งบที่เบิกเพิ่ม (บาท)" name="budgetSpentDelta" tooltip="จะถูกบวกเข้ายอดเบิกจ่ายของโครงการ (เว้นว่างได้)">
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item label="หมายเหตุ / ผลการดำเนินงาน" name="note" rules={[{ required: true, message: 'กรุณาระบุหมายเหตุ' }]}>
            <TextArea rows={3} placeholder="ผลการดำเนินงาน / สิ่งที่เสร็จในรอบนี้" />
          </Form.Item>
          <Form.Item label="รายงานโดย" name="reportedBy" rules={[{ required: true, message: 'กรุณาเลือกผู้รายงาน' }]} tooltip="เลือกจากเจ้าหน้าที่กลุ่มงาน IT (role IT_STAFF)">
            <Select
              showSearch allowClear
              placeholder="เลือกเจ้าหน้าที่ IT"
              suffixIcon={<TeamOutlined />}
              options={(meta?.staff ?? []).map(s => ({
                value: s.name,
                label: s.position ? `${s.name} — ${s.position}` : s.name,
              }))}
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              notFoundContent={meta ? 'ไม่พบเจ้าหน้าที่ IT' : 'กำลังโหลด...'}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<><SettingOutlined /> จัดการตัวชี้วัด (KPI) — กำหนดปีงบที่ใช้งาน</>}
        open={kpiMgrOpen} onCancel={() => setKpiMgrOpen(false)} footer={null}
        width={860} destroyOnHidden
      >
        <Card size="small" variant="borderless" className="bg-app-surface/40 mb-4"
          title={<span className="text-app-text">{editingKpiCode ? `แก้ไข KPI: ${editingKpiCode}` : 'เพิ่ม KPI ใหม่'}</span>}>
          <Form form={kpiForm} layout="vertical" initialValues={{ active: true, years: [] }}>
            <Row gutter={12}>
              <Col span={7}>
                <Form.Item label="รหัส KPI" name="code" rules={[{ required: !editingKpiCode, message: 'ระบุรหัส' }]}>
                  <Input placeholder="IT-009" disabled={!!editingKpiCode} />
                </Form.Item>
              </Col>
              <Col span={11}>
                <Form.Item label="ชื่อตัวชี้วัด" name="name" rules={[{ required: true, message: 'ระบุชื่อ' }]}>
                  <Input placeholder="เช่น ร้อยละการใช้งานระบบ e-Document" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="เป้าหมาย" name="target">
                  <Input placeholder="≥ 90%" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={18}>
                <Form.Item label="ปีงบที่ใช้งาน (พ.ศ.)" name="years"
                  tooltip="เว้นว่าง = ใช้ได้ทุกปีงบ / เลือกปี = แสดงเฉพาะโครงการปีนั้น">
                  <Select mode="multiple" allowClear placeholder="ทุกปีงบ (เว้นว่าง) หรือเลือกปีที่ต้องการ"
                    options={yearOptions} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="เปิดใช้งาน" name="active" valuePropName="checked">
                  <Switch checkedChildren="ใช้" unCheckedChildren="ปิด" />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" onClick={submitKpi}>{editingKpiCode ? 'บันทึกการแก้ไข' : 'เพิ่ม KPI'}</Button>
              {editingKpiCode && <Button onClick={openKpiCreate}>ยกเลิกการแก้ไข</Button>}
            </Space>
          </Form>
        </Card>

        <Table
          size="small" rowKey="code" pagination={false}
          dataSource={meta?.kpis ?? []}
          locale={{ emptyText: <Empty description="ยังไม่มี KPI" /> }}
          columns={[
            { title: 'รหัส', dataIndex: 'code', width: 90, render: (v: string) => <Text style={{ color: cPurple, fontWeight: 600 }}>{v}</Text> },
            { title: 'ชื่อตัวชี้วัด', dataIndex: 'name' },
            { title: 'เป้าหมาย', dataIndex: 'target', width: 110, render: (v?: string) => v ?? '-' },
            {
              title: 'ปีงบที่ใช้งาน', dataIndex: 'years', width: 200,
              render: (ys: number[]) => ys.length
                ? <Space size={[4, 4]} wrap>{ys.map(y => <Tag key={y} color="geekblue" style={{ margin: 0 }}>{y}</Tag>)}</Space>
                : <Tag color="green">ทุกปีงบ</Tag>,
            },
            {
              title: '', width: 90, align: 'center' as const,
              render: (_: unknown, k: { code: string; name: string; target: string; years: number[] }) => (
                <Space size="small">
                  <Button size="small" icon={<EditOutlined />} onClick={() => openKpiEdit(k)} />
                  <Popconfirm title={`ลบ KPI ${k.code}?`} onConfirm={() => deleteKpiRow(k.code)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      <Drawer
        title={detailTask ? <span><FileTextOutlined /> {detailTask.text}</span> : 'รายละเอียด'}
        open={detailOpen} onClose={() => setDetailOpen(false)} size={680}
        extra={
          detailTask ? (
            <Space>
              <Button icon={<RiseOutlined />} onClick={() => { setDetailOpen(false); openProgress(detailTask.id) }} disabled={detailTask.type === 'milestone'}>อัปเดต</Button>
              <Button icon={<EditOutlined />} type="primary" onClick={() => { setDetailOpen(false); openEdit(detailTask.id) }}>แก้ไข</Button>
            </Space>
          ) : null
        }
      >
        {detailTask && (
          <>
            <Space wrap className="mb-4">
              {detailTask.code && <Tag color="purple">{detailTask.code}</Tag>}
              <Tag color="purple">{getMissionMeta(detailTask.mission).label}</Tag>
              <Tag color={getStatusMeta(detailTask.status).color}>{getStatusMeta(detailTask.status).label}</Tag>
              <Tag color={getPriorityMeta(detailTask.priority).color}>ลำดับความสำคัญ: {getPriorityMeta(detailTask.priority).label}</Tag>
            </Space>

            {detailTask.type !== 'milestone' && (
              <Card variant="borderless" className="mb-4 bg-app-surface/40">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>ความคืบหน้าโดยรวม</Text>
                  <Text strong style={{ color: getProgressColor(detailTask.progress ?? 0).fill, fontSize: 22 }}>
                    {detailTask.progress ?? 0}%
                  </Text>
                </div>
                <Progress percent={detailTask.progress ?? 0} strokeColor={getProgressColor(detailTask.progress ?? 0).fill} />
              </Card>
            )}

            <Descriptions bordered column={1} size="small" labelStyle={{ width: 160, fontWeight: 600 }}>
              <Descriptions.Item label="ผู้รับผิดชอบ">
                {detailTask.owner ?? '-'} {detailTask.ownerPosition && <Text type="secondary">— {detailTask.ownerPosition}</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="หน่วยงาน">{detailTask.department ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="ติดต่อ">{detailTask.contact ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="ปีงบประมาณ">
                <Tag color="geekblue">ปีงบ {taskFiscalYear(detailTask)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ระยะเวลา">
                {dayjs(detailTask.start).format('DD/MM/YYYY')}
                {detailTask.type !== 'milestone' && ` — ${dayjs(detailTask.end).format('DD/MM/YYYY')}`}
              </Descriptions.Item>
              {detailTask.kpiCode && (
                <Descriptions.Item label="KPI">
                  <Tag color="gold">{detailTask.kpiCode}</Tag> {detailTask.kpiName}<br/>
                  <Text type="secondary">เป้าหมาย: {detailTask.kpiTarget}</Text>
                </Descriptions.Item>
              )}
              {detailTask.type === 'project' && (
                <>
                  <Descriptions.Item label="งบที่ขอ">{formatTHB(detailTask.budgetRequested)}</Descriptions.Item>
                  <Descriptions.Item label="งบที่อนุมัติ">{formatTHB(detailTask.budgetApproved)}</Descriptions.Item>
                  <Descriptions.Item label="เบิกจ่ายแล้ว">
                    <div className="flex items-center gap-2">
                      <span>{formatTHB(detailTask.budgetSpent)}</span>
                      <Tag color={budgetUtilization(detailTask.budgetSpent, detailTask.budgetApproved) > 90 ? 'red' : 'purple'}>
                        {budgetUtilization(detailTask.budgetSpent, detailTask.budgetApproved)}%
                      </Tag>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="แหล่งเงิน">{detailTask.budgetSource ?? '-'}</Descriptions.Item>
                </>
              )}
              {detailTask.vendor && <Descriptions.Item label="ผู้รับจ้าง">{detailTask.vendor}</Descriptions.Item>}
              {detailTask.description && <Descriptions.Item label="คำอธิบาย">{detailTask.description}</Descriptions.Item>}
              {detailTask.expectedOutcome && <Descriptions.Item label="ผลลัพธ์ที่คาดหวัง">{detailTask.expectedOutcome}</Descriptions.Item>}
              {detailTask.riskNote && <Descriptions.Item label="ความเสี่ยง"><Text type="warning">{detailTask.riskNote}</Text></Descriptions.Item>}
              {detailTask.team?.length ? <Descriptions.Item label="ทีมงาน">{detailTask.team.join(', ')}</Descriptions.Item> : null}
              {detailTask.documents?.length ? (
                <Descriptions.Item label="เอกสารแนบ">
                  {detailTask.documents.map(d => <Tag key={d} icon={<FileTextOutlined />}>{d}</Tag>)}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {detailTask.progressLog?.length ? (
              <>
                <Divider>ประวัติการอัปเดตความคืบหน้า</Divider>
                <Timeline
                  items={detailTask.progressLog.map(log => ({
                    color: getProgressColor(log.progress).fill,
                    children: (
                      <div>
                        <div className="flex justify-between">
                          <Text strong>{dayjs(log.date).format('DD MMM YYYY')}</Text>
                          <Tag color={getProgressColor(log.progress).tagColor}>{log.progress}%</Tag>
                        </div>
                        <div style={{ color: 'var(--app-text)' }}>{log.note}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          โดย {log.reportedBy}
                          {log.budgetSpentDelta ? ` · เบิก ${formatTHB(log.budgetSpentDelta)}` : ''}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              </>
            ) : null}
          </>
        )}
      </Drawer>
    </div>
  )
}

const ITGanttPage = () => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
  <ConfigProvider
    theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#a855f7', borderRadius: 12, fontFamily: 'var(--font-sarabun)' },
    }}
  >
    <App>
      <GanttPageContent />
    </App>
  </ConfigProvider>
  )
}

export default ITGanttPage
