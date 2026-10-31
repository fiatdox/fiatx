'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ConfigProvider, theme, Typography, Card, Alert, App,
  Button, Space, Table, Select, Statistic, Tabs, Input, Row, Col, Tooltip, Modal, Progress,
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, ReloadOutlined, SearchOutlined, InfoCircleOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { FaBuilding, FaFileExcel, FaTable } from 'react-icons/fa'
import thTH from 'antd/locale/th_TH'
import Cookies from 'js-cookie'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { money, thaiDate } from '../depreciation/calc'
import type { AssetByDepartmentData, PdfFonts } from './pdfReport'
import { ALL, buildPdfGroups, buildWorkbook, filterAssets, groupByDept, resolve, NO_DEPT, NO_METHOD, type Asset, type DeptRow, type Lookups, type RawAsset } from './assets'

const { Title, Text } = Typography

// รายงานครุภัณฑ์แยกตามหน่วยงาน — ใช้ร่วมกันทั้งทะเบียน V3 และ V2
// (backend ส่งข้อมูลรูปแบบเดียวกันทั้งสองทะเบียน ต่างกันแค่ endpoint และเงื่อนไขที่นับเข้ารายงาน)
export interface AssetByDeptViewProps {
  /** endpoint ของทะเบียนนั้น ๆ */
  apiPath: string
  /** ต่อท้ายชื่อหน้า ชื่อชีต และชื่อไฟล์ เช่น 'V3' */
  version: 'V2' | 'V3'
  /** อธิบายว่าครุภัณฑ์แบบไหนนับเข้ารายงาน (แสดงใน tooltip) */
  scopeNotes: string[]
}

const ORG_NAME = 'โรงพยาบาลพะเยา'

// ฟอนต์ Sarabun สำหรับ PDF — โหลดครั้งแรกที่กดพิมพ์ แล้วใช้ซ้ำตลอดการเปิดหน้า
let fontsPromise: Promise<PdfFonts> | null = null
const loadFonts = (): Promise<PdfFonts> => {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      ['/fonts/Sarabun/Sarabun-Regular.ttf', '/fonts/Sarabun/Sarabun-Bold.ttf'].map(async url => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ (${url})`)
        return res.arrayBuffer()
      }),
    )
      .then(([regular, bold]) => ({ regular, bold }))
      // โหลดพลาดครั้งหนึ่ง ครั้งหน้าต้องลองใหม่ ไม่ใช่จำความล้มเหลวไว้
      .catch(err => { fontsPromise = null; throw err })
  }
  return fontsPromise
}

type PdfState =
  | { status: 'idle' }
  | { status: 'building'; page: number; pages: number }
  | { status: 'ready'; url: string; fileName: string }
  | { status: 'error'; message: string }

// นับจำนวนต่อค่า แล้วคืนเป็นตัวเลือกของ Select พร้อมตัวเลือก "ทั้งหมด" ไว้บนสุด
const countOptions = (
  items: Omit<Asset, 'seq'>[],
  key: (a: Omit<Asset, 'seq'>) => string,
  label: (k: string, a: Omit<Asset, 'seq'>) => string,
  allLabel: string,
  sort: (a: string, b: string) => number,
) => {
  const seen = new Map<string, { n: number; label: string }>()
  for (const a of items) {
    const k = key(a)
    const s = seen.get(k)
    if (s) s.n++
    else seen.set(k, { n: 1, label: label(k, a) })
  }
  return [
    { value: ALL, label: allLabel },
    ...[...seen.entries()].sort(([a], [b]) => sort(a, b))
      .map(([k, s]) => ({ value: k, label: `${s.label} (${s.n.toLocaleString('th-TH')})` })),
  ]
}

const PageContent = ({ apiPath, version, scopeNotes }: AssetByDeptViewProps) => {
  const { message } = App.useApp()

  const [raw, setRaw] = useState<RawAsset[]>([])
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [fy, setFy] = useState<string>(ALL)
  const [cat, setCat] = useState<string>(ALL)
  const [dept, setDept] = useState<string>(ALL)
  const [method, setMethod] = useState<string>(ALL)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'dept' | 'detail'>('dept')
  const [detailPage, setDetailPage] = useState({ current: 1, pageSize: 50 })
  const [pdf, setPdf] = useState<PdfState>({ status: 'idle' })
  // เลขรอบการสร้าง — ปิดหน้าต่างหรือกดสร้างใหม่ รอบเก่าจะรู้ตัวแล้วหยุด/ทิ้งผลของตัวเอง
  const pdfRun = useRef(0)
  const pdfUrl = useRef<string | null>(null)
  // ออกจากหน้าไปแล้ว คืนหน่วยความจำของไฟล์ PDF ที่ค้างอยู่
  useEffect(() => () => { if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current) }, [])

  // ผู้พิมพ์ = คนที่กำลังใช้งานอยู่ (คุกกี้ user_data)
  const preparedBy = useMemo(() => {
    try {
      const u = JSON.parse(Cookies.get('user_data') || '{}')
      return (u?.name as string) ?? ''
    } catch { return '' }
  }, [])

  // ดึงทั้งทะเบียนครั้งเดียว (V2 ~12,700 / V3 ~5,700 รายการ) แล้วกรองที่หน้าเว็บ เปลี่ยนตัวกรองได้ทันทีไม่ต้องรอ
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const json = await (await fetch(apiPath)).json()
        if (!alive) return
        if (json?.success && Array.isArray(json.data) && json.lookups) {
          setRaw(json.data)
          setLookups(json.lookups)
        } else {
          setRaw([])
          setLoadError(json?.message || 'ดึงข้อมูลไม่สำเร็จ')
        }
      } catch {
        if (alive) { setRaw([]); setLoadError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [apiPath, reloadKey])

  const assets = useMemo(
    () => (lookups ? raw.map(r => resolve(r, lookups)) : []),
    [raw, lookups],
  )

  // ── ตัวเลือกของตัวกรอง สร้างจากข้อมูลจริง ทุกตัวเลือกจึงมีรายการอยู่เสมอ ──
  const fyOptions = useMemo(() => countOptions(
    assets, a => a.fy, k => (k ? `ปีงบ ${k}` : 'ไม่ระบุปีงบ'), 'ทุกปีงบประมาณ',
    (a, b) => Number(b) - Number(a),
  ), [assets])
  const catOptions = useMemo(() => countOptions(
    assets, a => a.catId, (_, a) => a.category, 'ทุกหมวดครุภัณฑ์',
    (a, b) => Number(a) - Number(b),
  ), [assets])
  const deptOptions = useMemo(() => countOptions(
    assets, a => a.divs, (k, a) => (k ? `${a.department} · ${k}` : NO_DEPT), 'ทุกหน่วยงาน',
    (a, b) => a.localeCompare(b),
  ), [assets])
  // ไม่ระบุวิธีการได้มา (ค่าว่าง) ไว้ท้ายสุด ที่เหลือเรียงตามชื่อ
  const methodOptions = useMemo(() => countOptions(
    assets, a => a.acquireMethod, k => k || NO_METHOD, 'ทุกวิธีการได้มา',
    (a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b, 'th')),
  ), [assets])

  const optionLabel = (opts: { value: string; label: string }[], v: string) =>
    v === ALL ? 'ทั้งหมด' : (opts.find(o => o.value === v)?.label.replace(/ \([\d,]+\)$/, '') ?? v)

  const filtered: Asset[] = useMemo(
    () => filterAssets(assets, { fy, cat, dept, method, search }),
    [assets, fy, cat, dept, method, search],
  )
  const deptRows: DeptRow[] = useMemo(() => groupByDept(filtered), [filtered])

  const totalValue = useMemo(() => filtered.reduce((s, a) => s + a.price, 0), [filtered])
  const catCount = useMemo(() => new Set(filtered.map(a => a.catId)).size, [filtered])

  // ตัวกรองเปลี่ยน → กลับไปหน้าแรกของตาราง ไม่งั้นอาจค้างอยู่หน้าที่ไม่มีข้อมูลแล้ว
  const resetPage = () => setDetailPage(p => ({ ...p, current: 1 }))

  const filterText = [
    `ปีงบประมาณ: ${optionLabel(fyOptions, fy)}`,
    `หมวด: ${optionLabel(catOptions, cat)}`,
    `หน่วยงาน: ${optionLabel(deptOptions, dept)}`,
    `วิธีการได้มา: ${optionLabel(methodOptions, method)}`,
    ...(search.trim() ? [`ค้นหา: "${search.trim()}"`] : []),
  ].join(' · ')

  const exportExcel = () => {
    if (filtered.length === 0) { message.info('ไม่มีรายการให้ส่งออก'); return }
    const printed = `ส่งออกเมื่อ ${thaiDate(new Date().toLocaleDateString('sv-SE'))}`
    const wb = buildWorkbook(filtered, deptRows, `${filterText} · ${printed}`, `ทะเบียนครุภัณฑ์ ${version}`)
    const fyPart = fy === ALL ? 'ทุกปีงบ' : `ปีงบ${fy}`
    // SheetJS ไม่บีบอัดเป็นค่าตั้งต้น — ทั้งทะเบียน 21.7 MB บีบแล้วเหลือ 8.5 MB ช้าขึ้นแค่ ~0.1 วินาที
    XLSX.writeFile(wb, `ครุภัณฑ์แยกตามหน่วยงาน-${version}-${fyPart}-${new Date().toLocaleDateString('sv-SE')}.xlsx`, { compression: true })
    message.success(`ส่งออก ${filtered.length.toLocaleString('th-TH')} รายการ ใน ${deptRows.length.toLocaleString('th-TH')} หน่วยงาน`)
  }

  // ── PDF ทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน (แบบฟอร์มเดิมของระบบ PHP) ──
  // วาดลง PDF ตรงด้วย pdfkit (ดู pdfReport.ts) ทั้งทะเบียน V2 ~12,700 รายการ / ~730 หน้า ใช้ราว 5–10 วินาที
  // พักให้หน้าเว็บตอบสนองทุก 10 หน้า จึงแสดงความคืบหน้าได้และไม่ค้าง
  const releaseUrl = () => {
    if (pdfUrl.current) { URL.revokeObjectURL(pdfUrl.current); pdfUrl.current = null }
  }

  const closePdf = () => {
    pdfRun.current++
    releaseUrl()
    setPdf({ status: 'idle' })
  }

  const openPdf = async () => {
    if (filtered.length === 0) { message.info('ไม่มีรายการให้พิมพ์'); return }
    const run = ++pdfRun.current
    const stale = () => run !== pdfRun.current
    releaseUrl()
    setPdf({ status: 'building', page: 0, pages: 0 })
    try {
      // โหลดตัวสร้าง PDF เฉพาะตอนกดพิมพ์ — โมดูลใหญ่ ไม่ต้องติดมากับหน้าเว็บตั้งแต่แรก
      const [{ renderAssetByDepartmentPdf }, fonts] = await Promise.all([import('./pdfReport'), loadFonts()])
      if (stale()) return
      const { groups, grandCount, grandTotal } = buildPdfGroups(filtered)
      const data: AssetByDepartmentData = {
        orgName: ORG_NAME,
        fiscalYearText: fy === ALL ? 'ทุกปีงบประมาณ' : fy,
        // กรองหมวดไว้ ทุกแถวจึงเป็นหมวดเดียวกัน อ่านชื่อจากแถวแรกได้เลย
        categoryText: cat === ALL ? 'ทุกหมวด' : filtered[0].category,
        // หน่วยงานเห็นจากหัวกลุ่มอยู่แล้ว แต่วิธีการได้มากับคำค้นไม่มีที่ไหนบอก
        // ต้องพิมพ์ไว้ ไม่งั้นดูเหมือนทะเบียนครบ
        filterNote: [
          ...(method !== ALL ? [`เฉพาะวิธีการได้มา: ${method || NO_METHOD}`] : []),
          ...(search.trim() ? [`เฉพาะรายการที่ตรงกับคำค้น "${search.trim()}"`] : []),
        ].join(' · ') || undefined,
        groups,
        grandCount: grandCount.toLocaleString('th-TH'),
        grandTotal: money(grandTotal),
        preparedBy,
      }
      const chunks = await renderAssetByDepartmentPdf(
        data, fonts,
        p => { if (!stale()) setPdf({ status: 'building', ...p }) },
        stale,
      )
      if (!chunks || stale()) return
      const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'application/pdf' }))
      pdfUrl.current = url
      const fyPart = fy === ALL ? 'ทุกปีงบ' : `ปีงบ${fy}`
      setPdf({
        status: 'ready',
        url,
        fileName: `ทะเบียนทรัพย์สินในหน่วยงาน-${version}-${fyPart}-${new Date().toLocaleDateString('sv-SE')}.pdf`,
      })
    } catch (err) {
      if (stale()) return
      console.error('[asset-by-department] PDF', err)
      setPdf({ status: 'error', message: err instanceof Error ? err.message : 'สร้างรายงานไม่สำเร็จ' })
    }
  }

  const deptColumns: ColumnsType<DeptRow> = [
    { title: 'ลำดับ', dataIndex: 'seq', width: 70, align: 'center' },
    { title: 'รหัส', dataIndex: 'divs', width: 100 },
    { title: 'หน่วยงาน', dataIndex: 'department' },
    {
      title: 'จำนวน (รายการ)', dataIndex: 'count', width: 140, align: 'right',
      sorter: (a, b) => a.count - b.count,
      render: (v: number) => v.toLocaleString('th-TH'),
    },
    {
      title: 'มูลค่ารวม (บาท)', dataIndex: 'total', width: 180, align: 'right',
      sorter: (a, b) => a.total - b.total,
      render: (v: number) => money(v),
    },
    {
      title: '', key: 'open', width: 110, align: 'center',
      render: (_: unknown, r: DeptRow) => (
        <Button size="small" icon={<FaTable />} onClick={() => {
          setDept(r.divs)
          resetPage()
          setTab('detail')
        }}>
          ดูรายการ
        </Button>
      ),
    },
  ]

  const detailColumns: ColumnsType<Asset> = [
    { title: 'ลำดับ', dataIndex: 'seq', width: 70, align: 'center', fixed: 'left' },
    { title: 'เลขครุภัณฑ์', dataIndex: 'noid', width: 170, fixed: 'left' },
    {
      title: 'รายการ', dataIndex: 'names', width: 260,
      render: (_: unknown, a: Asset) => (
        <div>
          <div>{a.names || <Text type="secondary">-</Text>}</div>
          {a.models && <Text type="secondary" style={{ fontSize: 12 }}>{a.models}</Text>}
        </div>
      ),
    },
    { title: 'หมวด', dataIndex: 'category', width: 180 },
    { title: 'วันที่รับ', dataIndex: 'receive', width: 110, render: (v: string | null) => thaiDate(v) },
    { title: 'ปีงบ', dataIndex: 'fy', width: 80, align: 'center' },
    {
      title: 'ราคาต่อหน่วย', dataIndex: 'price', width: 140, align: 'right',
      render: (v: number) => money(v),
    },
    { title: 'วิธีการได้มา', dataIndex: 'acquireMethod', width: 130, render: (v: string) => v || <Text type="secondary">-</Text> },
    { title: 'หน่วยงาน', dataIndex: 'department', width: 200 },
    { title: 'สถานที่ตั้ง', dataIndex: 'locates', width: 200, ellipsis: true },
    { title: 'สถานะ', dataIndex: 'status', width: 130 },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <div className="px-4 md:px-8 py-6" style={{ maxWidth: '100%' }}>
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <span><HomeOutlined /> หน้าหลัก</span> },
            { title: 'งานพัสดุ' },
            { title: 'งานครุภัณฑ์' },
            { title: `ครุภัณฑ์แยกตามหน่วยงาน (${version})` },
          ]}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <FaBuilding style={{ color: '#FF6500', marginRight: 10 }} />
              ครุภัณฑ์แยกตามหน่วยงาน ({version})
            </Title>
            <Text type="secondary">ทะเบียนครุภัณฑ์ ({version}) · {filterText}</Text>
          </div>
          <Space>
            <Tooltip
              title={(
                <div>{scopeNotes.map(n => <div key={n}>{n}</div>)}</div>
              )}
            >
              <InfoCircleOutlined style={{ fontSize: 18, color: 'var(--ant-color-text-secondary)', cursor: 'help' }} />
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={() => setReloadKey(k => k + 1)} loading={loading}>
              โหลดใหม่
            </Button>
            <Tooltip title="ส่งออกตามตัวกรองที่เลือกอยู่ — ไฟล์มี 2 ชีต: สรุปตามหน่วยงาน และรายการครุภัณฑ์">
              <Button
                type="primary"
                icon={<FaFileExcel />}
                style={{ background: '#16a34a' }}
                disabled={loading || filtered.length === 0}
                onClick={exportExcel}
              >
                ส่งออก Excel
              </Button>
            </Tooltip>
            <Tooltip title="รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน ตามตัวกรองที่เลือกอยู่ (แบบฟอร์มเดิม)">
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                style={{ background: '#FF6500' }}
                disabled={loading || filtered.length === 0}
                onClick={openPdf}
              >
                พิมพ์ PDF
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Modal
          open={pdf.status !== 'idle'}
          onCancel={closePdf}
          width="95vw"
          style={{ top: 16 }}
          destroyOnHidden
          title={`รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน · ${filtered.length.toLocaleString('th-TH')} รายการ`}
          styles={{ body: { height: 'calc(100vh - 170px)', display: 'flex', flexDirection: 'column' } }}
          footer={(
            <Space>
              {pdf.status === 'ready' && (
                <Button icon={<DownloadOutlined />} href={pdf.url} download={pdf.fileName}>
                  ดาวน์โหลด PDF
                </Button>
              )}
              <Button onClick={closePdf}>{pdf.status === 'building' ? 'ยกเลิก' : 'ปิด'}</Button>
            </Space>
          )}
        >
          {pdf.status === 'building' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={pdf.pages ? Math.round((pdf.page / pdf.pages) * 100) : 0}
                strokeColor="#FF6500"
              />
              <Text type="secondary">
                {pdf.pages
                  ? `กำลังสร้างหน้า ${pdf.page.toLocaleString('th-TH')} / ${pdf.pages.toLocaleString('th-TH')}`
                  : 'กำลังเตรียมข้อมูลและฟอนต์...'}
              </Text>
            </div>
          )}
          {pdf.status === 'error' && (
            <Alert type="error" showIcon title="สร้างรายงานไม่สำเร็จ" description={pdf.message} />
          )}
          {pdf.status === 'ready' && (
            // ใช้ตัวอ่าน PDF ของเบราว์เซอร์เอง — มีปุ่มพิมพ์ ค้นหา และเลื่อนหน้าครบ
            <iframe title="รายงานทะเบียนทรัพย์สินที่ขึ้นบัญชีในหน่วยงาน" src={pdf.url} style={{ flex: 1, width: '100%', border: 'none' }} />
          )}
        </Modal>

        {loadError && (
          <Alert type="error" showIcon className="mb-4" title="ดึงข้อมูลไม่สำเร็จ" description={loadError} />
        )}

        {/* ── ตัวกรอง ── */}
        <Card className="mb-4" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
          <div className="flex flex-wrap items-center gap-4">
            <Space size={8}>
              <Text type="secondary">ปีงบประมาณ:</Text>
              <Select
                value={fy} options={fyOptions} style={{ width: 210 }}
                onChange={v => { setFy(v); resetPage() }}
              />
            </Space>
            <Space size={8}>
              <Text type="secondary">หมวด:</Text>
              <Select
                value={cat} options={catOptions} style={{ width: 260 }}
                onChange={v => { setCat(v); resetPage() }}
              />
            </Space>
            <Space size={8}>
              <Text type="secondary">หน่วยงาน:</Text>
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                value={dept} options={deptOptions} style={{ width: 320 }}
                onChange={v => { setDept(v); resetPage() }}
              />
            </Space>
            <Space size={8}>
              <Text type="secondary">วิธีการได้มา:</Text>
              <Select
                value={method} options={methodOptions} style={{ width: 220 }}
                onChange={v => { setMethod(v); resetPage() }}
              />
            </Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="ค้นหาเลขครุภัณฑ์ ชื่อ รุ่น สถานที่ เลขเอกสาร ผู้ขาย"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              style={{ width: 340 }}
            />
            {(fy !== ALL || cat !== ALL || dept !== ALL || method !== ALL || search) && (
              <Button type="link" onClick={() => {
                setFy(ALL); setCat(ALL); setDept(ALL); setMethod(ALL); setSearch(''); resetPage()
              }}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </Card>

        {/* ── ตัวเลขสรุป ── */}
        <Row gutter={[16, 16]} className="mb-4">
          {[
            { title: 'จำนวนครุภัณฑ์', value: filtered.length.toLocaleString('th-TH'), suffix: 'รายการ' },
            { title: 'มูลค่ารวม', value: money(totalValue), suffix: 'บาท' },
            { title: 'หน่วยงาน', value: deptRows.length.toLocaleString('th-TH'), suffix: 'หน่วยงาน' },
            { title: 'หมวดครุภัณฑ์', value: catCount.toLocaleString('th-TH'), suffix: 'หมวด' },
          ].map(k => (
            <Col key={k.title} xs={12} md={6}>
              <Card style={{ borderRadius: 14 }} loading={loading}>
                <Statistic title={k.title} value={k.value} suffix={k.suffix} styles={{ content: { color: '#FF6500' } }} />
              </Card>
            </Col>
          ))}
        </Row>

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={tab}
            onChange={k => setTab(k as 'dept' | 'detail')}
            tabBarStyle={{ padding: '0 16px', margin: 0 }}
            items={[
              {
                key: 'dept',
                label: <span><FaBuilding style={{ marginRight: 6 }} />สรุปตามหน่วยงาน ({deptRows.length.toLocaleString('th-TH')})</span>,
                children: (
                  <div style={{ padding: 16 }}>
                    <Table<DeptRow>
                      rowKey="divs"
                      size="middle"
                      loading={loading}
                      columns={deptColumns}
                      dataSource={deptRows}
                      pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200] }}
                      summary={() => deptRows.length > 0 && (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ fontWeight: 600 }}>
                            <Table.Summary.Cell index={0} colSpan={3} align="right">รวมทั้งสิ้น</Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">{filtered.length.toLocaleString('th-TH')}</Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">{money(totalValue)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={5} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />
                  </div>
                ),
              },
              {
                key: 'detail',
                label: <span><FaTable style={{ marginRight: 6 }} />รายการครุภัณฑ์ ({filtered.length.toLocaleString('th-TH')})</span>,
                children: (
                  <div style={{ padding: 16 }}>
                    <Table<Asset>
                      rowKey="noid"
                      size="small"
                      loading={loading}
                      columns={detailColumns}
                      dataSource={filtered}
                      scroll={{ x: 1700 }}
                      pagination={{
                        ...detailPage,
                        showSizeChanger: true,
                        pageSizeOptions: [20, 50, 100, 200],
                        showTotal: (t, [a, b]) => `${a.toLocaleString('th-TH')}–${b.toLocaleString('th-TH')} จาก ${t.toLocaleString('th-TH')} รายการ`,
                        onChange: (current, pageSize) => setDetailPage({ current, pageSize }),
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

export default function AssetByDeptView(props: AssetByDeptViewProps) {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#FF6500', borderRadius: 8 },
      }}
    >
      <App>
        <PageContent {...props} />
      </App>
    </ConfigProvider>
  )
}
