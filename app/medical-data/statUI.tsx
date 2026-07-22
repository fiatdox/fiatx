'use client'
import React from 'react'
import { Row, Col, Avatar, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { ACCENT } from './statShared'

const { Text } = Typography

// ช่องข้อมูลแบบ label เล็กด้านบน + ค่าด้านล่าง (อ่านง่ายกว่า Descriptions bordered)
export const Field = ({ label, children, full }: { label: React.ReactNode; children: React.ReactNode; full?: boolean }) => (
  <Col xs={24} sm={full ? 24 : 12}>
    <div style={{ fontSize: 12, color: 'var(--app-text-2)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 14, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{children ?? '-'}</div>
  </Col>
)

// การ์ดกล่องข้อมูลผู้ขอ + กริดรายละเอียด
export const InfoCard = ({ name, department, children }: { name: string; department?: string | null; children: React.ReactNode }) => (
  <div className="rounded-xl mb-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', padding: 16 }}>
    <div className="flex items-center gap-3 mb-4">
      <Avatar size={44} style={{ backgroundColor: ACCENT }} icon={<UserOutlined />} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{name}</div>
        <Text type="secondary" style={{ fontSize: 13 }}>{department || '-'}</Text>
      </div>
    </div>
    <Row gutter={[20, 14]}>{children}</Row>
  </div>
)
