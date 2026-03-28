import { Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ConfigProvider, theme, Spin } from 'antd'
import {
  DashboardOutlined, AppstoreOutlined, ApartmentOutlined,
  RobotOutlined, FileTextOutlined, ThunderboltOutlined,
  MenuOutlined, CloseOutlined
} from '@ant-design/icons'
import MonitorPage from './pages/Monitor'
import PresetsPage from './pages/Presets'
import RoutesPage from './pages/Routes'
import RobotsPage from './pages/Robots'
import LogsPage from './pages/Logs'

const NAV_ITEMS = [
  { path: '/', label: '监控大屏', icon: <DashboardOutlined /> },
  { path: '/presets', label: '接待套餐', icon: <AppstoreOutlined /> },
  { path: '/routes', label: '流程管理', icon: <ApartmentOutlined /> },
  { path: '/robots', label: '机器人配置', icon: <RobotOutlined /> },
  { path: '/logs', label: '操作日志', icon: <FileTextOutlined /> },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation()
  return (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0,212,255,0.4)',
            fontSize: 18, flexShrink: 0
          }}>
            <ThunderboltOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>展厅智控</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Showroom Control</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
          return (
            <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }} onClick={onNavClick}>
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

      {/* Bottom status */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>系统连接状态</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['机器人', '中控系统', '企微Bot'].map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-dot online" style={{ animationDelay: `${i * 0.4}s` }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* ── Desktop Sidebar ── */}
      <div className="sidebar-desktop" style={{
        width: 220, minHeight: '100vh', background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0
      }}>
        <SidebarContent />
      </div>

      {/* ── Mobile Hamburger Button ── */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed', top: 12, left: 12, zIndex: 1001,
          width: 40, height: 40, borderRadius: 8,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glow)',
          color: 'var(--accent-blue)',
          fontSize: 18, cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}
      >
        <MenuOutlined />
      </button>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1002,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className="sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 240, zIndex: 1003,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-glow)',
          display: 'flex', flexDirection: 'column',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        {/* Close btn */}
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: 6,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid var(--border-glow)',
            color: 'var(--accent-blue)',
            fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <CloseOutlined />
        </button>
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </div>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: 0, minWidth: 0 }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Spin size="large" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<MonitorPage />} />
            <Route path="/presets" element={<PresetsPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/robots" element={<RobotsPage />} />
            <Route path="/logs" element={<LogsPage />} />
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
          colorTextBase: '#e8f4fd',
          borderRadius: 8,
          fontFamily: "'Inter', 'PingFang SC', 'Helvetica Neue', sans-serif",
        },
        components: {
          Table: { colorBgContainer: 'rgba(15,22,40,0.85)', headerBg: 'rgba(0,212,255,0.05)' },
          Card: { colorBgContainer: 'rgba(15,22,40,0.85)' },
          Modal: { contentBg: '#0f1628', headerBg: '#0f1628' },
          Select: { colorBgContainer: '#0f1628', colorBgElevated: '#0f1628' },
          Input: { colorBgContainer: '#0f1628' },
          Button: { colorBgContainer: 'transparent' },
          Drawer: { colorBgElevated: '#0f1628' },
        },
      }}
    >
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ConfigProvider>
  )
}
