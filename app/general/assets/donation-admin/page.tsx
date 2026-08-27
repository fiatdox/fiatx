'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Modal,
  Form, Input, InputNumber, Select, Space, Table, Tabs, Switch, Popconfirm, Empty,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { FaUsersCog } from 'react-icons/fa'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  apiListDepartments, apiCreateDepartment, apiUpdateDepartment, apiDeleteDepartment,
  apiListCommitteeMembers, apiCreateCommitteeMember, apiUpdateCommitteeMember, apiDeleteCommitteeMember,
  apiUserOptions,
} from '../donationShared'

const { Title } = Typography

type Dept = { id: number; name: string; sort: number; active: boolean }
type CommitteeMember = { id: number; user_id: number; committee_position: string; sort: number; active: boolean; name: string; position_name?: string }
type UserOption = { id: number; name: string; position_name?: string }

const PageContent = () => {
  const { message } = App.useApp()

  const [depts, setDepts] = useState<Dept[]>([])
  const [members, setMembers] = useState<CommitteeMember[]>([])
  const [loading, setLoading] = useState(true)

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Dept | null>(null)
  const [deptForm] = Form.useForm()

  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null)
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [memberForm] = Form.useForm()

  const reload = async () => {
    try {
      const [d, m] = await Promise.all([apiListDepartments(), apiListCommitteeMembers()])
      setDepts(d.data ?? [])
      setMembers(m.data ?? [])
    } catch (e) {
      message.error((e as Error).message)
    }
  }
  useEffect(() => {
    Promise.all([reload()]).finally(() => setLoading(false))
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── หน่วยงาน ──
  const openDeptCreate = () => { setEditingDept(null); setDeptModalOpen(true) }
  const openDeptEdit = (d: Dept) => { setEditingDept(d); setDeptModalOpen(true) }
  const submitDept = async () => {
    const v = await deptForm.validateFields()
    try {
      if (editingDept) await apiUpdateDepartment(editingDept.id, v)
      else await apiCreateDepartment(v)
      message.success('บันทึกเรียบร้อย')
      setDeptModalOpen(false)
      await reload()
    } catch (e) { message.error((e as Error).message) }
  }
  const deleteDept = async (id: number) => {
    try { await apiDeleteDepartment(id); message.success('ลบเรียบร้อย'); await reload() }
    catch (e) { message.error((e as Error).message) }
  }

  // ── กรรมการ ──
  const openMemberCreate = () => {
    setEditingMember(null)
    setUserOptions([])
    setMemberModalOpen(true)
  }
  const openMemberEdit = (m: CommitteeMember) => {
    setEditingMember(m)
    setMemberModalOpen(true)
  }
  // ค้นหาผู้ใช้เมื่อพิมพ์ครบ 3 ตัวอักษร (debounce 350ms)
  const searchUsers = (search: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = search.trim()
    if (q.length < 3) { setUserSearching(false); setUserOptions([]); return }
    setUserSearching(true)
    searchTimer.current = setTimeout(async () => {
      try { const j = await apiUserOptions(q); setUserOptions(j.data ?? []) }
      catch { setUserOptions([]) }
      finally { setUserSearching(false) }
    }, 350)
  }
  const submitMember = async () => {
    const v = await memberForm.validateFields()
    try {
      if (editingMember) await apiUpdateCommitteeMember(editingMember.id, v)
      else await apiCreateCommitteeMember(v)
      message.success('บันทึกเรียบร้อย')
      setMemberModalOpen(false)
      await reload()
    } catch (e) { message.error((e as Error).message) }
  }
  const confirmDeleteMember = (m: CommitteeMember) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบกรรมการ "${m.name}" ออกจากคณะกรรมการรับบริจาคใช่หรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(async result => {
      if (!result.isConfirmed) return
      try { await apiDeleteCommitteeMember(m.id); message.success('ลบเรียบร้อย'); await reload() }
      catch (e) { message.error((e as Error).message) }
    })
  }

  const deptCols: ColumnsType<Dept> = [
    { title: 'ชื่อหน่วยงาน', dataIndex: 'name' },
    { title: 'ลำดับ', dataIndex: 'sort', width: 80 },
    { title: 'สถานะ', dataIndex: 'active', width: 100, render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'ใช้งาน' : 'ปิด'}</Tag> },
    {
      title: '', width: 100, align: 'center' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openDeptEdit(r)} />
          <Popconfirm title="ลบหน่วยงานนี้?" onConfirm={() => deleteDept(r.id)} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const memberCols: ColumnsType<CommitteeMember> = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'name' },
    { title: 'ตำแหน่ง (ในหน่วยงาน)', dataIndex: 'position_name' },
    { title: 'ตำแหน่งในคณะกรรมการ', dataIndex: 'committee_position' },
    { title: 'ลำดับ', dataIndex: 'sort', width: 80 },
    { title: 'สถานะ', dataIndex: 'active', width: 100, render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'ใช้งาน' : 'ปิด'}</Tag> },
    {
      title: '', width: 100, align: 'center' as const,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openMemberEdit(r)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteMember(r)} />
        </Space>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: 'งานทั่วไป' },
          { title: 'ตั้งค่าระบบรับบริจาค' },
        ]} />

        <div className="flex items-center gap-3 mb-6">
          <FaUsersCog style={{ fontSize: 24, color: '#a855f7' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ตั้งค่าระบบรับบริจาคครุภัณฑ์</Title>
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <Tabs
            defaultActiveKey="dept"
            items={[
              {
                key: 'dept',
                label: `หน่วยงานปลายทาง (${depts.length})`,
                children: (
                  <>
                    <div className="flex justify-end mb-3">
                      <Button type="primary" icon={<PlusOutlined />} onClick={openDeptCreate} style={{ background: '#a855f7', borderColor: '#a855f7' }}>เพิ่มหน่วยงาน</Button>
                    </div>
                    <Table columns={deptCols} dataSource={depts} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                      locale={{ emptyText: <Empty description="ยังไม่มีหน่วยงาน" /> }} />
                  </>
                ),
              },
              {
                key: 'committee',
                label: `คณะกรรมการรับบริจาค (${members.length})`,
                children: (
                  <>
                    <div className="flex justify-end mb-3">
                      <Button type="primary" icon={<PlusOutlined />} onClick={openMemberCreate} style={{ background: '#a855f7', borderColor: '#a855f7' }}>เพิ่มกรรมการ</Button>
                    </div>
                    <Table columns={memberCols} dataSource={members} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
                      locale={{ emptyText: <Empty description="ยังไม่มีกรรมการ" /> }} />
                  </>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Modal title={editingDept ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงาน'} open={deptModalOpen} onCancel={() => setDeptModalOpen(false)} onOk={submitDept} okText="บันทึก" cancelText="ยกเลิก" destroyOnHidden
        afterOpenChange={(open) => { if (open) { deptForm.resetFields(); deptForm.setFieldsValue(editingDept ?? { active: true, sort: 0 }) } }}>
        <Form form={deptForm} layout="vertical" className="mt-2">
          <Form.Item label="ชื่อหน่วยงาน" name="name" rules={[{ required: true, message: 'กรุณาระบุ' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="ลำดับการแสดง" name="sort">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="เปิดใช้งาน" name="active" valuePropName="checked">
            <Switch checkedChildren="ใช้" unCheckedChildren="ปิด" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingMember ? 'แก้ไขกรรมการ' : 'เพิ่มกรรมการ'} open={memberModalOpen} onCancel={() => setMemberModalOpen(false)} onOk={submitMember} okText="บันทึก" cancelText="ยกเลิก" destroyOnHidden
        afterOpenChange={(open) => { if (open) { memberForm.resetFields(); memberForm.setFieldsValue(editingMember ? { committee_position: editingMember.committee_position, sort: editingMember.sort, active: editingMember.active } : { active: true, sort: 0 }) } }}>
        <Form form={memberForm} layout="vertical" className="mt-2">
          {!editingMember && (
            <Form.Item label="เลือกผู้ใช้" name="user_id" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
              <Select
                showSearch filterOption={false} placeholder="พิมพ์ชื่ออย่างน้อย 3 ตัวอักษรเพื่อค้นหา"
                onSearch={searchUsers}
                loading={userSearching}
                notFoundContent={userSearching ? 'กำลังค้นหา…' : 'พิมพ์ชื่ออย่างน้อย 3 ตัวอักษร'}
                options={userOptions.map(u => ({ value: u.id, label: u.position_name ? `${u.name} — ${u.position_name}` : u.name }))}
              />
            </Form.Item>
          )}
          <Form.Item label="ตำแหน่งในคณะกรรมการ" name="committee_position" rules={[{ required: true, message: 'กรุณาระบุ' }]}>
            <Select options={[
              { value: 'ประธานกรรมการ', label: 'ประธานกรรมการ' },
              { value: 'กรรมการ', label: 'กรรมการ' },
              { value: 'กรรมการและเลขานุการ', label: 'กรรมการและเลขานุการ' },
            ]} />
          </Form.Item>
          <Form.Item label="ลำดับการแสดง" name="sort">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="เปิดใช้งาน" name="active" valuePropName="checked">
            <Switch checkedChildren="ใช้" unCheckedChildren="ปิด" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function DonationAdminPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#a855f7', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
