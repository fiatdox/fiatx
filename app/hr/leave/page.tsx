'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, Typography, Breadcrumb, Button, Space, Empty, Tag, Skeleton, Row, Col, Badge, Progress } from 'antd'
import {
  HomeOutlined, LinkOutlined, PushpinFilled, NotificationOutlined,
  FolderOpenOutlined, FormOutlined, HistoryOutlined, AuditOutlined, RightOutlined, TeamOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt, FaUmbrellaBeach, FaBriefcase, FaUserMd, FaBaby } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import HrPopup from '@/app/components/HrPopup'
import LeaveHeader from './LeaveHeader'
import {
  type HrPost, KIND_LABEL, NO_CATEGORY, categoryRank, fileIcon, fileUrl, fmtDate, fmtSize, isImage,
} from '@/app/lib/hrPosts'

const { Text, Paragraph } = Typography

interface QuickLink { href: string; icon: React.ReactNode; label: string; desc: string; color: string; badge?: number; badgeColor?: string; highlight?: boolean }

const QUICK_LINKS: QuickLink[] = [
  { href: '/hr/leave/new', icon: <FormOutlined />, label: 'ยื่นคำขอลา', desc: 'ยื่นใบลาใหม่ ตรวจสิทธิ์วันลาคงเหลือ', color: '#10b981' },
  { href: '/hr/leave/history', icon: <HistoryOutlined />, label: 'ประวัติการลาของฉัน', desc: 'ใบลาทั้งหมด ติดตามสถานะการอนุมัติ', color: '#3b82f6' },
  { href: '/hr/leave/calendar', icon: <CalendarOutlined />, label: 'ปฏิทินการลา', desc: 'ดูว่าใครลาวันไหน ตามสิทธิ์ของตน', color: '#0d9488' },
]

// ── สรุปวันลาปีงบปัจจุบันของฉัน ─────────────────────────────────────────────
interface OverviewType {
  code: string
  name_th: string
  has_entitlement: boolean
  entitled: number          // สิทธิ์รวม (ปีนี้ + ยกมา)
  entitled_this_year: number
  carried_in: number
  used: number              // อนุมัติแล้ว/หักแล้ว ไม่รวมใบรออนุมัติ
  pending: number
  remaining: number
}

const OVERVIEW_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ANNUAL: { label: 'วันลาพักผ่อน', icon: <FaUmbrellaBeach />, color: '#10b981' },
  PERS: { label: 'ลากิจส่วนตัว', icon: <FaBriefcase />, color: '#3b82f6' },
  SICK: { label: 'ลาป่วย', icon: <FaUserMd />, color: '#f97316' },
  MAT: { label: 'ลาคลอดบุตร', icon: <FaBaby />, color: '#db2777' },
}
const fmtDays = (n: number) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })

const LeaveOverviewCards = () => {
  const [data, setData] = useState<{ fiscal_year: number; types: OverviewType[] } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch('/api/v1/hr/leave-requests/overview')
      .then(r => r.json())
      .then(j => { if (j?.success) setData(j.data); else setFailed(true) })
      .catch(() => setFailed(true))
  }, [])
  if (failed) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        วันลาของฉัน{data ? ` · ปีงบประมาณ ${data.fiscal_year}` : ''}
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {!data ? [0, 1, 2, 3].map(i => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12, border: 'none' }}><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        )) : data.types.map(t => {
          const m = OVERVIEW_META[t.code] ?? { label: t.name_th, icon: <CalendarOutlined />, color: '#64748b' }
          const annual = t.code === 'ANNUAL'
          const total = Number(t.entitled) || 0
          const used = Number(t.used) || 0
          const pending = Number(t.pending) || 0
          // ใบที่รออนุมัติถูกตัดยอดทันทีตั้งแต่ยื่น จึงนับรวมใน "ใช้ไป" ด้วย (บรรทัดล่างบอกส่วนที่ยังรออนุมัติ)
          const usedNow = used + pending
          return (
            <Col key={t.code} xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: 'none', height: '100%' }} styles={{ body: { padding: 16 } }}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 32, height: 32, flexShrink: 0, fontSize: 16, color: m.color, backgroundColor: `${m.color}1f` }}
                  >
                    {m.icon}
                  </span>
                  <Text strong style={{ minWidth: 0 }}>{m.label}</Text>
                  {/* ลาพักผ่อน: ที่มาของสิทธิ์ + คงเหลือ ไว้มุมขวาบน */}
                  {annual && t.has_entitlement && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12, lineHeight: 1.35, color: 'var(--app-text-2)' }}>
                      <div>ปีนี้ {fmtDays(t.entitled_this_year)} + สะสม {fmtDays(t.carried_in)}</div>
                      <div>คงเหลือ <b style={{ color: 'var(--app-text)' }}>{fmtDays(t.remaining)}</b> วัน</div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>ใช้ไป</Text>{' '}
                  <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{fmtDays(usedNow)}</span>
                  {annual && t.has_entitlement
                    ? <Text type="secondary" style={{ fontSize: 15 }}> / {fmtDays(total)} วัน</Text>
                    : <Text type="secondary" style={{ fontSize: 15 }}> วัน</Text>}
                </div>
                {annual && t.has_entitlement && (
                  <Progress
                    percent={total ? Math.min((usedNow / total) * 100, 100) : 0}
                    success={{ percent: total ? Math.min((used / total) * 100, 100) : 0, strokeColor: m.color }}
                    strokeColor="#f59e0b" showInfo={false} size="small" style={{ margin: '6px 0 2px' }}
                  />
                )}
                <div style={{ fontSize: 12, color: 'var(--app-text-2)', marginTop: 4 }}>
                  {/* ลากิจ/ลาป่วย/ลาคลอด แสดงเฉพาะวันที่ใช้ไป — ไม่โชว์สิทธิ์/คงเหลือ กันเข้าใจว่าเป็นโควตาที่ต้องลาให้ครบ */}
                  {pending > 0 && <div style={{ color: '#f59e0b' }}>รวมรออนุมัติ {fmtDays(pending)} วัน</div>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

// หน้าอ่านอย่างเดียว — เพิ่ม/แก้ไขอยู่ที่ /hr/leave/posts (เฉพาะ ADMIN / HR)
const HrLeaveHomeContent = () => {
  const [posts, setPosts] = useState<HrPost[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/hr-posts')
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setLoadError(json.message || 'โหลดข้อมูลไม่สำเร็จ')
          return
        }
        setPosts(json.data ?? [])
      })
      .catch(() => setLoadError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoaded(true))
  }, [])

  // หัวหน้า / รักษาการในผังเจ้าหน้าที่ (กลุ่มภารกิจ กลุ่มงาน หน่วยงาน) หรือ ผอ. — เห็นปุ่มอนุมัติ + รายงานบุคลากรในสังกัด
  const [approver, setApprover] = useState<{ pending: number } | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/v1/hr/leave-approver-check')
      .then(r => r.json())
      .then(async j => {
        if (!j?.success || !j.data?.is_approver) return
        const p = await fetch('/api/v1/hr/leave-requests/pending-approval?scope=pending').then(r => r.json()).catch(() => null)
        if (alive) setApprover({ pending: p?.success && Array.isArray(p.data) ? p.data.length : 0 })
      })
      .catch(() => { /* ไม่ใช่หัวหน้า = ไม่แสดงปุ่ม */ })
    return () => { alive = false }
  }, [])

  // จำนวนใบลาของฉัน (ทั้งหมด / รออนุมัติ) — แสดงบนปุ่มประวัติการลา
  const [mine, setMine] = useState<{ total: number; pending: number } | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/v1/hr/leave-requests/mine')
      .then(r => r.json())
      .then(j => {
        if (!alive || !j?.success || !Array.isArray(j.data)) return
        const rows = j.data as { status: string }[]
        setMine({ total: rows.length, pending: rows.filter(r => ['PENDING', 'CANCEL_PENDING'].includes(String(r.status).toUpperCase())).length })
      })
      .catch(() => { /* ไม่มีตัวเลขก็แสดงปุ่มตามปกติ */ })
    return () => { alive = false }
  }, [])

  const baseLinks: QuickLink[] = QUICK_LINKS.map(l => l.href === '/hr/leave/history' && mine
    ? {
        ...l, badge: mine.total, badgeColor: l.color, highlight: mine.pending > 0,
        desc: mine.total ? `ใบลาทั้งหมด ${mine.total} ใบ${mine.pending ? ` · รออนุมัติ ${mine.pending} ใบ` : ''}` : 'ยังไม่มีใบลา',
      }
    : l)

  const quickLinks: QuickLink[] = approver
    ? [
        ...baseLinks,
        { href: '/hr/leave/status', icon: <TeamOutlined />, label: 'สถิติการลา', desc: 'สรุปการลาของบุคลากรในหน่วยที่ดูแล', color: '#8b5cf6' },
        {
          href: '/hr/leave/approval', icon: <AuditOutlined />, label: 'อนุมัติการลา', color: '#f59e0b', badge: approver.pending, highlight: approver.pending > 0,
          desc: approver.pending ? `รอการอนุมัติ ${approver.pending} รายการ` : 'ไม่มีใบลารออนุมัติ',
        },
      ]
    : baseLinks

  const news = useMemo(() => posts.filter(p => p.kind === 'news'), [posts])
  const docGroups = useMemo(() => {
    const groups = new Map<string, HrPost[]>()
    for (const p of posts.filter(x => x.kind === 'document')) {
      const c = p.category || NO_CATEGORY
      groups.set(c, [...(groups.get(c) ?? []), p])
    }
    return [...groups.entries()].sort(([a], [b]) => categoryRank(a, b))
  }, [posts])

  const pinTag = (p: HrPost) => p.is_pinned && (
    <Tag color="gold" icon={<PushpinFilled />} style={{ marginInlineEnd: 4 }}>ปักหมุด</Tag>
  )

  const attachments = (p: HrPost) => (p.has_file || p.link_url) && (
    <Space wrap size={8} style={{ marginTop: 8 }}>
      {p.has_file && (
        <Button size="small" icon={fileIcon(p.original_name)} href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer">
          {p.original_name ?? 'ไฟล์แนบ'} {p.file_size ? <Text type="secondary" style={{ fontSize: 11 }}>({fmtSize(p.file_size)})</Text> : null}
        </Button>
      )}
      {p.link_url && (
        <Button size="small" icon={<LinkOutlined />} href={p.link_url} target="_blank" rel="noopener noreferrer">เปิดลิงก์</Button>
      )}
    </Space>
  )

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
          ]}
          className="mb-4"
        />

        <LeaveHeader />

        <LeaveOverviewCards />

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {quickLinks.map(l => (
            <Col key={l.href} xs={24} sm={12} lg={6}>
              <Link href={l.href} className="block h-full">
                <Card hoverable style={{ borderRadius: 12, border: 'none', height: '100%' }} styles={{ body: { padding: 16 } }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center rounded-xl"
                      style={{ width: 44, height: 44, flexShrink: 0, fontSize: 20, color: l.color, backgroundColor: `${l.color}1f` }}
                    >
                      {l.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 15 }}>{l.label}</Text>
                      <div>
                        {l.highlight
                          ? <Text strong style={{ fontSize: 12, color: '#f59e0b' }}>{l.desc}</Text>
                          : <Text type="secondary" style={{ fontSize: 12 }}>{l.desc}</Text>}
                      </div>
                    </div>
                    <span className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                      {!!l.badge && <Badge count={l.badge} overflowCount={999} color={l.badgeColor} />}
                      <RightOutlined style={{ color: 'var(--app-text-3)' }} />
                    </span>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {loadError ? (
          <Card style={{ borderRadius: 12, border: 'none' }}>
            <Empty description={loadError} />
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Card
                title={<span className="flex items-center gap-2"><NotificationOutlined style={{ color: '#10b981' }} /> {KIND_LABEL.news}</span>}
                style={{ borderRadius: 12, border: 'none' }}
              >
                {!loaded ? <Skeleton active /> : news.length === 0 ? (
                  <Empty description="ยังไม่มีข่าวประชาสัมพันธ์" />
                ) : (
                  <div className="flex flex-col">
                    {news.map((p, i) => (
                      <div key={p.id} style={{ padding: '14px 0', borderTop: i ? '1px solid var(--app-border-strong)' : 'none' }}>
                        <div>{pinTag(p)}<Text strong className="hr-news-text" style={{ fontSize: 16 }}>{p.title}</Text></div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(p.created_at)}</Text>
                        {p.body && (
                          <Paragraph
                            className="hr-news-text"
                            style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}
                            ellipsis={{ rows: 4, expandable: 'collapsible', symbol: (expanded: boolean) => expanded ? 'ย่อ' : 'อ่านต่อ' }}
                          >
                            {p.body}
                          </Paragraph>
                        )}
                        {p.has_file && isImage(p.original_name) && (
                          <a href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก API ผ่าน cookie ใช้ next/image ไม่ได้ */}
                            <img src={fileUrl(p.id)} alt={p.title} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 360, marginTop: 8, borderRadius: 8 }} />
                          </a>
                        )}
                        {attachments(p)}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={<span className="flex items-center gap-2"><FolderOpenOutlined style={{ color: '#0d9488' }} /> {KIND_LABEL.document}</span>}
                style={{ borderRadius: 12, border: 'none' }}
              >
                {!loaded ? <Skeleton active /> : docGroups.length === 0 ? (
                  <Empty description="ยังไม่มีเอกสาร" />
                ) : (
                  <div className="flex flex-col gap-5">
                    {docGroups.map(([category, items]) => (
                      <div key={category}>
                        <Text strong style={{ color: 'var(--app-text-2)', fontSize: 13 }}>{category}</Text>
                        <div className="flex flex-col mt-1">
                          {items.map(p => (
                            <div key={p.id} className="flex items-start gap-2" style={{ padding: '8px 0', borderTop: '1px solid var(--app-border-strong)' }}>
                              <span style={{ fontSize: 18, lineHeight: '22px' }}>{p.has_file ? fileIcon(p.original_name) : <LinkOutlined />}</span>
                              <div style={{ minWidth: 0 }}>
                                <div>
                                  {pinTag(p)}
                                  {p.has_file || p.link_url ? (
                                    <a href={p.has_file ? fileUrl(p.id) : p.link_url!} target="_blank" rel="noopener noreferrer" className="hr-news-text" style={{ fontSize: 14, lineHeight: 1.6 }}>{p.title}</a>
                                  ) : <Text>{p.title}</Text>}
                                </div>
                                {p.body && <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{p.body}</Text>}
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {fmtDate(p.updated_at)}{p.has_file && p.file_size ? ` · ${fmtSize(p.file_size)}` : ''}
                                    {p.has_file && p.link_url && <> · <a href={p.link_url} target="_blank" rel="noopener noreferrer">ลิงก์</a></>}
                                  </Text>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  )
}

export default function HrLeaveHomePage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <HrLeaveHomeContent />
      <HrPopup />
    </AppThemeProvider>
  )
}
