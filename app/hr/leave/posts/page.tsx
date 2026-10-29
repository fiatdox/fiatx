'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card, Typography, Breadcrumb, Button, Modal, Form, Input, Switch, Space, App, Empty, Tooltip,
  Popconfirm, Tag, Upload, Segmented, AutoComplete, Checkbox, DatePicker, ConfigProvider, Table, Tabs,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  HomeOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PaperClipOutlined, LinkOutlined,
  PushpinFilled, EyeInvisibleOutlined, UploadOutlined, NotificationOutlined, FolderOpenOutlined,
  PictureOutlined, SettingOutlined, SearchOutlined, EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import thTH from 'antd/locale/th_TH'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import {
  type HrPost, type HrPostKind, KIND_LABEL, DEFAULT_CATEGORIES, NO_CATEGORY,
  fileIcon, fileUrl, fmtDate, isImage, popupPeriod,
} from '@/app/lib/hrPosts'

// locale ของ antd ไม่ได้แปลงปีในหัวปฏิทินเป็น พ.ศ. ให้
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }

const { Title, Text } = Typography

const KINDS: HrPostKind[] = ['news', 'document', 'popup']
const KIND_ICON: Record<HrPostKind, React.ReactNode> = {
  news: <NotificationOutlined />, document: <FolderOpenOutlined />, popup: <PictureOutlined />,
}
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png'
const IMAGE_ACCEPT = '.jpg,.jpeg,.png'
const MAX_MB = 20

interface FormValues {
  kind: HrPostKind
  title: string
  category?: string
  body?: string
  link_url?: string
  is_pinned: boolean
  is_published: boolean
  remove_file?: boolean
  show_range?: [dayjs.Dayjs | null, dayjs.Dayjs | null]
}

const HrPostsManageContent = () => {
  const { message } = App.useApp()
  const [posts, setPosts] = useState<HrPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<HrPostKind>('news')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    return fetch('/api/v1/hr-posts/manage')
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setLoadError(json.message || 'โหลดข้อมูลไม่สำเร็จ')
          return
        }
        setLoadError(null)
        setPosts(json.data ?? [])
      })
      .catch(() => setLoadError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const today = dayjs().format('YYYY-MM-DD')
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts.filter(p => p.kind === tab && (!q || `${p.title} ${p.category ?? ''} ${p.body ?? ''}`.toLowerCase().includes(q)))
  }, [posts, tab, search])
  const countOf = (k: HrPostKind) => posts.filter(p => p.kind === k).length
  const categoryOptions = useMemo(() => {
    const all = new Set([...DEFAULT_CATEGORIES, ...posts.map(p => p.category).filter((c): c is string => !!c)])
    return [...all].map(value => ({ value }))
  }, [posts])

  // ── เพิ่ม / แก้ไข ──────────────────────────────────────────────────────────
  const [form] = Form.useForm<FormValues>()
  const [editing, setEditing] = useState<HrPost | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const kindWatch = Form.useWatch('kind', form)
  const removeFileWatch = Form.useWatch('remove_file', form)

  const openCreate = (kind: HrPostKind) => {
    setEditing(null)
    setFileList([])
    form.resetFields()
    form.setFieldsValue({ kind, is_pinned: false, is_published: true, category: kind === 'document' ? DEFAULT_CATEGORIES[0] : undefined })
    setModalOpen(true)
  }

  const openEdit = (p: HrPost) => {
    setEditing(p)
    setFileList([])
    form.resetFields()
    form.setFieldsValue({
      kind: p.kind, title: p.title, category: p.category ?? undefined, body: p.body ?? undefined,
      link_url: p.link_url ?? undefined, is_pinned: p.is_pinned, is_published: p.is_published, remove_file: false,
      show_range: p.show_from || p.show_until ? [p.show_from ? dayjs(p.show_from) : null, p.show_until ? dayjs(p.show_until) : null] : undefined,
    })
    setModalOpen(true)
  }

  const save = async () => {
    const v = await form.validateFields()
    const fd = new FormData()
    fd.append('kind', v.kind)
    fd.append('title', v.title.trim())
    if (v.kind === 'document' && v.category) fd.append('category', v.category.trim())
    if (v.body) fd.append('body', v.body)
    if (v.link_url) fd.append('link_url', v.link_url.trim())
    fd.append('is_pinned', String(!!v.is_pinned))
    fd.append('is_published', String(!!v.is_published))
    const file = fileList[0]?.originFileObj
    if (v.kind === 'popup') {
      const keepsImage = !!editing?.has_file && isImage(editing.original_name) && !v.remove_file
      if (file ? !isImage(file.name) : !keepsImage) {
        message.error('ป๊อปอัปต้องแนบรูป jpg หรือ png')
        return
      }
      const [from, until] = v.show_range ?? [null, null]
      if (from) fd.append('show_from', from.format('YYYY-MM-DD'))
      if (until) fd.append('show_until', until.format('YYYY-MM-DD'))
    }
    if (file) fd.append('file', file)
    else if (v.remove_file) fd.append('remove_file', 'true')

    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/v1/hr-posts/${editing.id}` : '/api/v1/hr-posts', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกไม่สำเร็จ')
        return
      }
      message.success(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการแล้ว')
      setModalOpen(false)
      setTab(v.kind)
      load()
    } catch {
      message.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: HrPost) => {
    const res = await fetch(`/api/v1/hr-posts/${p.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.success) {
      message.error(json.message || 'ลบไม่สำเร็จ')
      return
    }
    message.success('ลบรายการแล้ว')
    load()
  }

  const columns = [
    {
      title: 'หัวข้อ', key: 'title',
      render: (_: unknown, p: HrPost) => (
        <div className="flex items-start gap-3" style={{ minWidth: 220 }}>
          {p.has_file && isImage(p.original_name) ? (
            <a href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก API ผ่าน cookie ใช้ next/image ไม่ได้ */}
              <img src={fileUrl(p.id)} alt="" loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            </a>
          ) : (
            <span style={{ fontSize: 20, lineHeight: '24px', flexShrink: 0 }}>{p.has_file ? fileIcon(p.original_name) : p.link_url ? <LinkOutlined /> : KIND_ICON[p.kind]}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <Text strong>{p.title}</Text>
            {p.body && <div><Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 420 }}>{p.body}</Text></div>}
            <Space size={8} wrap style={{ fontSize: 12 }}>
              {p.has_file && (
                <a href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer"><PaperClipOutlined /> {p.original_name}</a>
              )}
              {p.link_url && <a href={p.link_url} target="_blank" rel="noopener noreferrer"><LinkOutlined /> ลิงก์</a>}
            </Space>
          </div>
        </div>
      ),
    },
    ...(tab === 'document' ? [{
      title: 'หมวด', key: 'category', width: 160,
      render: (_: unknown, p: HrPost) => <Tag>{p.category || NO_CATEGORY}</Tag>,
    }] : []),
    ...(tab === 'popup' ? [{
      title: 'ช่วงแสดง', key: 'period', width: 220,
      render: (_: unknown, p: HrPost) => {
        const { text, state } = popupPeriod(p, today)
        return (
          <div>
            {state && <Tag color={state.color}>{state.label}</Tag>}
            <div><Text type="secondary" style={{ fontSize: 12 }}>{text}</Text></div>
          </div>
        )
      },
    }] : []),
    {
      title: 'สถานะ', key: 'status', width: 150,
      render: (_: unknown, p: HrPost) => (
        <Space size={4} wrap>
          {p.is_published ? <Tag color="success" icon={<EyeOutlined />}>เผยแพร่</Tag> : <Tag icon={<EyeInvisibleOutlined />}>ไม่เผยแพร่</Tag>}
          {p.is_pinned && <Tag color="gold" icon={<PushpinFilled />}>{p.kind === 'popup' ? 'แสดงก่อน' : 'ปักหมุด'}</Tag>}
        </Space>
      ),
    },
    {
      title: 'แก้ไขล่าสุด', key: 'updated', width: 170,
      render: (_: unknown, p: HrPost) => (
        <div>
          <Text style={{ fontSize: 12 }}>{fmtDate(p.updated_at)}</Text>
          {p.updated_by_name && <div><Text type="secondary" style={{ fontSize: 12 }}>{p.updated_by_name}</Text></div>}
        </div>
      ),
    },
    {
      title: '', key: 'action', width: 84, align: 'center' as const,
      render: (_: unknown, p: HrPost) => (
        <Space size={0}>
          <Tooltip title="แก้ไข">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} />
          </Tooltip>
          <Popconfirm title="ลบรายการนี้?" description={p.title} okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}>
            <Tooltip title="ลบ">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'จัดการข่าว / เอกสาร / ป๊อปอัป' },
          ]}
          className="mb-4"
        />

        <Card style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                <SettingOutlined className="text-2xl text-white" />
              </div>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>จัดการข่าว / เอกสาร / ป๊อปอัป</Title>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                  รายการที่เผยแพร่จะแสดงในหน้า “ประชาสัมพันธ์ / ระเบียบการลา” ป๊อปอัปเด้งเมื่อผู้ใช้เข้าหน้าแรก
                </Text>
              </div>
            </div>
            <Button href="/hr/leave" icon={<EyeOutlined />} style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              ดูหน้าที่ผู้ใช้เห็น
            </Button>
          </div>
        </Card>

        <Card style={{ borderRadius: 12, border: 'none' }}>
          {loadError ? <Empty description={loadError} /> : (
            <>
              <Tabs
                activeKey={tab}
                onChange={k => setTab(k as HrPostKind)}
                items={KINDS.map(k => ({ key: k, label: <span>{KIND_ICON[k]} {KIND_LABEL[k]} ({countOf(k)})</span> }))}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="ค้นหาหัวข้อ / หมวด / รายละเอียด"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ maxWidth: 320 }}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(tab)}>เพิ่ม{KIND_LABEL[tab]}</Button>
              </div>
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                size="middle"
                scroll={{ x: 760 }}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                locale={{ emptyText: <Empty description={search ? 'ไม่พบรายการที่ค้นหา' : `ยังไม่มี${KIND_LABEL[tab]}`} /> }}
              />
            </>
          )}
        </Card>

        <Modal
          open={modalOpen}
          title={editing ? 'แก้ไขรายการ' : `เพิ่ม${KIND_LABEL[kindWatch ?? 'news']}`}
          onCancel={() => setModalOpen(false)}
          onOk={save}
          okText="บันทึก"
          cancelText="ยกเลิก"
          confirmLoading={saving}
          width={640}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item name="kind" label="ประเภท">
              <Segmented options={KINDS.map(k => ({ value: k, label: KIND_LABEL[k] }))} />
            </Form.Item>
            <Form.Item name="title" label="หัวข้อ" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุหัวข้อ' }, { max: 300 }]}>
              <Input placeholder={kindWatch === 'document' ? 'เช่น ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555' : 'หัวข้อ'} />
            </Form.Item>
            {kindWatch === 'document' && (
              <Form.Item name="category" label="หมวดเอกสาร" tooltip="พิมพ์หมวดใหม่ได้">
                <AutoComplete options={categoryOptions} placeholder="เลือกหรือพิมพ์หมวด" filterOption={(input, opt) => String(opt?.value ?? '').includes(input)} />
              </Form.Item>
            )}
            <Form.Item name="body" label={kindWatch === 'document' ? 'คำอธิบาย' : 'รายละเอียด'}>
              <Input.TextArea autoSize={{ minRows: kindWatch === 'news' ? 5 : 2, maxRows: 14 }} maxLength={20000} />
            </Form.Item>
            <Form.Item
              name="link_url"
              label="ลิงก์ภายนอก"
              rules={[{ pattern: /^https?:\/\//i, message: 'ต้องขึ้นต้นด้วย http:// หรือ https://' }]}
            >
              <Input prefix={<LinkOutlined />} placeholder="https://" />
            </Form.Item>
            {kindWatch === 'popup' && (
              <Form.Item name="show_range" label="ช่วงวันที่แสดง" extra="เว้นว่าง = แสดงตลอดจนกว่าจะปิดเผยแพร่ ผู้ใช้กด “ไม่ต้องแสดงอีกวันนี้” ได้">
                <DatePicker.RangePicker format="D MMM BBBB" allowEmpty={[true, true]} className="w-full" placeholder={['วันเริ่ม', 'วันสิ้นสุด']} />
              </Form.Item>
            )}
            <Form.Item
              label={kindWatch === 'popup' ? 'รูปป๊อปอัป' : 'ไฟล์แนบ'}
              required={kindWatch === 'popup'}
              extra={kindWatch === 'popup'
                ? `รูป jpg หรือ png ไม่เกิน ${MAX_MB}MB แนะนำแนวนอนหรือสี่เหลี่ยม`
                : `PDF, Word, Excel, PowerPoint หรือรูปภาพ ไม่เกิน ${MAX_MB}MB รูปภาพในข่าวจะแสดงในเนื้อข่าว`}
            >
              {editing?.has_file && fileList.length === 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <a href={fileUrl(editing.id)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: removeFileWatch ? 'line-through' : undefined }}>
                    <PaperClipOutlined /> {editing.original_name}
                  </a>
                  <Form.Item name="remove_file" valuePropName="checked" noStyle>
                    <Checkbox>เอาไฟล์นี้ออก</Checkbox>
                  </Form.Item>
                </div>
              )}
              <Upload
                accept={kindWatch === 'popup' ? IMAGE_ACCEPT : ACCEPT}
                maxCount={1}
                fileList={fileList}
                beforeUpload={file => {
                  if (file.size > MAX_MB * 1024 * 1024) {
                    message.error(`ไฟล์มีขนาดเกิน ${MAX_MB}MB`)
                    return Upload.LIST_IGNORE
                  }
                  return false
                }}
                onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              >
                <Button icon={<UploadOutlined />}>{editing?.has_file ? 'เลือกไฟล์ใหม่แทน' : 'เลือกไฟล์'}</Button>
              </Upload>
            </Form.Item>
            <Space size={32} wrap>
              <Form.Item name="is_pinned" label={kindWatch === 'popup' ? 'แสดงก่อนป๊อปอัปอื่น' : 'ปักหมุดไว้บนสุด'} valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
              <Form.Item name="is_published" label="เผยแพร่" valuePropName="checked" style={{ marginBottom: 0 }} tooltip="ปิดไว้ = ผู้ใช้ทั่วไปไม่เห็น เก็บไว้เป็นร่างได้">
                <Switch />
              </Form.Item>
            </Space>
          </Form>
        </Modal>
      </div>
    </div>
  )
}

export default function HrPostsManagePage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <ConfigProvider locale={TH_LOCALE}>
        <HrPostsManageContent />
      </ConfigProvider>
    </AppThemeProvider>
  )
}
