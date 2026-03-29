import { Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ConfigProvider, theme, Spin } from 'antd'
import {
  DashboardOutlined, AppstoreOutlined, ApartmentOutlined, UserOutlined,
  FileTextOutlined, ThunderboltOutlined, SettingOutlined, SoundOutlined
} from '@ant-design/icons'
import MonitorPage from './pages/Monitor'
import PresetsPage from './pages/Presets'
import RoutesPage from './pages/Routes'
import LogsPage from './pages/Logs'
import SetupPage from './pages/Setup'
import EmployeesPage from './pages/Employees'
import TourStopsPage from './pages/TourStops'
import ExhibitScriptsPage from './pages/ExhibitScripts'
import api from './api'

const NAV_ITEMS = [
  { path: '/', label: '监控大屏', icon: <DashboardOutlined /> },
  { path: '/presets', label: '接待套餐', icon: <AppstoreOutlined /> },
  { path: '/routes', label: '流程管理', icon: <ApartmentOutlined /> },
  { path: '/tour-stops', label: '导览路线', icon: <ApartmentOutlined /> },
  { path: '/exhibit-scripts', label: '展项讲解', icon: <SoundOutlined /> },
  { path: '/logs', label: '操作日志', icon: <FileTextOutlined /> },
  { path: '/employees', label: '人脸库', icon: <UserOutlined /> },
  { path: '/setup', label: '初始设置', icon: <SettingOutlined /> },
]

function Sidebar() {
  const location = useLocation()
  return (
    <div style={{
      width: 220, minHeight: '100vh', background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0,212,255,0.4)',
            fontSize: 18
          }}>
            <ThunderboltOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>展厅智控</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Showroom Control</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          return (
            <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8, marginBottom: 2,
                borderLeft: active ? '3px solid var(--accent-blue)' : '3px solid transparent',
                background: active ? 'linear-gradient(90deg, rgba(0,212,255,0.1), transparent)' : 'transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>系统连接状态</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['机器人', '中控系统', '企微Bot'].map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-dot online" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HomeRedirect() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    api.get('/api/config').then((res: any) => {
      const configs = res?.data
      if (Array.isArray(configs)) {
        const setupDone = configs.find((c: any) => c.key === 'setup.completed' && c.value === 'true')
        if (!setupDone) {
          navigate('/setup', { replace: true })
          return
        }
      }
      setChecking(false)
    }).catch(() => {
      setChecking(false)
    })
  }, [navigate])

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  return <MonitorPage />
}

function AppShell() {
  const location = useLocation()
  const isSetup = location.pathname === '/setup'

  if (isSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/presets" element={<PresetsPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/tour-stops" element={<TourStopsPage />} />
            <Route path="/exhibit-scripts" element={<ExhibitScriptsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00d4ff',
          colorBgBase: '#0a0e1a',
          colorBgContainer: 'rgba(15,22,40,0.85)',
          colorBgElevated: '#0f1628',
          colorBorder: 'rgba(0,212,255,0.15)',
          colorText: '#e8f4fd',
          colorTextSecondary: '#8fa3bc',
          borderRadius: 8,
          fontFamily: '"Inter","PingFang SC","Helvetica Neue",sans-serif',
        },
        components: {
          Button: { colorPrimaryHover: '#33ddff' },
          Table: { colorBgContainer: 'transparent' },
          Modal: { contentBg: '#0f1628', headerBg: '#0f1628' }
        }
      }}
    >
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ConfigProvider>
  )
}
