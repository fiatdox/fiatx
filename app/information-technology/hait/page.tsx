'use client'
import React, { useState, useMemo } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col,
  Radio, Input, Button, Tag, Progress, Collapse, Tabs,
  Space, App, theme, Alert, Divider, Badge,
} from 'antd'
import {
  HomeOutlined, DesktopOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, LinkOutlined,
  SaveOutlined, StarFilled, RightOutlined, WarningOutlined,
  SafetyOutlined, DatabaseOutlined, MedicineBoxOutlined,
  CodeOutlined, AppstoreOutlined, PartitionOutlined, DashboardOutlined,
} from '@ant-design/icons'
import { FaMicrochip } from 'react-icons/fa'
import Navbar from '../../components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import EChart from '../../components/EChart'
import Link from 'next/link'

const { Title, Text } = Typography
const { TextArea } = Input

type AssessStatus = 'none' | 'partial' | 'done'

interface HaitItem {
  key: string
  no: string
  title: string
  description?: string
  linkedPage?: string
  linkedLabel?: string
}

interface HaitSection {
  key: string
  no: string
  title: string
  subtitle: string
  color: string
  documentCount: number | string
  icon: React.ReactNode
  items: HaitItem[]
}

const SECTIONS: HaitSection[] = [
  {
    key: '1', no: 'หมวด 1', title: 'แผนแม่บทเทคโนโลยีสารสนเทศ',
    subtitle: 'IT Master Plan', color: '#3b82f6', documentCount: 1,
    icon: <PartitionOutlined />,
    items: [
      { key: '1.1.1', no: '1.1.1', title: 'ข้อมูลพื้นฐานโรงพยาบาล', description: 'รายละเอียดพื้นฐานของโรงพยาบาล เช่น ขนาด ประเภท และบริการที่ให้' },
      { key: '1.1.2', no: '1.1.2', title: 'สรุปแผนยุทธศาสตร์ของโรงพยาบาล', description: 'เป้าหมาย วิสัยทัศน์ พันธกิจ และยุทธศาสตร์หลักของโรงพยาบาล' },
      { key: '1.1.3', no: '1.1.3', title: 'ตารางวิเคราะห์ปัจจัยแห่งความสำเร็จ (แสดงการเชื่อมโยงยุทธศาสตร์โรงพยาบาลไปสู่ยุทธศาสตร์ IT)', description: 'Critical Success Factors ที่เชื่อมโยงยุทธศาสตร์โรงพยาบาลกับ IT Strategy' },
      { key: '1.1.4', no: '1.1.4', title: 'แผนยุทธศาสตร์ IT', description: 'เป้าหมาย กลยุทธ์ และแนวทางการพัฒนา IT ระยะยาว' },
      { key: '1.1.5', no: '1.1.5', title: 'แผนปฏิบัติการ IT อย่างน้อย 1 ปี ในปีปัจจุบัน', description: 'รายละเอียดกิจกรรม งบประมาณ ผู้รับผิดชอบ และระยะเวลา' },
      { key: '1.1.6', no: '1.1.6', title: 'ประเมินผลการดำเนินงานในรอบปีที่ผ่านมา (ถ้ามี)', description: 'รายงานผลการดำเนินงานตามแผน IT ปีที่ผ่านมาเทียบกับเป้าหมาย' },
    ],
  },
  {
    key: '2', no: 'หมวด 2', title: 'การจัดการความเสี่ยง',
    subtitle: 'Risk Management', color: '#f59e0b', documentCount: 1,
    icon: <WarningOutlined />,
    items: [
      { key: '2.1.1', no: '2.1.1', title: 'ผลการประเมินจุดอ่อนช่องโหว่ประจำปี ที่ประเมินครั้งแรก', description: 'การสำรวจและประเมิน Vulnerability ในระบบ IT ของโรงพยาบาล' },
      { key: '2.1.2', no: '2.1.2', title: 'ผลการประเมินคะแนนความเสี่ยง (PxI)', description: 'ตารางคะแนน Probability x Impact ของแต่ละความเสี่ยงที่ระบุ' },
      { key: '2.1.3', no: '2.1.3', title: 'แผนกลยุทธ์การจัดการความเสี่ยง แยกเป็น 4 ตาราง', description: 'กลยุทธ์ Accept / Transfer / Mitigate / Avoid สำหรับแต่ละความเสี่ยง' },
      { key: '2.1.4', no: '2.1.4', title: 'แผนปฏิบัติการจัดการความเสี่ยงในปีปัจจุบัน', description: 'กิจกรรม งบประมาณ ผู้รับผิดชอบ และตัวชี้วัดการจัดการความเสี่ยง' },
      { key: '2.1.5', no: '2.1.5', title: 'ประเมินผลการดำเนินการจัดการความเสี่ยงในรอบปีที่ผ่านมา', description: 'ผลลัพธ์ ความสำเร็จ และบทเรียนจากการจัดการความเสี่ยงในปีก่อน' },
    ],
  },
  {
    key: '3', no: 'หมวด 3', title: 'การดำเนินการจัดการความเสี่ยง',
    subtitle: 'Risk Management Implementation', color: '#ef4444', documentCount: 4,
    icon: <SafetyOutlined />,
    items: [
      { key: '3.1.1', no: '3.1.1', title: 'นโยบายของโรงพยาบาลด้านความมั่นคงปลอดภัย และการจัดการข้อมูลส่วนบุคคล', description: 'นโยบาย Information Security และ Privacy Policy ที่ประกาศใช้อย่างเป็นทางการ' },
      { key: '3.1.2', no: '3.1.2', title: 'ระเบียบปฏิบัติด้านความมั่นคงปลอดภัย', description: 'ขั้นตอนและแนวปฏิบัติ IT Security สำหรับบุคลากรทุกระดับ' },
      { key: '3.1.3', no: '3.1.3', title: 'ผลการประเมินความรับรู้ของบุคลากรทุกคนต่อระเบียบปฏิบัติ', description: 'แบบทดสอบ ผลคะแนน และรายชื่อผู้ผ่านการทดสอบความรับรู้' },
      { key: '3.1.4', no: '3.1.4', title: 'ผลการประเมินความเข้าใจของบุคลากรทุกคนต่อระเบียบปฏิบัติ', description: 'แบบทดสอบ ผลคะแนน และรายชื่อผู้ผ่านการทดสอบความเข้าใจ' },
      { key: '3.1.5', no: '3.1.5', title: 'ผลการประเมินความปฏิบัติของบุคลากรทุกคนต่อระเบียบปฏิบัติ', description: 'ผลการสังเกต ตรวจสอบ และประเมินการปฏิบัติตามระเบียบ' },
      { key: '3.1.6', no: '3.1.6', title: 'สรุปผลการปรับปรุง Data Center ตามข้อกำหนดในมาตรฐาน HAIT', description: 'รายงานการปรับปรุงห้อง Data Center ให้เป็นไปตามมาตรฐาน HAIT' },
      { key: '3.2.1', no: '3.2.1', title: 'การดำเนินการตามหัวข้อ HAIT Plus ข้อ A ถึง R', description: 'หลักฐานการดำเนินการตามเกณฑ์ขั้นสูง HAIT Plus ทุกข้อ (A–R)' },
      { key: '3.2.2', no: '3.2.2', title: 'คู่มือแนวทางปฏิบัติการดูแลรักษาห้อง Data Center', description: 'SOP การดูแล บำรุงรักษา และตรวจสอบห้อง Data Center' },
      { key: '3.2.3', no: '3.2.3', title: 'คู่มือแนวทางปฏิบัติการสำรองข้อมูลฐานข้อมูลสำคัญของโรงพยาบาลทุกฐานข้อมูล', description: 'SOP การ Backup ฐานข้อมูลสำคัญทุกฐานข้อมูลของโรงพยาบาล' },
      { key: '3.3', no: '3.3', title: 'แผน Business Continuity Plan (BCP) และรายงานผลการซ้อมดำเนินการตามแผน', description: 'แผน BCP และบันทึกผลการซ้อมปฏิบัติตามแผน' },
      { key: '3.4', no: '3.4', title: 'แผน Disaster Recovery Plan (DRP) และรายงานผลการซ้อมดำเนินการตามแผน', description: 'แผน DRP และบันทึกผลการซ้อมกู้คืนระบบหลังภัยพิบัติ' },
    ],
  },
  {
    key: '4', no: 'หมวด 4', title: 'การจัดระบบบริการเทคโนโลยีสารสนเทศ',
    subtitle: 'IT Service Management', color: '#a855f7', documentCount: 1,
    icon: <AppstoreOutlined />,
    items: [
      { key: '4.1', no: '4.1', title: 'การจัดระบบ Service Desk', description: 'จุดรับแจ้งบริการ ขั้นตอนการทำงาน ทั้งในและนอกเวลาราชการ' },
      { key: '4.2', no: '4.2', title: 'ข้อตกลงระดับบริการ (SLA) และผลการดำเนินงานตามข้อตกลงระดับบริการ', description: 'SLA ที่กำหนดร่วมกับผู้ใช้ระบบ และรายงานผลการปฏิบัติงานตาม SLA', linkedPage: '/information-technology/hait/sla', linkedLabel: 'บันทึก / รายงาน SLA' },
      { key: '4.3', no: '4.3', title: 'ข้อมูลการบันทึกอุบัติการณ์ อย่างน้อย 3-6 เดือน', description: 'บันทึกเหตุการณ์ที่ไม่พึงประสงค์ในระบบ IT อย่างน้อย 3-6 เดือน', linkedPage: '/information-technology/hait/incident-reports', linkedLabel: 'บันทึกอุบัติการณ์' },
      { key: '4.4', no: '4.4', title: 'ข้อมูลการบันทึกกิจกรรมประจำวันของบุคลากรฝ่าย IT ทุกคน ทุกวัน อย่างน้อย 3-6 เดือน', description: 'กิจกรรมการทำงานประจำวันของบุคลากร IT ทุกคน อย่างน้อย 3-6 เดือน', linkedPage: '/information-technology/hait/activity', linkedLabel: 'บันทึกกิจกรรม' },
    ],
  },
  {
    key: '5', no: 'หมวด 5', title: 'การตรวจสอบคุณภาพข้อมูล',
    subtitle: 'Data Quality Audit', color: '#22c55e', documentCount: 2,
    icon: <MedicineBoxOutlined />,
    items: [
      { key: '5.1', no: '5.1', title: 'ระบบการตรวจสอบคุณภาพผู้ป่วยนอก และผลการตรวจสอบตามแนวทางหลักเกณฑ์ของ TMI', description: 'คณะกรรมการ วงรอบการตรวจ จำนวนแฟ้มที่สุ่มตรวจแต่ละครั้ง และผลการตรวจสอบ' },
      { key: '5.2', no: '5.2', title: 'ระบบการตรวจสอบคุณภาพผู้ป่วยใน และผลการตรวจสอบตามแนวทางหลักเกณฑ์ของ TMI', description: 'คณะกรรมการ วงรอบการตรวจ จำนวนแฟ้มที่สุ่มตรวจแต่ละครั้ง และผลการตรวจสอบ' },
    ],
  },
  {
    key: '6', no: 'หมวด 6', title: 'การพัฒนาระบบสารสนเทศ',
    subtitle: 'Information System Development', color: '#06b6d4', documentCount: 'ตามจำนวนโปรแกรม',
    icon: <CodeOutlined />,
    items: [
      { key: '6.1', no: '6.1', title: 'การวิเคราะห์ระบบเดิม เปรียบเทียบกับระบบใหม่', description: 'เอกสารวิเคราะห์ปัญหาระบบเดิม ข้อกำหนดความต้องการ และการเปรียบเทียบ' },
      { key: '6.2.1', no: '6.2.1', title: 'Context Diagram', description: 'แผนภาพแสดงขอบเขตระบบ (System Boundary) และการเชื่อมต่อกับ External Entity' },
      { key: '6.2.2', no: '6.2.2', title: 'Data Flow Diagram (DFD)', description: 'แผนภาพแสดงการไหลของข้อมูลในระบบทุก Level' },
      { key: '6.2.3', no: '6.2.3', title: 'ER-Diagram', description: 'แผนภาพ Entity-Relationship แสดงความสัมพันธ์ระหว่าง Entity ในฐานข้อมูล' },
      { key: '6.2.4', no: '6.2.4', title: 'Data Dictionary', description: 'รายละเอียดทุก Field ในทุก Table รวมถึง Data Type และ Constraint' },
    ],
  },
  {
    key: '7', no: 'หมวด 7', title: 'การจัดการทรัพยากรและสมรรถนะ IT',
    subtitle: 'IT Resource & Competency Management', color: '#6366f1', documentCount: 2,
    icon: <DatabaseOutlined />,
    items: [
      { key: '7.1.1', no: '7.1.1', title: 'ทะเบียน Hardware และตารางสรุป', description: 'รายการ Hardware ทั้งหมด สถานะ อายุการใช้งาน และแผนการเปลี่ยนทดแทน' },
      { key: '7.1.2', no: '7.1.2', title: 'ทะเบียน Software ทั้งหมดที่มีใช้อยู่ระบบคอมพิวเตอร์ของโรงพยาบาล', description: 'รายการ Software License สถานะ วันหมดอายุ และผู้รับผิดชอบ' },
      { key: '7.1.3', no: '7.1.3', title: 'ทะเบียนอุปกรณ์ Network และ Network Diagram', description: 'รายการ Network Equipment ทั้งหมด และแผนผังโครงข่ายเครือข่าย' },
      { key: '7.1.4', no: '7.1.4', title: 'ผลการวิเคราะห์ Utilization ของ Server ทั้งหมด, Intranet และ Internet', description: 'รายงานการใช้งาน Resource ของระบบ Network และ Server ทั้งหมด' },
      { key: '7.2.1', no: '7.2.1', title: 'Competency Mapping, Competency Dictionary และ Competency Template ของโรงพยาบาล', description: 'กรอบสมรรถนะที่กำหนดสำหรับบุคลากร IT ทุกตำแหน่ง' },
      { key: '7.2.2', no: '7.2.2', title: 'ผลการประเมิน Competency รายบุคคล (รวม CIO) และแผนการพัฒนาสมรรถนะรายบุคคล', description: 'ผลการประเมินสมรรถนะรายบุคคล และ Individual Development Plan (IDP)' },
    ],
  },
]

const STATUS_CFG: Record<AssessStatus, { label: string; tagColor: string; icon: React.ReactNode }> = {
  none:    { label: 'ไม่ได้ทำ', tagColor: 'error',   icon: <ExclamationCircleOutlined /> },
  partial: { label: 'บางส่วน', tagColor: 'warning', icon: <ClockCircleOutlined /> },
  done:    { label: 'ทำแล้ว',  tagColor: 'success', icon: <CheckCircleOutlined /> },
}

const BORDER: Record<AssessStatus, string> = {
  none: 'var(--app-text-3)', partial: '#f59e0b', done: '#22c55e',
}

function hexRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

function SectionContent({
  section, statusMap, detailMap, onStatus, onDetail,
}: {
  section: HaitSection
  statusMap: Record<string, AssessStatus>
  detailMap: Record<string, string>
  onStatus: (k: string, v: AssessStatus) => void
  onDetail: (k: string, v: string) => void
}) {
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  const { items, color } = section
  const done    = items.filter(i => statusMap[i.key] === 'done').length
  const partial = items.filter(i => statusMap[i.key] === 'partial').length
  const none    = items.length - done - partial
  const pct     = items.length ? Math.round(((done + partial * 0.5) / items.length) * 100) : 0

  const collapseItems = items.map(item => {
    const st = statusMap[item.key] || 'none'
    return {
      key: item.key,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
          <Space size={10} align="center" style={{ flex: 1, minWidth: 0 }}>
            <Tag style={{ background: color, color: '#fff', border: 'none', fontWeight: 700, minWidth: 44, textAlign: 'center', flexShrink: 0 }}>{item.no}</Tag>
            <Text strong style={{ color: 'var(--app-text)', fontSize: 13 }}>{item.title}</Text>
          </Space>
          <Tag icon={STATUS_CFG[st].icon} color={STATUS_CFG[st].tagColor} style={{ flexShrink: 0, marginLeft: 12 }}>
            {STATUS_CFG[st].label}
          </Tag>
        </div>
      ),
      style: { marginBottom: 8, borderRadius: 10, background: 'var(--app-surface)', border: '1px solid #334155', borderLeftColor: BORDER[st], borderLeftWidth: 4 },
      children: (
        <div style={{ paddingTop: 4 }}>
          {item.description && (
            <Alert title={item.description} type="info" showIcon style={{ marginBottom: 16, background: `rgba(${hexRgb(color)},0.08)`, border: `1px solid rgba(${hexRgb(color)},0.3)` }} />
          )}
          <Row gutter={[24, 16]}>
            <Col xs={24} lg={14}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>อธิบายรายละเอียดและหลักฐานที่มีในเอกสาร:</Text>
              <TextArea rows={4} placeholder="อธิบายรายละเอียดและหลักฐาน..." value={detailMap[item.key] || ''} onChange={e => onDetail(item.key, e.target.value)} style={{ background: 'var(--app-bg)', borderColor: 'var(--app-border-strong)' }} />
            </Col>
            <Col xs={24} lg={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>ผลการประเมิน</Text>
                  <Radio.Group value={st} onChange={e => onStatus(item.key, e.target.value as AssessStatus)} buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                    <ConfigProvider theme={{ token: { colorPrimary: '#ef4444' } }}>
                      <Radio.Button value="none" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>ไม่ได้ทำ</Radio.Button>
                    </ConfigProvider>
                    <ConfigProvider theme={{ token: { colorPrimary: '#f59e0b' } }}>
                      <Radio.Button value="partial" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>บางส่วน</Radio.Button>
                    </ConfigProvider>
                    <ConfigProvider theme={{ token: { colorPrimary: '#22c55e' } }}>
                      <Radio.Button value="done" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>ทำแล้ว</Radio.Button>
                    </ConfigProvider>
                  </Radio.Group>
                </div>
                {item.linkedPage && (
                  <Link href={item.linkedPage}>
                    <Button icon={<LinkOutlined />} type="default" block>{item.linkedLabel}</Button>
                  </Link>
                )}
              </div>
            </Col>
          </Row>
        </div>
      ),
    }
  })

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${color}22 0%, #1e293b 100%)`, border: `1px solid ${color}44`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, color }}>{section.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag style={{ background: color, color: '#fff', border: 'none', fontWeight: 700 }}>{section.no}</Tag>
                <Title level={4} style={{ margin: 0, color: 'var(--app-text)' }}>{section.title}</Title>
              </div>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 12 }}>
                {section.subtitle} • {typeof section.documentCount === 'number' ? `${section.documentCount} เล่ม` : section.documentCount}
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ v: done, c: '#22c55e', l: 'ทำแล้ว' }, { v: partial, c: '#f59e0b', l: 'บางส่วน' }, { v: none, c: '#ef4444', l: 'ไม่ได้ทำ' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center', minWidth: 48 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'var(--app-text-3)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <Progress percent={pct} strokeColor={color} railColor="rgba(255,255,255,0.1)" format={p => <Text style={{ color, fontSize: 12 }}>{p}%</Text>} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
        <Button size="small" type="text" style={{ color: 'var(--app-text-2)' }} onClick={() => setActiveKeys(items.map(i => i.key))}>ขยายทั้งหมด</Button>
        <Button size="small" type="text" style={{ color: 'var(--app-text-2)' }} onClick={() => setActiveKeys([])}>ยุบทั้งหมด</Button>
      </div>

      <Collapse activeKey={activeKeys} onChange={k => setActiveKeys(k as string[])} items={collapseItems} ghost expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} style={{ color }} />} style={{ background: 'transparent' }} />
    </div>
  )
}

function HaitPageContent() {
  const [statusMap, setStatusMap] = useState<Record<string, AssessStatus>>({})
  const [detailMap, setDetailMap] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('overview')
  const { message: messageApi } = App.useApp()

  const onStatus = (k: string, v: AssessStatus) => setStatusMap(p => ({ ...p, [k]: v }))
  const onDetail = (k: string, v: string) => setDetailMap(p => ({ ...p, [k]: v }))

  const allItems = useMemo(() => SECTIONS.flatMap(s => s.items), [])
  const totalDone    = allItems.filter(i => statusMap[i.key] === 'done').length
  const totalPartial = allItems.filter(i => statusMap[i.key] === 'partial').length
  const totalNone    = allItems.length - totalDone - totalPartial
  const totalPct     = Math.round(((totalDone + totalPartial * 0.5) / allItems.length) * 100)

  const secStats = SECTIONS.map(s => {
    const d = s.items.filter(i => statusMap[i.key] === 'done').length
    const p = s.items.filter(i => statusMap[i.key] === 'partial').length
    return { ...s, done: d, partial: p, none: s.items.length - d - p, pct: s.items.length ? Math.round(((d + p * 0.5) / s.items.length) * 100) : 0 }
  })

  const overviewContent = (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {[
          { label: 'หัวข้อทั้งหมด', value: allItems.length, color: '#a855f7' },
          { label: 'ทำแล้ว',        value: totalDone,       color: '#22c55e' },
          { label: 'บางส่วน',       value: totalPartial,    color: '#f59e0b' },
          { label: 'ยังไม่ได้ทำ',   value: totalNone,       color: '#ef4444' },
        ].map(s => (
          <Col xs={12} md={6} key={s.label}>
            <Card size="small" style={{ textAlign: 'center', background: 'var(--app-surface)', border: `1px solid ${s.color}33`, borderRadius: 10 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: 'var(--app-text-2)', fontSize: 12 }}>{s.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ background: 'var(--app-surface)', borderRadius: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginBottom: 4 }}>ความคืบหน้ารวม</Text>
            <EChart height={220} option={{
              backgroundColor: 'transparent',
              series: [{
                type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100,
                progress: { show: true, width: 16, roundCap: true, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#6B21A8' }, { offset: 1, color: '#a855f7' }] } } },
                axisLine: { lineStyle: { width: 16, color: [[1, 'var(--app-border-strong)']] } },
                pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, anchor: { show: false },
                detail: { valueAnimation: true, formatter: '{value}%', fontSize: 32, fontWeight: 700, color: '#a855f7', offsetCenter: [0, '0%'] },
                title: { offsetCenter: [0, '38%'], color: 'var(--app-text-2)', fontSize: 11 },
                data: [{ value: totalPct, name: `${totalDone}/${allItems.length} ข้อ` }],
              }],
            }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ background: 'var(--app-surface)', borderRadius: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginBottom: 4 }}>สัดส่วนสถานะ</Text>
            <EChart height={220} option={{
              backgroundColor: 'transparent',
              tooltip: { trigger: 'item', backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)', textStyle: { color: 'var(--app-text)' }, formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${p.value} ข้อ (${p.percent}%)` },
              legend: { bottom: 0, left: 'center', textStyle: { color: 'var(--app-text-2)', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
              series: [{
                type: 'pie', radius: ['48%', '70%'], center: ['50%', '42%'],
                itemStyle: { borderColor: 'var(--app-surface)', borderWidth: 2 }, label: { show: false }, labelLine: { show: false },
                data: [
                  { name: 'ทำแล้ว', value: totalDone, itemStyle: { color: '#22c55e' } },
                  { name: 'บางส่วน', value: totalPartial, itemStyle: { color: '#f59e0b' } },
                  { name: 'ไม่ได้ทำ', value: totalNone, itemStyle: { color: '#ef4444' } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ background: 'var(--app-surface)', borderRadius: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginBottom: 4 }}>ความคืบหน้าแต่ละหมวด (%)</Text>
            <EChart height={220} option={{
              backgroundColor: 'transparent',
              tooltip: { trigger: 'axis', backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border-strong)', textStyle: { color: 'var(--app-text)' } },
              grid: { left: 56, right: 36, top: 8, bottom: 16 },
              xAxis: { type: 'value', max: 100, axisLabel: { color: 'var(--app-text-3)', fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: 'var(--app-border-strong)' } }, axisLine: { show: false } },
              yAxis: { type: 'category', data: SECTIONS.map(s => s.no), axisLabel: { color: 'var(--app-text-2)', fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
              series: [{ type: 'bar', barMaxWidth: 14, label: { show: true, position: 'right', color: 'var(--app-text-2)', fontSize: 9, formatter: '{c}%' }, data: secStats.map(s => ({ value: s.pct, itemStyle: { color: s.color } })) }],
            }} />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ background: 'var(--app-surface)', borderRadius: 12 }}>
        <Title level={5} style={{ color: 'var(--app-text)', marginTop: 0, marginBottom: 20 }}>ความคืบหน้าแต่ละหมวด</Title>
        {secStats.map(s => (
          <div key={s.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Space size={8}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <Text style={{ color: 'var(--app-text)', fontSize: 13 }}>
                  <Text style={{ color: s.color, fontWeight: 700 }}>{s.no}</Text> — {s.title}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>({s.items.length} ข้อ)</Text>
              </Space>
              <Space size={10}>
                <Text style={{ color: '#22c55e', fontSize: 12 }}>{s.done} ✓</Text>
                {s.partial > 0 && <Text style={{ color: '#f59e0b', fontSize: 12 }}>{s.partial} ~</Text>}
                {s.none > 0 && <Text style={{ color: '#ef4444', fontSize: 12 }}>{s.none} ✗</Text>}
                <Text style={{ color: s.color, fontWeight: 700, fontSize: 13, minWidth: 36, textAlign: 'right' }}>{s.pct}%</Text>
              </Space>
            </div>
            <Progress percent={s.pct} strokeColor={s.color} railColor="#334155" showInfo={false} />
          </div>
        ))}
      </Card>
    </div>
  )

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space size={6}>
          <DashboardOutlined />
          <span>ภาพรวม</span>
          {totalNone > 0 && <Badge count={totalNone} size="small" style={{ backgroundColor: '#ef4444' }} />}
        </Space>
      ),
      children: overviewContent,
    },
    ...SECTIONS.map(section => {
      const pending = section.items.filter(i => (statusMap[i.key] || 'none') === 'none').length
      return {
        key: section.key,
        label: (
          <Space size={6}>
            <span style={{ color: section.color }}>{section.icon}</span>
            <span>{section.no}</span>
            {pending > 0 && <Badge count={pending} size="small" style={{ backgroundColor: '#ef4444' }} />}
          </Space>
        ),
        children: (
          <SectionContent
            section={section}
            statusMap={statusMap}
            detailMap={detailMap}
            onStatus={onStatus}
            onDetail={onDetail}
          />
        ),
      }
    }),
  ]

  return (
    <div className="min-h-screen w-full bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
            { title: 'HAIT Star — การประเมินมาตรฐาน' },
          ]}
          className="mb-6"
        />

        {/* Header banner */}
        <div style={{ background: 'linear-gradient(135deg, #1e1040 0%, #2d1b69 50%, #1e293b 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, border: '1px solid rgba(168,85,247,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 180, height: 180, background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: '#a855f7', fontSize: 36 }}><FaMicrochip /></span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>HAIT Star V1</Title>
                  <Tag icon={<StarFilled />} color="purple">การประเมินมาตรฐาน</Tag>
                </div>
                <Text style={{ color: 'var(--app-text-2)' }}>สมาคมเวชสารสนเทศไทย (TMI) • 7 หมวด • {allItems.length} หัวข้อ</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { v: `${totalPct}%`, l: 'ความคืบหน้า', c: '#a855f7' },
                { v: totalDone,      l: 'ทำแล้ว',       c: '#22c55e' },
                { v: totalNone,      l: 'ยังไม่ทำ',     c: '#ef4444' },
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ color: 'var(--app-text-3)', fontSize: 11 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <Progress percent={totalPct} strokeColor={{ '0%': '#6B21A8', '100%': '#a855f7' }} railColor="rgba(255,255,255,0.1)" style={{ marginTop: 16 }} format={() => null} />
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={tabItems} />

        <Divider style={{ borderColor: 'var(--app-border-strong)', marginTop: 24 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<SaveOutlined />} size="large" onClick={() => messageApi.success('บันทึกผลการประเมินเรียบร้อยแล้ว')} style={{ backgroundColor: '#6B21A8', borderColor: '#6B21A8', minWidth: 180 }}>
            บันทึกผลการประเมินทั้งหมด
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function HaitPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      <App>
        <HaitPageContent />
      </App>
    </ConfigProvider>
  )
}
