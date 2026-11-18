'use client'
// Business Impact Analysis (BIA) ของงาน IT — ทะเบียนบริการ/ระบบงานสำคัญ + Dashboard
// ข้อมูล: /api/v1/it/bia (ทะเบียน BIA) · /api/v1/it/assets (ครุภัณฑ์) · /api/v1/it/asset-risks (ผลประเมินความเสี่ยงทรัพย์สิน)
// MTPD = ระยะหยุดนานที่สุดที่รับได้ = ช่วงเวลาแรกที่ผลกระทบถึงระดับ 4 (สูง) · Tier ตาม MTPD: ≤4 ชม. วิกฤต · ≤24 ชม. สูง · ≤72 ชม. ปานกลาง · มากกว่านั้น ต่ำ
// ช่องว่างการกู้คืน: RTO เกิน MTPD · แผนสำรอง manual ใช้ได้สั้นกว่า RTO · Tier 1–2 ไม่มีแผนสำรอง · พึ่งบริการที่ RTO ยาวกว่า · พึ่งครุภัณฑ์เสี่ยงสูง/ออกจากทะเบียนแล้ว
// เฉพาะเจ้าหน้าที่ IT (menuAccess + proxy.ts + backend requireRoles)
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, ConfigProvider, DatePicker, Empty, Form, Input, InputNumber, Modal, Result, Row, Segmented, Select, Space, Switch, Table, Tabs, Tag, Timeline, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AlertOutlined, AppstoreOutlined, DashboardOutlined, EditOutlined, HomeOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { FaChartBar, FaFileExcel, FaHeartbeat, FaMicrochip, FaServer } from 'react-icons/fa'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import EChart from '@/app/components/EChart'
import { StatCard } from '@/app/components/StatCard'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { PALETTES, clip, escHtml } from '@/app/lib/chartKit'
import { KIND_LABEL, LEVEL_LABEL, RISK_LEVELS, levelOf, suggestRisk, type Asset, type RiskLevel, type RiskRow } from '../assets/assetShared'

const { Title, Text } = Typography

type Category = 'clinical' | 'support' | 'admin' | 'infra'
interface Service {
  id: number; name: string; category: Category; owner_department: string | null; description: string | null
  impact_patient: number; impact_operation: number; impact_financial: number; impact_legal: number; impact_reputation: number
  impact_1h: number; impact_4h: number; impact_24h: number; impact_72h: number; impact_1w: number
  rto_hours: number; rpo_hours: number; workaround: string | null; workaround_hours: number | null
  users_affected: number | null; patients_per_day: number | null; peak_period: string | null
  asset_keys: string[]; depends_on: number[]; is_active: boolean; reviewed_at: string | null; updated_at: string; updated_by_name: string | null
}
const CATEGORY_LABEL: Record<Category, string> = { clinical: 'บริการผู้ป่วย', support: 'สนับสนุนบริการ', admin: 'บริหาร', infra: 'โครงสร้างพื้นฐาน IT' }
const DIMENSIONS = [
  { key: 'impact_patient', label: 'ความปลอดภัยผู้ป่วย' }, { key: 'impact_operation', label: 'การให้บริการ/ปฏิบัติงาน' },
  { key: 'impact_financial', label: 'การเงิน/รายได้' }, { key: 'impact_legal', label: 'กฎหมาย/ข้อบังคับ' }, { key: 'impact_reputation', label: 'ภาพลักษณ์' },
] as const
const WINDOWS = [
  { key: 'impact_1h', label: '1 ชม.', hours: 1 }, { key: 'impact_4h', label: '4 ชม.', hours: 4 }, { key: 'impact_24h', label: '24 ชม.', hours: 24 },
  { key: 'impact_72h', label: '72 ชม.', hours: 72 }, { key: 'impact_1w', label: '1 สัปดาห์', hours: 168 },
] as const
const TIERS = [
  { tier: 1, label: 'Tier 1 วิกฤต', hint: 'MTPD ≤ 4 ชม.', tag: 'red' }, { tier: 2, label: 'Tier 2 สูง', hint: 'MTPD ≤ 24 ชม.', tag: 'volcano' },
  { tier: 3, label: 'Tier 3 ปานกลาง', hint: 'MTPD ≤ 72 ชม.', tag: 'gold' }, { tier: 4, label: 'Tier 4 ต่ำ', hint: 'MTPD > 72 ชม.', tag: 'green' },
]
const TIER_COLOR = { light: ['', '#e34948', '#eb6834', '#eda100', '#1baf7a'], dark: ['', '#e66767', '#d95926', '#c98500', '#199e70'] }
const IMPACT_WORD = ['ไม่กระทบ', 'น้อยมาก', 'น้อย', 'ปานกลาง', 'สูง', 'รุนแรง']
const hrs = (h: number | null) => h == null ? '-' : h < 1 ? `${Math.round(h * 60)} นาที` : h < 24 ? `${+h.toFixed(1)} ชม.` : `${+(h / 24).toFixed(1)} วัน`

// ── วิเคราะห์ ──
const mtpdOf = (s: Service) => WINDOWS.find(w => (s[w.key] as number) >= 4)?.hours ?? null
const tierOf = (mtpd: number | null) => mtpd == null ? 4 : mtpd <= 4 ? 1 : mtpd <= 24 ? 2 : mtpd <= 72 ? 3 : 4
interface DepAsset { key: string; asset: Asset | null; score: number | null; level: RiskLevel | null; assessed: boolean }
interface Analysed { s: Service; mtpd: number | null; tier: number; maxImpact: number; deps: DepAsset[]; worstAsset: DepAsset | null; gaps: string[] }
const analyse = (list: Service[], assets: Map<string, Asset>, risks: Map<string, RiskRow>): Analysed[] => {
  const byId = new Map(list.map(s => [s.id, s]))
  return list.map(s => {
    const mtpd = mtpdOf(s), tier = tierOf(mtpd)
    const deps: DepAsset[] = s.asset_keys.map(k => {
      const a = assets.get(k) ?? null
      if (!a) return { key: k, asset: null, score: null, level: null, assessed: false }
      const r = risks.get(k), sg = suggestRisk(a)
      const score = r ? r.score : sg.likelihood * sg.impact
      return { key: k, asset: a, score, level: levelOf(score), assessed: !!r }
    })
    const worst = deps.filter(d => d.score != null).sort((a, b) => b.score! - a.score!)[0] ?? null
    const gaps: string[] = []
    if (mtpd != null && s.rto_hours > mtpd) gaps.push(`RTO ${hrs(s.rto_hours)} เกิน MTPD ${hrs(mtpd)}`)
    if (s.workaround && s.workaround_hours != null && s.workaround_hours < s.rto_hours) gaps.push(`แผนสำรองใช้ได้ ${hrs(s.workaround_hours)} สั้นกว่า RTO`)
    if (!s.workaround && tier <= 2) gaps.push('ไม่มีแผนสำรอง (manual)')
    for (const d of s.depends_on) { const o = byId.get(d); if (o && o.is_active && o.rto_hours > s.rto_hours) gaps.push(`พึ่ง "${o.name}" ที่ RTO ${hrs(o.rto_hours)} ยาวกว่า`) }
    const missing = deps.filter(d => !d.asset || d.asset.status_group === 'disposed').length
    if (missing) gaps.push(`ครุภัณฑ์ที่พึ่งพา ${missing} รายการไม่อยู่ในทะเบียน/ออกจากทะเบียนแล้ว`)
    const risky = deps.filter(d => d.score != null && d.score >= 9 && d.asset?.status_group !== 'disposed').length
    if (risky && tier <= 2) gaps.push(`พึ่งครุภัณฑ์ความเสี่ยงสูง ${risky} รายการ`)
    return { s, mtpd, tier, maxImpact: Math.max(...DIMENSIONS.map(d => s[d.key] as number)), deps, worstAsset: worst, gaps }
  })
}
const tierTag = (t: number) => { const x = TIERS[t - 1]; return <Tooltip title={x.hint}><Tag color={x.tag} style={{ margin: 0, fontWeight: 600 }}>{x.label}</Tag></Tooltip> }

// ── ฟอร์มบริการ ──
const ServiceModal = ({ edit, services, assets, onClose, onSaved }: { edit: Service | 'new'; services: Service[]; assets: Asset[]; onClose: () => void; onSaved: () => void }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [log, setLog] = useState<{ id: number; action: string; changed_at: string; changed_by_name: string | null }[] | null>(edit === 'new' ? [] : null)
  useEffect(() => { if (edit !== 'new') fetch(`/api/v1/it/bia/${edit.id}/log`).then(r => r.json()).then(j => setLog(j.success ? j.data : [])).catch(() => setLog([])) }, [edit])
  const init = edit === 'new'
    ? { category: 'clinical', impact_patient: 3, impact_operation: 3, impact_financial: 3, impact_legal: 2, impact_reputation: 2, impact_1h: 1, impact_4h: 2, impact_24h: 3, impact_72h: 4, impact_1w: 5, rto_hours: 4, rpo_hours: 1, asset_keys: [], depends_on: [], is_active: true }
    : { ...edit, reviewed_at: edit.reviewed_at ? dayjs(edit.reviewed_at) : null }
  const w1 = Form.useWatch('impact_1h', form) as number | undefined, w4 = Form.useWatch('impact_4h', form) as number | undefined
  const w24 = Form.useWatch('impact_24h', form) as number | undefined, w72 = Form.useWatch('impact_72h', form) as number | undefined, w1w = Form.useWatch('impact_1w', form) as number | undefined
  const W = [w1, w4, w24, w72, w1w]
  const mtpd = WINDOWS.find((w, i) => (W[i] ?? 0) >= 4)?.hours ?? null
  const rto = Form.useWatch('rto_hours', form) as number | undefined
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const body = { ...v, reviewed_at: v.reviewed_at ? v.reviewed_at.format('YYYY-MM-DD') : null }
      const res = await fetch(edit === 'new' ? '/api/v1/it/bia' : `/api/v1/it/bia/${edit.id}`, { method: edit === 'new' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok || !j.success) { if (j.field) form.setFields([{ name: j.field, errors: [j.message] }]); throw new Error(j.message || 'บันทึกไม่สำเร็จ') }
      message.success(`บันทึก "${v.name}" แล้ว`)
      onSaved()
    } catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }
  const seg = (lo: number, words: string[]) => Array.from({ length: 6 - lo }, (_, i) => i + lo).map(n => ({ value: n, label: <Tooltip title={words[n]}><span style={{ padding: '0 4px' }}>{n}</span></Tooltip> }))
  const assetOpts = useMemo(() => assets.filter(a => a.status_group !== 'disposed').map(a => ({ value: a.key, label: `${a.noid} · ${a.name ?? '-'} · ${a.department ?? '-'}`, kind: a.kind })), [assets])
  return (
    <Modal open title={edit === 'new' ? 'เพิ่มบริการ/ระบบงานในทะเบียน BIA' : `แก้ไข ${edit.name}`} onCancel={onClose} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} width={820} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={init} requiredMark="optional">
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="name" label="ชื่อบริการ / ระบบงาน" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อ' }]}><Input maxLength={150} placeholder="เช่น ระบบ HIS (HOSxP), ระบบรายงานผลแล็บ, เครือข่ายภายใน" /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="category" label="ประเภท" rules={[{ required: true }]}><Select aria-label="ประเภทบริการ" options={(Object.keys(CATEGORY_LABEL) as Category[]).map(c => ({ value: c, label: CATEGORY_LABEL[c] }))} /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="owner_department" label="หน่วยงานเจ้าของ"><Input maxLength={255} /></Form.Item></Col>
        </Row>
        <Form.Item name="description" label="รายละเอียด / กระบวนงานที่ใช้"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>ผลกระทบสูงสุดแต่ละด้าน (1 น้อยมาก – 5 รุนแรง)</div>
        <Row gutter={12}>{DIMENSIONS.map(d => <Col xs={24} sm={12} md={8} key={d.key}><Form.Item name={d.key} label={d.label} rules={[{ required: true }]}><Segmented block options={seg(1, IMPACT_WORD)} aria-label={d.label} /></Form.Item></Col>)}</Row>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>ระดับผลกระทบเมื่อระบบหยุดนาน (0 ไม่กระทบ – 5 รุนแรง) · MTPD = ช่วงแรกที่ถึงระดับ 4</div>
        <Row gutter={12}>{WINDOWS.map((w, i) => <Col xs={12} md={i < 3 ? 8 : 12} lg={i < 3 ? 8 : 12} key={w.key}>
          <Form.Item name={w.key} label={`หยุด ${w.label}`} rules={[{ required: true }, ...(i > 0 ? [{ validator: (_: unknown, v: number) => v < (form.getFieldValue(WINDOWS[i - 1].key) ?? 0) ? Promise.reject(new Error('ต้องไม่น้อยกว่าช่วงก่อนหน้า')) : Promise.resolve() }] : [])]}
            dependencies={i > 0 ? [WINDOWS[i - 1].key] : []}><Segmented block options={seg(0, IMPACT_WORD)} aria-label={`หยุด ${w.label}`} /></Form.Item></Col>)}</Row>
        <Alert type={mtpd != null && rto != null && rto > mtpd ? 'warning' : 'info'} showIcon style={{ marginBottom: 12 }} data-testid="bia-mtpd"
          title={<>MTPD {mtpd == null ? 'มากกว่า 1 สัปดาห์' : hrs(mtpd)} → {TIERS[tierOf(mtpd) - 1].label}{mtpd != null && rto != null && rto > mtpd ? ` · RTO ${hrs(rto)} เกิน MTPD` : ''}</>} />
        <Row gutter={12}>
          <Col xs={12} md={6}><Form.Item name="rto_hours" label={<Tooltip title="Recovery Time Objective — ต้องกู้ระบบให้กลับมาภายในกี่ชั่วโมง">RTO (ชม.)</Tooltip>} rules={[{ required: true, message: 'ระบุ RTO' }]}><InputNumber min={0} max={9999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="rpo_hours" label={<Tooltip title="Recovery Point Objective — ยอมให้ข้อมูลหายย้อนหลังได้กี่ชั่วโมง">RPO (ชม.)</Tooltip>} rules={[{ required: true, message: 'ระบุ RPO' }]}><InputNumber min={0} max={9999} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="users_affected" label="ผู้ใช้งานที่กระทบ (คน)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="patients_per_day" label="ผู้ป่วยที่กระทบ (ราย/วัน)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} md={16}><Form.Item name="workaround" label="แผนสำรองเมื่อระบบหยุด (manual)"><Input.TextArea rows={2} maxLength={2000} placeholder="เช่น ใช้แบบฟอร์มกระดาษ แล้วบันทึกย้อนหลัง" /></Form.Item></Col>
          <Col xs={12} md={8}><Form.Item name="workaround_hours" label="ใช้แผนสำรองได้นาน (ชม.)"><InputNumber min={0} max={9999} style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Form.Item name="peak_period" label="ช่วงเวลาที่ใช้งานหนัก"><Input maxLength={255} placeholder="เช่น 08:00–12:00 วันราชการ, สิ้นเดือน" /></Form.Item>
        <Form.Item name="asset_keys" label="ครุภัณฑ์ที่บริการนี้พึ่งพา (จากทะเบียนทรัพย์สิน IT)">
          <Select mode="multiple" showSearch optionFilterProp="label" placeholder="พิมพ์เลขครุภัณฑ์ ชื่อ หรือหน่วยงาน เช่น Server" aria-label="ครุภัณฑ์ที่พึ่งพา" options={assetOpts} maxTagCount="responsive" />
        </Form.Item>
        <Form.Item name="depends_on" label="บริการอื่นที่ต้องใช้">
          <Select mode="multiple" showSearch optionFilterProp="label" aria-label="บริการที่พึ่งพา" options={services.filter(s => edit === 'new' || s.id !== edit.id).map(s => ({ value: s.id, label: s.name }))} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="reviewed_at" label="ทบทวนล่าสุด"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col xs={12}><Form.Item name="is_active" label="ใช้งาน" valuePropName="checked"><Switch checkedChildren="ใช้งาน" unCheckedChildren="ปิดใช้" /></Form.Item></Col>
        </Row>
      </Form>
      {edit !== 'new' && <>
        <div style={{ fontWeight: 600, margin: '4px 0 8px' }}>ประวัติการแก้ไข</div>
        {log === null ? <Text type="secondary">กำลังโหลด…</Text> : <Timeline items={log.map(l => ({ content: <Text style={{ fontSize: 12.5 }}>{l.action === 'create' ? 'เพิ่ม' : 'แก้ไข'} · {dayjs(l.changed_at).format('DD/MM/YYYY HH:mm')} · {l.changed_by_name ?? '-'}</Text> }))} />}
      </>}
    </Modal>
  )
}

const PageContent = ({ isDark }: { isDark: boolean }) => {
  const { message } = App.useApp()
  const [services, setServices] = useState<Service[] | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [risks, setRisks] = useState<RiskRow[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [tab, setTab] = useState('dash')
  const P = PALETTES[isDark ? 'dark' : 'light']
  const TC = TIER_COLOR[isDark ? 'dark' : 'light']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rb, ra, rr] = await Promise.all([fetch('/api/v1/it/bia'), fetch('/api/v1/it/assets'), fetch('/api/v1/it/asset-risks')])
      if (rb.status === 403) { setDenied(true); return }
      const [jb, ja, jr] = await Promise.all([rb.json(), ra.json(), rr.json()])
      if (!jb.success) throw new Error(jb.message || 'โหลดทะเบียน BIA ไม่สำเร็จ')
      setServices(jb.data); setAssets(ja.success ? ja.data : []); setRisks(jr.success ? jr.data : [])
      if (!ja.success) message.warning('โหลดทะเบียนครุภัณฑ์ไม่สำเร็จ — ส่วนความเสี่ยงของครุภัณฑ์จะไม่แสดง')
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const assetMap = useMemo(() => new Map(assets.map(a => [a.key, a])), [assets])
  const riskMap = useMemo(() => new Map(risks.map(r => [r.asset_key, r])), [risks])
  const all = useMemo(() => analyse(services ?? [], assetMap, riskMap), [services, assetMap, riskMap])
  const active = useMemo(() => all.filter(x => x.s.is_active).sort((a, b) => a.tier - b.tier || a.s.rto_hours - b.s.rto_hours || a.s.name.localeCompare(b.s.name, 'th')), [all])
  const nameOf = new Map((services ?? []).map(s => [s.id, s.name]))

  if (denied) return <Result status="403" title="ไม่มีสิทธิ์เข้าถึง" subTitle="Business Impact Analysis เปิดให้เฉพาะเจ้าหน้าที่งานคอมพิวเตอร์และผู้ดูแลระบบ" />

  const riskyAssets = new Set(active.filter(x => x.tier <= 2).flatMap(x => x.deps.filter(d => d.score != null && d.score >= 9).map(d => d.key)))
  const stats = { total: active.length, tier1: active.filter(x => x.tier === 1).length, gaps: active.filter(x => x.gaps.length).length, risky: riskyAssets.size }

  // RTO เทียบ MTPD (แกนเวลาแบบ log — ตั้งแต่ไม่กี่นาทีถึงเป็นสัปดาห์)
  const rows = [...active].reverse()
  const cap = 336 // MTPD > 1 สัปดาห์ วาดถึง 2 สัปดาห์
  // แกน log ของ ECharts เริ่มแท่งที่ 1 ชม. (แท่ง ≤ 1 ชม. หายไป) จึงแปลงเป็นตำแหน่ง log2 เองบนแกนปกติ: 0 = 15 นาที, ทุก 1 หน่วย = ×2
  const pos = (h: number) => Math.log2(Math.max(0.25, h) / 0.25)
  const TICKS = [0.25, 1, 4, 24, 72, 168]
  const rtoOption = {
    backgroundColor: 'transparent',
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: P.muted, fontSize: 11 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text },
      formatter: (p: { dataIndex: number }[]) => { const x = rows[p[0].dataIndex]; return `<b>${escHtml(x.s.name)}</b><br/>${TIERS[x.tier - 1].label}<br/>MTPD ${x.mtpd == null ? '> 1 สัปดาห์' : hrs(x.mtpd)} · RTO ${hrs(x.s.rto_hours)} · RPO ${hrs(x.s.rpo_hours)}${x.gaps.length ? `<br/><span style="color:${TC[1]}">${x.gaps.map(escHtml).join('<br/>')}</span>` : ''}` } },
    grid: { left: 8, right: 24, top: 8, bottom: 40, containLabel: true },
    xAxis: { type: 'value', min: 0, max: pos(cap), interval: 0.5, name: 'ระยะเวลา (สเกล log)', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: P.muted, fontSize: 11 },
      axisLabel: { color: P.muted, fontSize: 10.5, showMinLabel: true, formatter: (v: number) => { const t = TICKS.find(h => Math.abs(pos(h) - v) < 0.26); return t ? hrs(t) : '' } },
      splitLine: { lineStyle: { color: P.grid } } },
    yAxis: { type: 'category', data: rows.map(x => clip(x.s.name, 24)), axisLabel: { color: P.text, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: P.grid } } },
    series: [
      { name: 'MTPD (ระยะหยุดนานสุดที่รับได้)', type: 'bar', barMaxWidth: 14, itemStyle: { color: P.muted, opacity: 0.45 }, data: rows.map(x => ({ value: pos(x.mtpd ?? cap), itemStyle: { color: TC[x.tier], opacity: 0.4, borderRadius: [0, 4, 4, 0] } })) },
      { name: 'RTO (เป้าหมายกู้คืน)', type: 'scatter', symbol: 'diamond', symbolSize: 13, z: 3, itemStyle: { color: P.text },
        data: rows.map(x => ({ value: pos(x.s.rto_hours), itemStyle: { color: x.mtpd != null && x.s.rto_hours > x.mtpd ? TC[1] : P.text, borderColor: P.surface, borderWidth: 1.5 } })) },
    ],
  }
  // ผลกระทบตามเวลาที่หยุด (heatmap บริการ × ช่วงเวลา)
  const heatOption = {
    backgroundColor: 'transparent',
    tooltip: { backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text }, formatter: (p: { value: number[] }) => `${escHtml(rows[p.value[1]].s.name)}<br/>หยุด ${WINDOWS[p.value[0]].label}: <b>${p.value[2]} · ${IMPACT_WORD[p.value[2]]}</b>` },
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    visualMap: { show: false, min: 0, max: 5, inRange: { color: isDark ? ['#1e293b', '#5b2a2a', '#9b3a33', '#d95926', '#e66767'] : ['#f1f5f9', '#fde2d4', '#f8b48f', '#eb6834', '#c0262d'] } },
    xAxis: { type: 'category', data: WINDOWS.map(w => w.label), position: 'top', axisLabel: { color: P.text, fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: rows.map(x => clip(x.s.name, 22)), axisLabel: { color: P.text, fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'heatmap', data: rows.flatMap((x, yi) => WINDOWS.map((w, xi) => [xi, yi, x.s[w.key] as number])),
      label: { show: true, fontSize: 11, color: P.text, formatter: (p: { value: number[] }) => String(p.value[2]) }, itemStyle: { borderColor: P.surface, borderWidth: 2, borderRadius: 4 } }],
  }

  const priorityCols: ColumnsType<Analysed> = [
    { title: '#', key: 'n', width: 44, align: 'center', render: (_: unknown, __, i) => i + 1 },
    { title: 'บริการ / ระบบงาน', key: 'name', width: 240, render: (_: unknown, x) => <><b>{x.s.name}</b><div><Text type="secondary" style={{ fontSize: 12 }}>{CATEGORY_LABEL[x.s.category]}{x.s.owner_department ? ` · ${x.s.owner_department}` : ''}</Text></div></> },
    { title: 'ระดับ', key: 'tier', width: 130, render: (_: unknown, x) => tierTag(x.tier) },
    { title: 'MTPD / RTO / RPO', key: 'times', width: 170, render: (_: unknown, x) => <span style={{ fontSize: 12.5 }}>MTPD {x.mtpd == null ? '> 1 สัปดาห์' : hrs(x.mtpd)}<br />RTO <b>{hrs(x.s.rto_hours)}</b> · RPO {hrs(x.s.rpo_hours)}</span> },
    { title: 'ผู้ได้รับผลกระทบ', key: 'who', width: 140, render: (_: unknown, x) => <span style={{ fontSize: 12.5 }}>{x.s.users_affected != null ? `${x.s.users_affected.toLocaleString('th-TH')} ผู้ใช้` : '-'}<br />{x.s.patients_per_day != null ? `${x.s.patients_per_day.toLocaleString('th-TH')} ผู้ป่วย/วัน` : ''}</span> },
    { title: 'พึ่งพา', key: 'deps', width: 230, render: (_: unknown, x) => <span style={{ fontSize: 12.5 }}>
      {x.s.depends_on.length > 0 && <div>บริการ: {x.s.depends_on.map(d => nameOf.get(d) ?? `#${d}`).join(', ')}</div>}
      {x.deps.length > 0 ? <div>ครุภัณฑ์ {x.deps.length} รายการ{x.worstAsset?.level && <> · เสี่ยงสุด <Tag color={RISK_LEVELS.find(l => l.key === x.worstAsset!.level)!.tag} style={{ marginInlineEnd: 0, fontSize: 11 }}>{x.worstAsset.score} {LEVEL_LABEL[x.worstAsset.level]}</Tag></>}</div> : <Text type="secondary">ยังไม่ระบุครุภัณฑ์</Text>}</span> },
    { title: 'ช่องว่างการกู้คืน', key: 'gaps', render: (_: unknown, x) => x.gaps.length ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--ant-color-error)' }}>{x.gaps.map(g => <li key={g}>{g}</li>)}</ul> : <Text type="success" style={{ fontSize: 12.5 }}>ไม่พบ</Text> },
  ]
  // ครุภัณฑ์ที่บริการ Tier 1–2 พึ่งพา (จุดที่ต้องดูแลก่อน)
  const critMap = new Map<string, { d: DepAsset; services: string[]; tier: number }>()
  for (const x of active) if (x.tier <= 2) for (const d of x.deps) { const e = critMap.get(d.key) ?? { d, services: [], tier: x.tier }; e.services.push(x.s.name); e.tier = Math.min(e.tier, x.tier); critMap.set(d.key, e) }
  // ไม่พบในทะเบียน (score null) ขึ้นก่อน แล้วเรียงตามความเสี่ยง
  const critAssets = [...critMap.values()].sort((a, b) => (b.d.score ?? 99) - (a.d.score ?? 99) || b.services.length - a.services.length)

  const registerCols: ColumnsType<Analysed> = [
    { title: 'บริการ / ระบบงาน', key: 'name', render: (_: unknown, x) => <><b style={{ opacity: x.s.is_active ? 1 : 0.55 }}>{x.s.name}</b>{!x.s.is_active && <Tag style={{ marginLeft: 6 }}>ปิดใช้</Tag>}<div><Text type="secondary" style={{ fontSize: 12 }}>{CATEGORY_LABEL[x.s.category]}{x.s.owner_department ? ` · ${x.s.owner_department}` : ''}</Text></div></> },
    { title: 'ระดับ', key: 'tier', width: 130, sorter: (a, b) => a.tier - b.tier, render: (_: unknown, x) => tierTag(x.tier) },
    ...DIMENSIONS.map(d => ({ title: <Tooltip title={d.label}>{d.label.split('/')[0].replace('ความปลอดภัย', 'ปลอดภัย')}</Tooltip>, key: d.key, width: 84, align: 'center' as const, responsive: ['lg' as const],
      render: (_: unknown, x: Analysed) => { const v = x.s[d.key] as number; return <span style={{ fontWeight: v >= 4 ? 700 : 400, color: v >= 4 ? TC[v === 5 ? 1 : 2] : undefined }}>{v}</span> } })),
    { title: 'RTO / RPO', key: 'rto', width: 130, sorter: (a, b) => a.s.rto_hours - b.s.rto_hours, render: (_: unknown, x) => <span style={{ fontSize: 12.5 }}>{hrs(x.s.rto_hours)} / {hrs(x.s.rpo_hours)}</span> },
    { title: 'ทบทวนล่าสุด', key: 'rev', width: 150, render: (_: unknown, x) => <span style={{ fontSize: 12.5 }}>{x.s.reviewed_at ? dayjs(x.s.reviewed_at).format('DD/MM/YYYY') : '-'}<br /><Text type="secondary" style={{ fontSize: 11.5 }}>แก้ไข {dayjs(x.s.updated_at).format('DD/MM/YY')} {x.s.updated_by_name ?? ''}</Text></span> },
    { title: '', key: 'act', width: 90, align: 'right', render: (_: unknown, x) => <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(x.s)} aria-label={`แก้ไข ${x.s.name}`}>แก้ไข</Button> },
  ]

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(active.map((x, i) => ({
      'ลำดับกู้คืน': i + 1, 'บริการ/ระบบงาน': x.s.name, 'ประเภท': CATEGORY_LABEL[x.s.category], 'หน่วยงานเจ้าของ': x.s.owner_department ?? '', 'ระดับ': TIERS[x.tier - 1].label,
      ...Object.fromEntries(DIMENSIONS.map(d => [`ผลกระทบ: ${d.label}`, x.s[d.key]])), ...Object.fromEntries(WINDOWS.map(w => [`หยุด ${w.label}`, x.s[w.key]])),
      'MTPD (ชม.)': x.mtpd ?? '> 168', 'RTO (ชม.)': x.s.rto_hours, 'RPO (ชม.)': x.s.rpo_hours, 'แผนสำรอง': x.s.workaround ?? '', 'ใช้แผนสำรองได้ (ชม.)': x.s.workaround_hours ?? '',
      'ผู้ใช้ที่กระทบ': x.s.users_affected ?? '', 'ผู้ป่วย/วัน': x.s.patients_per_day ?? '', 'ช่วงใช้งานหนัก': x.s.peak_period ?? '',
      'บริการที่พึ่งพา': x.s.depends_on.map(d => nameOf.get(d) ?? d).join(', '), 'ครุภัณฑ์ที่พึ่งพา': x.deps.map(d => d.asset ? `${d.asset.noid} ${d.asset.name ?? ''}` : d.key).join(', '),
      'ช่องว่างการกู้คืน': x.gaps.join(' · '), 'ทบทวนล่าสุด': x.s.reviewed_at ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'BIA')
    XLSX.writeFile(wb, `Business Impact Analysis IT-${dayjs().format('YYYY-MM-DD')}.xlsx`, { compression: true })
  }

  const dashboard = !services ? <Card loading style={{ borderRadius: 16 }} /> : active.length === 0 ? (
    <Card style={{ borderRadius: 16 }}><Empty description={<>ยังไม่มีบริการในทะเบียน BIA<br /><Text type="secondary">เริ่มจากระบบที่หยุดแล้วกระทบผู้ป่วยมากที่สุด เช่น HIS, ระบบแล็บ, ระบบภาพรังสี, เครือข่าย และ Server</Text></>}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>เพิ่มบริการแรก</Button></Empty></Card>
  ) : <>
    <Row gutter={[16, 16]} className="mb-4">
      <Col xs={12} lg={6}><StatCard accent="sky" isDark={isDark} label="บริการในทะเบียน BIA" value={stats.total} suffix="บริการ" icon={<AppstoreOutlined />}
        footer={<Space size={4} wrap>{TIERS.map(t => { const c = active.filter(x => x.tier === t.tier).length; return c ? <Tag key={t.tier} color={t.tag} style={{ margin: 0 }}>T{t.tier}: {c}</Tag> : null })}</Space>} /></Col>
      <Col xs={12} lg={6}><StatCard accent="rose" isDark={isDark} label="Tier 1 วิกฤต (MTPD ≤ 4 ชม.)" value={stats.tier1} suffix="บริการ" icon={<FaHeartbeat />}
        footer={<Text type="secondary" style={{ fontSize: 12 }}>ต้องกู้คืนก่อน มีแผนสำรองพร้อมใช้</Text>} /></Col>
      <Col xs={12} lg={6}><StatCard accent="amber" isDark={isDark} label="มีช่องว่างการกู้คืน" value={stats.gaps} suffix="บริการ" icon={<WarningOutlined />}
        footer={<Text type="secondary" style={{ fontSize: 12 }}>RTO เกิน MTPD, ไม่มีแผนสำรอง, พึ่งของเสี่ยง</Text>} /></Col>
      <Col xs={12} lg={6}><StatCard accent="violet" isDark={isDark} label="ครุภัณฑ์เสี่ยงสูงใต้บริการ Tier 1–2" value={stats.risky} suffix="รายการ" icon={<FaServer />}
        footer={<Text type="secondary" style={{ fontSize: 12 }}>คะแนนความเสี่ยง ≥ 9 จากหน้าประเมินความเสี่ยง</Text>} /></Col>
    </Row>
    <Row gutter={[16, 16]} className="mb-4">
      <Col xs={24} lg={14}>
        <Card title="RTO เทียบกับ MTPD" size="small" style={{ borderRadius: 16, height: '100%' }} extra={<Text type="secondary" style={{ fontSize: 12 }}>เพชรสีแดง = RTO เกิน MTPD</Text>}>
          <EChart theme={isDark ? 'dark' : 'light'} height={Math.max(240, rows.length * 30 + 70)} option={rtoOption} />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="ผลกระทบตามระยะเวลาที่ระบบหยุด" size="small" style={{ borderRadius: 16, height: '100%' }} extra={<Text type="secondary" style={{ fontSize: 12 }}>0 ไม่กระทบ – 5 รุนแรง</Text>}>
          <EChart theme={isDark ? 'dark' : 'light'} height={Math.max(240, rows.length * 30 + 40)} option={heatOption} />
        </Card>
      </Col>
    </Row>
    <Card title={<span><AlertOutlined style={{ color: TC[1], marginRight: 8 }} />ลำดับการกู้คืนระบบ (Recovery Priority)</span>} size="small" style={{ borderRadius: 16, marginBottom: 16 }}
      extra={<Text type="secondary" style={{ fontSize: 12 }}>เรียงตาม Tier แล้ว RTO</Text>}>
      <Table size="small" rowKey={x => x.s.id} dataSource={active} columns={priorityCols} pagination={false} scroll={{ x: 1200 }} data-testid="bia-priority" />
    </Card>
    <Card title="ครุภัณฑ์ที่บริการ Tier 1–2 พึ่งพา" size="small" style={{ borderRadius: 16 }} extra={<Text type="secondary" style={{ fontSize: 12 }}>ความเสี่ยงจากหน้าประเมินความเสี่ยงทรัพย์สิน (ยังไม่ประเมิน = ค่าระบบเสนอ)</Text>}>
      {critAssets.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่ได้ผูกครุภัณฑ์กับบริการ Tier 1–2 — ระบุได้ที่แท็บทะเบียนบริการ" /> :
        <Table size="small" rowKey={x => x.d.key} dataSource={critAssets} pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 900 }} columns={[
          { title: 'ครุภัณฑ์', key: 'a', render: (_: unknown, x) => x.d.asset ? <><span style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{x.d.asset.noid}</span><div>{x.d.asset.name}</div><Text type="secondary" style={{ fontSize: 12 }}>{KIND_LABEL[x.d.asset.kind]} · {x.d.asset.department ?? '-'}</Text></> : <Text type="danger">{x.d.key} (ไม่พบในทะเบียน)</Text> },
          { title: 'สถานะ', key: 's', width: 140, render: (_: unknown, x) => x.d.asset?.status ?? '-' },
          { title: 'ความเสี่ยง', key: 'r', width: 160, render: (_: unknown, x) => x.d.level ? <><Tag color={RISK_LEVELS.find(l => l.key === x.d.level)!.tag} style={{ margin: 0 }}>{x.d.score} · {LEVEL_LABEL[x.d.level]}</Tag><div><Text type="secondary" style={{ fontSize: 11.5 }}>{x.d.assessed ? 'ประเมินแล้ว' : 'ระบบเสนอ'}</Text></div></> : '-' },
          { title: 'บริการที่พึ่งพา', key: 'sv', render: (_: unknown, x) => <>{tierTag(x.tier)} <span style={{ fontSize: 12.5 }}>{x.services.join(', ')}</span></> },
        ]} />}
    </Card>
  </>

  const register = <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 12 } }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>เพิ่มบริการ</Button>
      <Space size={6}><Switch size="small" checked={showInactive} onChange={setShowInactive} aria-label="แสดงที่ปิดใช้" /><Text style={{ fontSize: 13 }}>แสดงที่ปิดใช้</Text></Space>
      <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>ผลกระทบ 1–5 · ตัวเลขหนา = ระดับสูงขึ้นไป</Text>
    </div>
    <Table size="small" rowKey={x => x.s.id} loading={loading} dataSource={all.filter(x => showInactive || x.s.is_active)} columns={registerCols} pagination={false} scroll={{ x: 1100 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีบริการ" /> }} data-testid="bia-register" />
  </Card>

  return (
    <>
      <Card style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #0ea5e9 100%)', border: 'none', borderRadius: 16, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.18)' }}><FaChartBar className="text-2xl text-white" /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>Business Impact Analysis (BIA)</Title>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>บริการใดหยุดได้นานเท่าไร ต้องกู้คืนภายในกี่ชั่วโมง และพึ่งครุภัณฑ์ใด — ใช้วางแผนความต่อเนื่อง (BCP/DRP)</Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>โหลดใหม่</Button>
            <Button icon={<FaFileExcel />} onClick={exportExcel} disabled={!active.length}>Excel</Button>
          </Space>
        </div>
      </Card>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'dash', label: 'Dashboard', icon: <DashboardOutlined />, children: dashboard },
        { key: 'register', label: `ทะเบียนบริการ (${services?.filter(s => s.is_active).length ?? 0})`, icon: <AppstoreOutlined />, children: register },
      ]} />
      {editing && services && <ServiceModal key={editing === 'new' ? 'new' : editing.id} edit={editing} services={services} assets={assets} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

export default function ItBiaPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#4338ca', borderRadius: 8 } }}>
      <App>
        <div className="min-h-screen w-full bg-app-bg text-app-text">
          <Navbar />
          <div className="p-4 md:p-8 max-w-[1500px] mx-auto">
            <Breadcrumb className="mb-4" items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaMicrochip className="inline mr-1" /> งานคอมพิวเตอร์ฯ</> },
              { title: 'Business Impact Analysis' },
            ]} />
            <PageContent isDark={isDark} />
          </div>
        </div>
      </App>
    </ConfigProvider>
  )
}
