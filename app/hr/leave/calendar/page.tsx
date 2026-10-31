'use client'
import React from 'react'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import { HomeOutlined } from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import LeaveCalendarCard from './LeaveCalendarCard'
import LeaveHeader from '../LeaveHeader'

export default function LeaveCalendarPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-4 md:p-8 max-w-350 mx-auto">
          <Breadcrumb
            items={[
              { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
              { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
              { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
              { title: 'ปฏิทินการลา' },
            ]}
            className="mb-4"
          />
          <LeaveHeader />
          <LeaveCalendarCard />
        </div>
      </div>
    </AppThemeProvider>
  )
}
