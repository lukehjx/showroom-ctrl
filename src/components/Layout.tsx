import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Badge, Typography, Space, Drawer, Grid, Button } from 'antd'
import {
  DashboardOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  DesktopOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  CodeOutlined,
  SettingOutlined,
  FileTextOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store'
import { getStatus } from '../api'

const { Sider, Header, Content } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

const menuItems = [
  { key: '/monitor', icon: <DashboardOutlined />, label: '监控大屏' },
  { key: '/presets', icon: <GiftOutlined />, label: '接待套餐' },
  { key: '/routes', icon: <ApartmentOutlined />, label: '流程编辑器' },
  { key: '/exhibits', icon: <AppstoreOutlined />, label: '展项管理' },
  { key: '/terminals', icon: <DesktopOutlined />, label: '终端与资源' },
  { key: '/sync', icon: <SyncOutlined />, label: '数据同步' },
  { key: '/nav-positions', icon: <EnvironmentOutlined />, label: '点位映射' },
  { key: '/commands', icon: <CodeOutlined />, label: '命令库' },
  { key: '/schedules', icon: <ClockCircleOutlined />, label: '定时任务' },
  { key: '/reports', icon: <BarChartOutlined />, label: '接待报告' },
  { key: '/config', icon: <SettingOutlined />, label: '系统配置' },
  { key: '/logs', icon: <FileTextOutlined />, label: '操作日志' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { currentScene, connectionStatus, setCurrentScene, setConnectionStatus } = useAppStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const isTablet = screens.md && !screens.lg

  useEffect(() => {
    const poll = async () => {
      try {
        const data: any = await getStatus()
        setConnectionStatus('connected')
        if (data?.currentScene) setCurrentScene(data.currentScene)
      } catch {
        setConnectionStatus('disconnected')
      }
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [])

  const statusColor =
    connectionStatus === 'connected' ? '#52c41a' : connectionStatus === 'connecting' ? '#faad14' : '#ff4d4f'
  const statusText =
    connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中' : '未连接'

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  // Mobile layout with hamburger + bottom nav
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        {/* Mobile Header */}
        <Header
          style={{
            background: '#1a1a1a',
            borderBottom: '1px solid #2a2a2a',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 50,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20, color: '#fff' }} />}
            onClick={() => setDrawerOpen(true)}
            style={{ padding: 4 }}
          />
          <Text style={{ color: '#1677ff', fontSize: 15, fontWeight: 600 }}>
            展厅智控系统
          </Text>
          <Space size={8}>
            <Text style={{ color: '#888', fontSize: 11 }}>{currentScene}</Text>
            <Badge color={statusColor} />
          </Space>
        </Header>

        {/* Drawer navigation for mobile */}
        <Drawer
          title={
            <Text style={{ color: '#1677ff', fontWeight: 600 }}>展厅智控系统</Text>
          }
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={220}
          styles={{
            body: { padding: 0, background: '#1a1a1a' },
            header: { background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' },
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ background: '#1a1a1a', borderRight: 'none' }}
          />
          <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', marginTop: 8 }}>
            <Space>
              <Badge color={statusColor} />
              <Text style={{ color: statusColor, fontSize: 12 }}>{statusText}</Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text style={{ color: '#888', fontSize: 11 }}>当前专场：</Text>
              <Text style={{ color: '#1677ff', fontSize: 11, fontWeight: 500 }}>{currentScene}</Text>
            </div>
          </div>
        </Drawer>

        <Content
          style={{
            padding: 8,
            background: '#141414',
            minHeight: 'calc(100vh - 50px)',
            overflow: 'auto',
            paddingBottom: 16,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    )
  }

  // Tablet layout: icon-only sidebar (60px), hover expand handled by Sider collapsed
  if (isTablet) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Sider
          collapsible
          collapsed={true}
          collapsedWidth={60}
          trigger={null}
          theme="dark"
          style={{ background: '#1a1a1a', borderRight: '1px solid #2a2a2a' }}
          width={200}
        >
          <div
            style={{
              padding: '12px 4px',
              textAlign: 'center',
              borderBottom: '1px solid #2a2a2a',
            }}
          >
            <Typography.Title
              level={5}
              style={{ color: '#1677ff', margin: 0, fontSize: 10 }}
            >
              智控
            </Typography.Title>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ background: '#1a1a1a', borderRight: 'none' }}
            inlineCollapsed={true}
          />
        </Sider>
        <Layout style={{ background: '#141414' }}>
          <Header
            style={{
              background: '#1a1a1a',
              borderBottom: '1px solid #2a2a2a',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 50,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
              展厅智控管理后台
            </Text>
            <Space size={16}>
              <Space size={4}>
                <Text style={{ color: '#888', fontSize: 12 }}>当前专场：</Text>
                <Text style={{ color: '#1677ff', fontWeight: 500, fontSize: 12 }}>{currentScene}</Text>
              </Space>
              <Space size={4}>
                <Badge color={statusColor} />
                <Text style={{ color: statusColor, fontSize: 11 }}>{statusText}</Text>
              </Space>
            </Space>
          </Header>
          <Content
            style={{
              padding: 16,
              background: '#141414',
              minHeight: 'calc(100vh - 50px)',
              overflow: 'auto',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    )
  }

  // Desktop layout (original)
  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ background: '#1a1a1a', borderRight: '1px solid #2a2a2a' }}
        width={200}
      >
        <div
          style={{
            padding: '16px 8px',
            textAlign: 'center',
            borderBottom: '1px solid #2a2a2a',
          }}
        >
          <Typography.Title
            level={5}
            style={{ color: '#1677ff', margin: 0, fontSize: collapsed ? 10 : 15 }}
          >
            {collapsed ? '智控' : '展厅智控系统'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: '#1a1a1a', borderRight: 'none' }}
        />
      </Sider>
      <Layout style={{ background: '#141414' }}>
        <Header
          style={{
            background: '#1a1a1a',
            borderBottom: '1px solid #2a2a2a',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>
            展厅智控管理后台
          </Text>
          <Space size={24}>
            <Space>
              <Text style={{ color: '#888' }}>当前专场：</Text>
              <Text style={{ color: '#1677ff', fontWeight: 500 }}>{currentScene}</Text>
            </Space>
            <Space>
              <Badge color={statusColor} />
              <Text style={{ color: statusColor, fontSize: 12 }}>{statusText}</Text>
            </Space>
          </Space>
        </Header>
        <Content
          style={{
            padding: 24,
            background: '#141414',
            minHeight: 'calc(100vh - 56px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
