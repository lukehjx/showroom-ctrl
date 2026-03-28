import { useState, useEffect } from 'react'
import { Card, Row, Col, Button, Typography, Space, Tag, Spin, message, Timeline } from 'antd'
import {
  SyncOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DesktopOutlined, AppstoreOutlined, CodeOutlined, VideoCameraOutlined,
} from '@ant-design/icons'
import { getSyncStatus, syncAll, syncType, getSyncLogs } from '../api'

const { Title, Text } = Typography

const mockStatus = {
  terminals: 8, resources: 124, commands: 45, scenes: 3,
  lastSync: '2024-01-15 18:30:00', status: 'idle',
}
const mockLogs = [
  { id: '1', type: '全量同步', time: '18:30:00', status: 'success', detail: '同步完成：8终端 124资源' },
  { id: '2', type: '资源同步', time: '17:00:00', status: 'success', detail: '新增12个资源' },
  { id: '3', type: '命令同步', time: '09:00:00', status: 'error', detail: '连接超时' },
]

export default function Sync() {
  const [status, setStatus] = useState<any>(mockStatus)
  const [logs, setLogs] = useState<any[]>(mockLogs)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const s: any = await getSyncStatus()
        if (s) setStatus({ ...mockStatus, ...s })
        const l: any = await getSyncLogs()
        if (l?.list) setLogs(l.list)
      } catch { /* use mock */ }
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      await syncAll()
      message.success('全量同步已启动')
    } catch { message.error('同步失败') }
    setSyncing(false)
  }

  const handleSyncType = async (type: string) => {
    setSyncing(true)
    try {
      await syncType(type)
      message.success(`${type} 同步已启动`)
    } catch { message.error('同步失败') }
    setSyncing(false)
  }

  const statCards = [
    { label: '终端数', value: status.terminals, icon: <DesktopOutlined />, color: '#1677ff' },
    { label: '资源数', value: status.resources, icon: <AppstoreOutlined />, color: '#52c41a' },
    { label: '命令数', value: status.commands, icon: <CodeOutlined />, color: '#faad14' },
    { label: '专场数', value: status.scenes, icon: <VideoCameraOutlined />, color: '#eb2f96' },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <SyncOutlined style={{ marginRight: 8, color: '#1677ff' }} />数据同步
          </Title>
          <Space>
            <Text style={{ color: '#888', fontSize: 12 }}>最后同步：{status.lastSync}</Text>
            <Button type="primary" icon={<SyncOutlined spin={syncing} />} onClick={handleSyncAll} loading={syncing}>
              一键全量同步
            </Button>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16}>
          {statCards.map((card) => (
            <Col span={6} key={card.label}>
              <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, color: card.color, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{card.value}</div>
                <Text style={{ color: '#888' }}>{card.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 单类型同步 */}
        <Card
          title={<Text style={{ color: '#fff' }}>按类型同步</Text>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        >
          <Space wrap>
            {[
              { key: 'terminals', label: '同步终端', color: '#1677ff' },
              { key: 'resources', label: '同步资源', color: '#52c41a' },
              { key: 'commands', label: '同步命令', color: '#faad14' },
              { key: 'scenes', label: '同步专场', color: '#eb2f96' },
            ].map((item) => (
              <Button key={item.key} onClick={() => handleSyncType(item.key)} loading={syncing}
                style={{ borderColor: item.color, color: item.color }}>
                {item.label}
              </Button>
            ))}
          </Space>
        </Card>

        {/* 同步日志 */}
        <Card
          title={<Text style={{ color: '#fff' }}>同步日志</Text>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        >
          <Timeline
            items={logs.map((log) => ({
              color: log.status === 'success' ? 'green' : 'red',
              dot: log.status === 'success' ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
              children: (
                <div>
                  <Space>
                    <Tag color={log.status === 'success' ? 'green' : 'red'}>{log.type}</Tag>
                    <Text style={{ color: '#888', fontSize: 12 }}>{log.time}</Text>
                  </Space>
                  <div><Text style={{ color: '#ccc', fontSize: 13 }}>{log.detail}</Text></div>
                </div>
              ),
            }))}
          />
        </Card>
      </Space>
    </Spin>
  )
}
