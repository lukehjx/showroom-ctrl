import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/Layout'
import Monitor from './pages/Monitor'
import RoutesPage from './pages/Routes'
import Exhibits from './pages/Exhibits'
import Terminals from './pages/Terminals'
import Sync from './pages/Sync'
import NavPositions from './pages/NavPositions'
import Commands from './pages/Commands'
import Config from './pages/Config'
import Logs from './pages/Logs'
import Presets from './pages/Presets'
import Schedules from './pages/Schedules'
import Reports from './pages/Reports'

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorBgBase: '#141414',
          borderRadius: 8,
        },
        components: {
          Card: { colorBgContainer: '#1a1a1a', colorBorderSecondary: '#2a2a2a' },
          Table: { colorBgContainer: '#1a1a1a', headerBg: '#1f1f1f' },
          Modal: { contentBg: '#1a1a1a', headerBg: '#1a1a1a' },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/monitor" replace />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="exhibits" element={<Exhibits />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="sync" element={<Sync />} />
            <Route path="nav-positions" element={<NavPositions />} />
            <Route path="commands" element={<Commands />} />
            <Route path="config" element={<Config />} />
            <Route path="logs" element={<Logs />} />
            <Route path="presets" element={<Presets />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
