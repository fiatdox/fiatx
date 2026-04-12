'use client'
import React, { useState } from 'react'
import {
  Button,
  ConfigProvider,
  Card,
  Tag,
  Avatar,
  Drawer,
  Input,
  Breadcrumb,
  theme,
  Table,
  Space,
  Empty,
  Tooltip,
  Select
} from 'antd'
import {
  SearchOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  SolutionOutlined,
  PlusOutlined,
  ApartmentOutlined,
  CrownOutlined,
  DeleteOutlined,
  SwapOutlined,
  AlertOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'

// --- Types ---
interface MinimalEmployee {
  id: number
  title: string
  firstName: string
  lastName: string
  position: string
  avatar?: string
}

type SlotType = 'ผู้อำนวยการ' | 'หัวหน้ากลุ่มภารกิจ' | 'หัวหน้ากลุ่มงาน' | 'หัวหน้าหน่วยงาน';

interface OrgSlot {
  id: string;
  type: SlotType;
  title: string;
  employeeId: number | null; 
  actingEmployeeId: number | null; 
  groupName: string;
}

// --- Mock Data ---
const MOCK_EMPLOYEES: MinimalEmployee[] = [
  { id: 1, title: 'นายแพทย์', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นายแพทย์เชี่ยวชาญ' },
  { id: 2, title: 'นางสาว', firstName: 'สมหญิง', lastName: 'รักเรียน', position: 'พยาบาลวิชาชีพชำนาญการ' },
  { id: 3, title: 'นาย', firstName: 'วิชัย', lastName: 'กล้าหาญ', position: 'เภสัชกรชำนาญการพิเศษ' },
  { id: 4, title: 'นาง', firstName: 'มานี', lastName: 'มีตา', position: 'นักจัดการงานทั่วไป' },
  { id: 5, title: 'นาย', firstName: 'ปิติ', lastName: 'ยินดี', position: 'นักวิชาการสาธารณสุข' },
];

const INITIAL_SLOTS: OrgSlot[] = [
  { id: 'dir-1', type: 'ผู้อำนวยการ', title: 'ผู้อำนวยการโรงพยาบาล', employeeId: 1, actingEmployeeId: null, groupName: 'ผู้บริหารสูงสุด' },
  
  // กลุ่มภารกิจ
  { id: 'm-nursing', type: 'หัวหน้ากลุ่มภารกิจ', title: 'หัวหน้ากลุ่มภารกิจ', employeeId: null, actingEmployeeId: 3, groupName: 'กลุ่มภารกิจด้านการพยาบาล' },
  { id: 'm-primary', type: 'หัวหน้ากลุ่มภารกิจ', title: 'หัวหน้ากลุ่มภารกิจ', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มภารกิจด้านบริการปฐมภูมิ' },

  // กลุ่มงาน
  { id: 'w-inpatient', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: 2, actingEmployeeId: null, groupName: 'กลุ่มงานการพยาบาลผู้ป่วยใน' },
  { id: 'w-outpatient', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มงานการพยาบาลผู้ป่วยนอก' },
  { id: 'w-er', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มงานอุบัติเหตุและฉุกเฉิน' },
  
  // หน่วยงาน
  { id: 'u-medward', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: 2, actingEmployeeId: null, groupName: 'หอผู้ป่วยอายุรกรรม' },
  { id: 'u-surgward', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: null, actingEmployeeId: null, groupName: 'หอผู้ป่วยศัลยกรรม' },
  { id: 'u-icu', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: null, actingEmployeeId: null, groupName: 'หอผู้ป่วยหนัก (ICU)' },
];

export default function SupervisorPage() {
  const [slots, setSlots] = useState<OrgSlot[]>(INITIAL_SLOTS);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [activeRef, setActiveRef] = useState<{ id: string, mode: 'main' | 'acting' } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [slotSearchText, setSlotSearchText] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const handleOpenAssign = (slotId: string, mode: 'main' | 'acting') => {
    setActiveRef({ id: slotId, mode });
    setSearchText('');
    setIsAssignOpen(true);
  };

  const handleAssignEmployee = (employeeId: number | null) => {
    if (!activeRef) return;
    setSlots(slots.map(s => 
      s.id === activeRef.id 
        ? { ...s, [activeRef.mode === 'main' ? 'employeeId' : 'actingEmployeeId']: employeeId } 
        : s
    ));
    setIsAssignOpen(false);
    setActiveRef(null);
  };

  const getEmployee = (id: number | null) => MOCK_EMPLOYEES.find(e => e.id === id);

  const filteredSlots = slots.filter(slot => {
    // 1. Level Filter
    if (filterLevel !== 'all') {
      if (filterLevel === 'ภารกิจ' && !slot.type.includes('ภารกิจ')) return false;
      if (filterLevel === 'กลุ่มงาน' && !slot.type.includes('กลุ่มงาน')) return false;
      if (filterLevel === 'หน่วยงาน' && !slot.type.includes('หน่วยงาน')) return false;
    }

    // 2. Search Text Filter
    const emp = getEmployee(slot.employeeId);
    const actingEmp = getEmployee(slot.actingEmployeeId);
    const searchString = `${slot.title} ${slot.groupName} ${emp ? `${emp.firstName} ${emp.lastName}` : ''} ${actingEmp ? `${actingEmp.firstName} ${actingEmp.lastName}` : ''}`.toLowerCase();
    return searchString.includes(slotSearchText.toLowerCase());
  });

  const renderEmpCell = (empId: number | null, slotId: string, mode: 'main' | 'acting') => {
    const emp = getEmployee(empId);
    const isActing = mode === 'acting';
    
    if (!emp) return (
      <div 
        className="flex items-center gap-2 text-slate-500 italic text-xs py-1 group cursor-pointer hover:text-emerald-400 transition-colors"
        onClick={() => handleOpenAssign(slotId, mode)}
      >
        <Avatar size="small" icon={<PlusOutlined />} className="bg-slate-800 scale-75 group-hover:bg-emerald-900" />
        <span>คลิกเพื่อแต่งตั้ง{isActing ? 'รักษาการ' : ''}</span>
      </div>
    );

    return (
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <Avatar src={emp.avatar} size={28} icon={<UserOutlined />} className={isActing ? "bg-amber-600/50" : "bg-[#006a5a]"} />
          <div className="overflow-hidden">
            <div className="text-slate-200 font-medium text-xs truncate max-w-[120px]">{emp.firstName} {emp.lastName}</div>
            <div className="text-[9px] text-slate-500 uppercase truncate max-w-[120px] leading-tight">{emp.position}</div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <Button 
            size="small" 
            type="text" 
            danger 
            icon={<DeleteOutlined className="text-[10px]" />} 
            onClick={(e) => {
              e.stopPropagation();
              setActiveRef({ id: slotId, mode });
              handleAssignEmployee(null);
            }} 
          />
          <Button 
            size="small" 
            type="text" 
            className="text-emerald-400" 
            icon={<SwapOutlined className="text-[10px]" />} 
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAssign(slotId, mode);
            }} 
          />
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: 'ระดับ / สังกัด',
      key: 'level',
      width: '20%',
      render: (_: any, record: OrgSlot) => (
        <Space orientation="vertical" size={0}>
          <Tag color={
            record.type === 'ผู้อำนวยการ' ? 'gold' : 
            record.type === 'หัวหน้ากลุ่มภารกิจ' ? 'blue' : 
            record.type === 'หัวหน้ากลุ่มงาน' ? 'emerald' : 'purple'
          } className="m-0 border-0 rounded-full px-2 text-[9px] font-bold uppercase tracking-tighter">
            {record.type}
          </Tag>
          <div className="text-slate-400 text-[10px] mt-1 font-medium truncate max-w-[150px]" title={record.groupName}>{record.groupName}</div>
        </Space>
      )
    },
    {
      title: 'ตำแหน่งทางบริหาร',
      dataIndex: 'title',
      key: 'title',
      width: '18%',
      render: (text: string) => <span className="text-slate-200 font-semibold text-xs">{text}</span>
    },
    {
      title: <div className="flex items-center gap-2"><CrownOutlined className="text-emerald-500" /> ผู้ดำรงตำแหน่งตัวจริง</div>,
      key: 'main',
      width: '28%',
      render: (_: any, record: OrgSlot) => renderEmpCell(record.employeeId, record.id, 'main')
    },
    {
      title: <div className="flex items-center gap-2"><AlertOutlined className="text-amber-500" /> ผู้รักษาการ / แทน</div>,
      key: 'acting',
      width: '28%',
      render: (_: any, record: OrgSlot) => renderEmpCell(record.actingEmployeeId, record.id, 'acting')
    },
    {
      title: '',
      key: 'actions',
      width: '6%',
      align: 'right' as const,
      render: (_: any, record: OrgSlot) => (
        <Tooltip title="ตำแหน่งรวมทั้งตัวจริงและรักษาการ">
          <ApartmentOutlined className="text-slate-700" />
        </Tooltip>
      )
    }
  ];

  const filteredEmployees = MOCK_EMPLOYEES.filter(emp => 
    `${emp.title}${emp.firstName} ${emp.lastName} ${emp.position}`.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeSlot = slots.find(s => s.id === activeRef?.id);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#006a5a', borderRadius: 8, fontFamily: 'var(--font-sarabun)' },
      }}
    >
      <div className="min-h-screen bg-slate-900 text-slate-200 pb-12">
        <Navbar />
        <div className="p-6 md:p-8 w-full">
          {/* Header */}
          <div className="mb-8">
            <Breadcrumb
              items={[
                { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
                { href: '/hr/users', title: <><SolutionOutlined /> ทรัพยากรบุคคล</> },
                { href: '/hr/settings', title: <><SettingOutlined /> ตั้งค่าระบบ</> },
                { title: 'โครงสร้างผู้บริหารและหัวหน้างาน' },
              ]}
              className="mb-4"
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#006a5a] to-emerald-700 flex items-center justify-center text-white text-2xl shadow-lg">
                  <ApartmentOutlined />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-200 m-0">ผังผู้บริหารและหัวหน้า</h1>
                  <p className="text-slate-400 mt-1 text-sm">การบริหารแบบ Slot: 1 แถวกำหนดได้ทั้ง "ตัวจริง" และ "รักษาการ"</p>
                </div>
              </div>
              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                <Select
                  value={filterLevel}
                  onChange={setFilterLevel}
                  style={{ width: 200 }}
                  className="w-full sm:w-40"
                  options={[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'ภารกิจ', label: 'กลุ่มภารกิจ' },
                    { value: 'กลุ่มงาน', label: 'กลุ่มงาน' },
                    { value: 'หน่วยงาน', label: 'หน่วยงาน/หอผู้ป่วย' },
                  ]}
                  placeholder="ระดับ"
                />
                <Input
                  placeholder="ค้นหาตำแหน่ง หรือรายชื่อ..."
                  prefix={<SearchOutlined className="text-slate-500" />}
                  value={slotSearchText}
                  onChange={e => setSlotSearchText(e.target.value)}
                  allowClear
                  className="bg-[#0f172a] border-slate-700 h-10 w-full md:w-72"
                />
              </div>
            </div>
          </div>

          <Card className="bg-[#0f172a] border-slate-700 overflow-hidden shadow-2xl" styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={filteredSlots}
              columns={columns}
              rowKey="id"
              pagination={false}
              className="supervisor-table"
              locale={{ 
                emptyText: <Empty description="ไม่พบตำแหน่งบริหารที่ค้นหา" image={Empty.PRESENTED_IMAGE_SIMPLE} /> 
              }}
            />
          </Card>
          
          <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex gap-3">
            <Tooltip title="ข้อมูลตัวจริง">
              <CrownOutlined className="text-emerald-500 text-xl" />
            </Tooltip>
            <Tooltip title="ข้อมูลรักษาการ">
               <AlertOutlined className="text-amber-500 text-xl" />
            </Tooltip>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              <strong>โครงสร้างการบริหาร:</strong> แบ่งคอลัมน์ชัดเจนระหว่างผู้ดำรงตำแหน่งตามประกาศ (ตัวจริง) และผู้ได้รับมอบหมายให้ปฏิบัติหน้าที่แทน (รักษาการ) 
              เพื่อให้ระบบ Workflow อนุมัติสามารถตรวจสอบความถูกต้องได้จากฐานข้อมูลเดียวกัน
            </div>
          </div>
        </div>

        {/* Drawer: Assign Employee */}
        <Drawer
          title={
            <div className="flex flex-col">
              <span className="text-slate-200 font-bold">แต่งตั้งบุคลากร</span>
              <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wide">
                ตำแหน่ง: {activeSlot?.title} ({activeRef?.mode === 'main' ? 'ตัวจริง' : 'รักษาการ'})
              </span>
            </div>
          }
          size="large"
          onClose={() => setIsAssignOpen(false)}
          open={isAssignOpen}
          styles={{ 
            body: { backgroundColor: '#0f172a', padding: 0 }, 
            header: { backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 24px' } 
          }}
        >
          <div className="p-4 border-b border-slate-700 bg-[#1e293b]">
            <Input
              placeholder="ค้นหาชื่อ หรือ ตำแหน่ง..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="bg-[#0f172a] border-slate-700 text-slate-200 h-10"
              allowClear
            />
          </div>
          <div className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            {filteredEmployees.map(emp => (
              <div 
                key={emp.id}
                className="group flex items-center gap-3 p-4 hover:bg-[#1e293b] cursor-pointer rounded-lg border-b border-slate-800 transition-all last:border-0"
                onClick={() => handleAssignEmployee(emp.id)}
              >
                <Avatar src={emp.avatar} icon={<UserOutlined />} className="bg-[#006a5a]" />
                <div className="flex-1">
                  <div className="text-slate-200 font-medium group-hover:text-emerald-400 transition-colors text-sm">{emp.firstName} {emp.lastName}</div>
                  <div className="text-[11px] text-slate-500">{emp.position}</div>
                </div>
                <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="bg-emerald-500/20 text-emerald-500 text-[9px] px-2 py-0.5 rounded uppercase font-bold">กดเพื่อเลือก</div>
                </div>
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center text-slate-500 py-12">ไม่พบรายชื่อบุคลากรที่ต้องการ</div>
            )}
          </div>
        </Drawer>

        <style jsx global>{`
          .supervisor-table .ant-table {
            background: transparent !important;
            font-size: 13px;
          }
          .supervisor-table .ant-table-thead > tr > th {
            background: #1e293b !important;
            border-bottom: 2px solid #334155 !important;
            color: #94a3b8 !important;
            font-weight: 600 !important;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
            padding: 12px 16px !important;
          }
          .supervisor-table .ant-table-tbody > tr > td {
            border-bottom: 1px solid #1e293b !important;
            padding: 10px 16px !important;
          }
          .supervisor-table .ant-table-tbody > tr:last-child > td {
            border-bottom: none !important;
          }
          .supervisor-table .ant-table-tbody > tr:hover > td {
            background: rgba(255, 255, 255, 0.02) !important;
          }
          .supervisor-table .ant-table-cell {
            vertical-align: middle !important;
          }
        `}</style>
      </div>
    </ConfigProvider>
  )
}
