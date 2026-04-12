'use client'
import React, { useState } from 'react'
import {
  Card, Typography, ConfigProvider, Breadcrumb, Row, Col, Table,
  Radio, Input, Button, Tag, Progress, Divider, Tooltip, Space, theme
} from 'antd'
import {
  HomeOutlined, DesktopOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, LinkOutlined, SaveOutlined
} from '@ant-design/icons'
import { FaMicrochip } from 'react-icons/fa'
import Navbar from '../../components/Navbar'
import Link from 'next/link'
import { message } from 'antd'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type AssessStatus = 'none' | 'partial' | 'done'

interface SubComponent {
  key: string
  no: string
  title: string
  description: string
  detailPrompt: string
  linkedPage?: string
  linkedLabel?: string
}

const subComponents: SubComponent[] = [
  {
    key: '4.1',
    no: '4.1',
    title: 'มีการจัดระบบ Service Desk เพื่อเพิ่มความสะดวกของผู้ใช้งานระบบในการติดต่อหน่วย IT',
    description: 'จัดจุดรับแจ้งบริการ (Service Desk) และกำหนดขั้นตอนการทำงาน',
    detailPrompt: 'อธิบายการจัดจุดรับแจ้งบริการและขั้นตอนการทำงานทั้งในและนอกเวลาราชการ',
  },
  {
    key: '4.2',
    no: '4.2',
    title: 'มีการกำหนด Service Level Agreement (SLA) ในเรื่องที่สำคัญอย่างยิ่งสำหรับผู้ใช้ระบบ IT',
    description: 'ประชุมร่วมกับผู้ใช้ระบบเพื่อกำหนด SLA และประกาศรับทราบทั่วกัน',
    detailPrompt: 'อธิบายวิธีการกำหนด SLA และแสดงประกาศรายการที่กำหนด SLA',
    linkedPage: '/information-technology/hait/sla',
    linkedLabel: 'บันทึก SLA',
  },
  {
    key: '4.3',
    no: '4.3',
    title: 'มีการติดตามผลการดำเนินการตาม Service Level Agreement และนำผลมาวิเคราะห์เพื่อปรับปรุงการบริการ',
    description: 'เก็บข้อมูลผลการปฏิบัติงานตาม SLA และวิเคราะห์ผลอย่างต่อเนื่อง',
    detailPrompt: 'อธิบายวิธีการเก็บข้อมูลผลการปฏิบัติงานตาม SLA และการวิเคราะห์ผล',
    linkedPage: '/information-technology/hait/sla',
    linkedLabel: 'ดูรายงาน SLA',
  },
  {
    key: '4.4',
    no: '4.4',
    title: 'มีระบบการเก็บข้อมูลอุบัติการณ์ที่เกิดขึ้นในระบบเทคโนโลยีสารสนเทศของโรงพยาบาล',
    description: 'บันทึกเหตุการณ์ที่ไม่พึงประสงค์ ทั้งส่วนที่กำหนดใน SLA และที่ยังไม่ได้กำหนด',
    detailPrompt: 'อธิบายวิธีการเก็บข้อมูลอุบัติการณ์ (เหตุการณ์ที่ไม่พึงประสงค์) ที่เกิดขึ้นในระบบ IT',
    linkedPage: '/information-technology/hait/incident-reports',
    linkedLabel: 'บันทึกอุบัติการณ์',
  },
  {
    key: '4.5',
    no: '4.5',
    title: 'มีระบบการเก็บข้อมูลกิจกรรมและการทำงานของเจ้าหน้าที่ทุกฝ่ายในหน่วย IT',
    description: 'บันทึกกิจกรรมการทำงานของเจ้าหน้าที่ฝ่าย IT ทุกคนในแต่ละวัน',
    detailPrompt: 'อธิบายวิธีการเก็บข้อมูลการทำงานในแต่ละวันของเจ้าหน้าที่ฝ่าย IT ทุกคน และการวิเคราะห์กิจกรรม',
    linkedPage: '/information-technology/hait/activity',
    linkedLabel: 'บันทึกกิจกรรม',
  },
  {
    key: '4.6',
    no: '4.6',
    title: 'มีระบบการวิเคราะห์ข้อมูลอุบัติการณ์และกิจกรรม และนำผลมาดำเนินการจัดการปัญหาหรือปรับระบบการทำงานให้ดีขึ้น',
    description: 'วิเคราะห์ข้อมูลอุบัติการณ์และกิจกรรม นำผลมาปรับปรุงระบบอย่างต่อเนื่อง',
    detailPrompt: 'อธิบายวิธีการวิเคราะห์ข้อมูลอุบัติการณ์และกิจกรรม และการนำผลมาปรับระบบให้ดีขึ้น',
  },
]

const statusLabel: Record<AssessStatus, { label: string; color: string; icon: React.ReactNode }> = {
  none: { label: 'ไม่ได้ทำ', color: 'error', icon: <ExclamationCircleOutlined /> },
  partial: { label: 'บางส่วน', color: 'warning', icon: <ClockCircleOutlined /> },
  done: { label: 'ทำแล้ว', color: 'success', icon: <CheckCircleOutlined /> },
}

export default function HaitPage() {
  const [statusMap, setStatusMap] = useState<Record<string, AssessStatus>>({})
  const [detailMap, setDetailMap] = useState<Record<string, string>>({})
  const [messageApi, contextHolder] = message.useMessage()

  const setStatus = (key: string, val: AssessStatus) =>
    setStatusMap(prev => ({ ...prev, [key]: val }))
  const setDetail = (key: string, val: string) =>
    setDetailMap(prev => ({ ...prev, [key]: val }))

  const doneCount = Object.values(statusMap).filter(s => s === 'done').length
  const partialCount = Object.values(statusMap).filter(s => s === 'partial').length
  const progress = Math.round(((doneCount + partialCount * 0.5) / subComponents.length) * 100)

  const handleSave = () => {
    console.log('Assessment saved:', { statusMap, detailMap })
    messageApi.success('บันทึกผลการประเมินเรียบร้อยแล้ว')
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      {contextHolder}
      <div className="min-h-screen w-full bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
              { title: 'HAIT - การจัดระบบบริการ IT' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl" style={{ color: '#a855f7' }}><FaMicrochip /></span>
                <Title level={2} style={{ color: '#a855f7', margin: 0 }}>
                  ข้อ 4 การจัดระบบบริการเทคโนโลยีสารสนเทศ
                </Title>
              </div>
              <Text type="secondary">
                มาตรฐาน HAIT — สมาคมเวชสารสนเทศไทย | บันทึกผลการประเมินและรายละเอียดหลักฐานแต่ละองค์ประกอบย่อย
              </Text>
            </div>

            {/* Description Card */}
            <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderLeft: '4px solid #a855f7' }}>
              <Title level={5} style={{ color: '#a855f7' }}>คำอธิบาย</Title>
              <Paragraph className="text-slate-300 mb-0">
                มีการจัดจุดรับแจ้งบริการ (Service Desk) มีการประชุมร่วมกับผู้ใช้ระบบเพื่อกำหนด Service Level Agreement – SLA
                ด้านที่สำคัญอย่างยิ่งต่อการใช้งานระบบของผู้ใช้ส่วนใหญ่แล้วประกาศรับประกันระยะเวลาการให้บริการให้รับทราบทั่วกัน
                มีระบบเก็บข้อมูลอุบัติการณ์ ระบบเก็บข้อมูลกิจกรรมการทำงานของเจ้าหน้าที่ฝ่าย IT ทุกคน
                มีการวิเคราะห์ SLA, อุบัติการณ์และกิจกรรมเพื่อนำผลการวิเคราะห์มาปรับปรุงการทำงานให้ดีขึ้นอย่างต่อเนื่อง
              </Paragraph>
            </Card>

            {/* Progress Summary */}
            <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12 }}>
              <Row gutter={24} align="middle">
                <Col xs={24} md={12}>
                  <Title level={5} className="mb-3">ความคืบหน้าการประเมิน</Title>
                  <Progress
                    percent={progress}
                    strokeColor="#a855f7"
                    railColor="#334155"
                    format={p => `${p}%`}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Row gutter={16} className="mt-4 md:mt-0">
                    <Col span={8}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{doneCount}</div>
                        <Text type="secondary">ทำแล้ว</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{partialCount}</div>
                        <Text type="secondary">บางส่วน</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {subComponents.length - doneCount - partialCount}
                        </div>
                        <Text type="secondary">ไม่ได้ทำ</Text>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card>

            {/* Sub-components Assessment */}
            {subComponents.map(item => {
              const currentStatus = statusMap[item.key] || 'none'
              return (
                <Card
                  key={item.key}
                  variant="borderless"
                  className="shadow-sm mb-4"
                  style={{
                    borderRadius: 12,
                    borderLeft: `4px solid ${currentStatus === 'done' ? '#22c55e' : currentStatus === 'partial' ? '#f59e0b' : '#475569'}`
                  }}
                >
                  <Row gutter={[24, 16]} align="top">
                    <Col xs={24} lg={16}>
                      <div className="flex items-start gap-3 mb-3">
                        <Tag color="purple" className="text-sm font-bold shrink-0 mt-0.5">{item.no}</Tag>
                        <div>
                          <Text strong className="text-slate-100 text-base leading-snug block">{item.title}</Text>
                          <Text type="secondary" className="text-sm mt-1 block">{item.description}</Text>
                        </div>
                      </div>

                      <div className="ml-8">
                        <Text type="secondary" className="text-xs block mb-2">{item.detailPrompt}</Text>
                        <TextArea
                          rows={3}
                          placeholder="อธิบายรายละเอียดและหลักฐาน..."
                          value={detailMap[item.key] || ''}
                          onChange={e => setDetail(item.key, e.target.value)}
                          className="bg-slate-800"
                        />
                      </div>
                    </Col>

                    <Col xs={24} lg={8}>
                      <div className="flex flex-col gap-3">
                        <div>
                          <Text type="secondary" className="text-xs block mb-2">สถานะ</Text>
                          <Radio.Group
                            value={currentStatus}
                            onChange={e => setStatus(item.key, e.target.value as AssessStatus)}
                            buttonStyle="solid"
                          >
                            <ConfigProvider theme={{ token: { colorPrimary: '#ef4444' } }}>
                              <Radio.Button value="none">ไม่ได้ทำ</Radio.Button>
                            </ConfigProvider>
                            <ConfigProvider theme={{ token: { colorPrimary: '#f59e0b' } }}>
                              <Radio.Button value="partial">บางส่วน</Radio.Button>
                            </ConfigProvider>
                            <ConfigProvider theme={{ token: { colorPrimary: '#22c55e' } }}>
                              <Radio.Button value="done">ทำแล้ว</Radio.Button>
                            </ConfigProvider>
                          </Radio.Group>
                        </div>

                        {item.linkedPage && (
                          <div>
                            <Text type="secondary" className="text-xs block mb-2">บันทึกข้อมูล</Text>
                            <Link href={item.linkedPage}>
                              <Button icon={<LinkOutlined />} type="default" size="small" className="w-full">
                                {item.linkedLabel}
                              </Button>
                            </Link>
                          </div>
                        )}

                        {currentStatus !== 'none' && (
                          <Tag
                            icon={statusLabel[currentStatus].icon}
                            color={statusLabel[currentStatus].color}
                            className="text-center"
                          >
                            {statusLabel[currentStatus].label}
                          </Tag>
                        )}
                      </div>
                    </Col>
                  </Row>
                </Card>
              )
            })}

            <Divider />
            <div className="flex justify-end gap-3">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                onClick={handleSave}
                style={{ backgroundColor: '#6B21A8', borderColor: '#6B21A8' }}
              >
                บันทึกผลการประเมิน
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
