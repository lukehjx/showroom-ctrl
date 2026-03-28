import { useState, useEffect, useRef } from 'react'
import {
  Card, Row, Col, Button, Tag, Typography, Space, Spin, Progress,
  Badge, Modal, Select, message, Popconfirm,
} from 'antd'
import {
  PlayCircleOutlined, PoweroffOutlined, SwapOutlined, ReloadOutlined,
  RobotOutlined, VideoCameraOutlined, TeamOutlined, ClockCircleOutlined,
  WifiOutlined, GiftOutlined, EyeOutlined, DashboardOutlined,
} from '@ant-design/icons'
import {
  getLogs, openHall, closeHall, switchScene, resetAll,
  getScenes, getStatus, getDevicesStatus, getCurrentReport,
  getPresets, triggerPreset,
} from '../api'

const { Title, Text } = Typography
const { Option } = Select

const PRESET_ICONS: Record<string, string> = {
  vip: '👑', group: '👥', kids: '🎈', quick: '⚡', full: '🏛️', custom: '🎯',
}

export default function Monitor() {
  const [status, setStatus] = useState<any>({
    currentScene: '—', robotStatus: '待机中', sessionStatus: '空闲', flowRunning: false,
  })
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [scenes, setScenes] = useState<string[]>([])
  const [switchModalVisible, setSwitchModalVisible] = useState(false)
  const [selectedScene, setSelectedScene] = useState('')
  const [devices, setDevices] = useState<any[]>([])
  const [currentReport, setCurrentReport] = useState<any>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const pollStatus = async () => {
    try {
      const data: any = await getStatus()
      if (data) setStatus((prev: any) => ({ ...prev, ...data }))
    } catch { /* use mock */ }
  }

  const pollLogs = async () => {
    try {
      const data: any = await getLogs({ limit: 80 })
      if (data?.list) setLogs(data.list)
    } catch { /* keep */ }
  }

  const pollDevices = async () => {
    try {
      const data: any = await getDevicesStatus()
      if (data?.list) setDevices(data.list)
    } catch {
      setDevices([
        { id: '1', name: 'LED主屏', ip: '192.168.1.101', online: true },
        { id: '2', name: '副屏A', ip: '192.168.1.102', online: true },
        { id: '3', name: '数字人终端', ip: '192.168.1.103', online: false },
        { id: '4', name: '音箱控制器', ip: '192.168.1.104', online: true },
      ])
    }
  }

  const fetchCurrentReport = async () => {
    try {
      const data: any = await getCurrentReport()
      setCurrentReport(data)
    } catch { /* no report */ }
  }

  const fetchPresets = async () => {
    try {
      const data: any = await getPresets()
      setPresets(data?.list || data || [])
    } catch {
      setPresets([
        { id: '1', name: 'VIP接待', description: '专属VIP参观路线', icon: 'vip', color: '#faad14' },
        { id: '2', name: '团队参观', description: '标准团队参观流程', icon: 'group', color: '#1677ff' },
        { id: '3', name: '快速参观', description: '30分钟精华路线', icon: 'quick', color: '#52c41a' },
      ])
    }
  }

  useEffect(() => {
    pollStatus(); pollLogs(); pollDevices(); fetchCurrentReport(); fetchPresets()
    getScenes().then((d: any) => {
      if (d?.list) setScenes(d.list.map((s: any) => s.name || s))
    }).catch(() => setScenes(['主展厅', '副展厅', '特展区']))

    const t1 = setInterval(pollStatus, 5000)
    const t2 = setInterval(pollLogs, 3000)
    const t3 = setInterval(pollDevices, 60000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const handleOpenHall = async () => {
    setLoading(true)
    try { await openHall(); message.success('展厅已开启') }
    catch { message.error('操作失败') }
    setLoading(false)
  }

  const handleCloseHall = async () => {
    setLoading(true)
    try { await closeHall(); message.success('展厅已关闭') }
    catch { message.error('操作失败') }
    setLoading(false)
  }

  const handleSwitchScene = async () => {
    if (!selectedScene) { message.warning('请选择专场'); return }
    setLoading(true)
    try {
      await switchScene(selectedScene)
      message.success(`已切换到 ${selectedScene}`)
      setSwitchModalVisible(false)
    } catch { message.error('切换失败') }
    setLoading(false)
  }

  const handleReset = async () => {
    setLoading(true)
    try { await resetAll(); message.success('一键复位成功') }
    catch { message.error('复位失败') }
    setLoading(false)
  }

  const handleTriggerPreset = async (preset: any) => {
    setTriggeringId(preset.id)
    try {
      await triggerPreset(preset.id)
      message.success(`「${preset.name}」已启动`)
    } catch { message.error('启动失败') }
    setTriggeringId(null)
  }

  const mockLogs = [
    { id: '1', time: '21:00:01', action: '切换专场', source: '系统', result: '成功切换到主展厅', status: 'success' },
    { id: '2', time: '21:00:05', action: '机器人导航', source: '流程', result: '导航至展项A', status: 'success' },
    { id: '3', time: '21:00:12', action: '投放资源', source: '展项', result: '投放视频资源', status: 'success' },
    { id: '4', time: '21:00:20', action: 'TCP发送', source: '流程', result: '连接失败', status: 'error' },
  ]
  const displayLogs = logs.length > 0 ? logs : mockLogs
  const onlineCount = devices.filter((d) => d.online).length

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <DashboardOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          监控大屏
        </Title>

        {/* 状态卡片 */}
        <Row gutter={16}>
          {[
            { icon: <VideoCameraOutlined style={{ fontSize: 32, color: '#1677ff' }} />, label: '当前专场', value: status.currentScene, color: '#fff' },
            { icon: <RobotOutlined style={{ fontSize: 32, color: '#52c41a' }} />, label: '机器人状态', value: status.robotStatus, color: '#fff' },
            { icon: <TeamOutlined style={{ fontSize: 32, color: '#eb2f96' }} />, label: '会话状态', value: status.sessionStatus, color: '#fff' },
            { icon: <WifiOutlined style={{ fontSize: 32, color: onlineCount === devices.length && devices.length > 0 ? '#52c41a' : '#faad14' }} />, label: '设备在线', value: `${onlineCount}/${devices.length}`, color: '#fff' },
          ].map((item, i) => (
            <Col span={6} key={i}>
              <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
                <Space align="center">
                  {item.icon}
                  <div>
                    <Text style={{ color: '#888', fontSize: 12 }}>{item.label}</Text>
                    <div><Text style={{ color: item.color, fontSize: 18, fontWeight: 600 }}>{item.value}</Text></div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 当前接待 */}
        {currentReport && (
          <Card
            title={<Text style={{ color: '#fff' }}><EyeOutlined style={{ marginRight: 6, color: '#52c41a' }} />当前接待中</Text>}
            style={{ background: '#1a1a1a', border: '1px solid #52c41a', borderRadius: 12 }}
          >
            <Row gutter={16}>
              <Col span={8}><Text style={{ color: '#888', fontSize: 12 }}>套餐</Text><div><Text style={{ color: '#fff', fontWeight: 600 }}>{currentReport.presetName || '—'}</Text></div></Col>
              <Col span={8}><Text style={{ color: '#888', fontSize: 12 }}>已参观展项</Text><div><Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 18 }}>{currentReport.exhibitCount || 0}</Text></div></Col>
              <Col span={8}><Text style={{ color: '#888', fontSize: 12 }}>用时</Text><div><Text style={{ color: '#1677ff', fontWeight: 600 }}>{currentReport.duration || '—'}</Text></div></Col>
            </Row>
          </Card>
        )}

        {/* 快捷操作 */}
        <Card
          title={<Text style={{ color: '#fff' }}>快捷操作</Text>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        >
          <Space size={12} wrap>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleOpenHall}>开启展厅</Button>
            <Button danger size="large" icon={<PoweroffOutlined />} onClick={handleCloseHall}>关闭展厅</Button>
            <Button size="large" icon={<SwapOutlined />} onClick={() => setSwitchModalVisible(true)} style={{ borderColor: '#faad14', color: '#faad14' }}>切换专场</Button>
            <Button size="large" icon={<ReloadOutlined />} onClick={handleReset} style={{ borderColor: '#722ed1', color: '#722ed1' }}>一键复位</Button>
          </Space>
        </Card>

        {/* 接待套餐快捷区 */}
        <Card
          title={<Text style={{ color: '#fff' }}><GiftOutlined style={{ marginRight: 6, color: '#faad14' }} />接待套餐快捷启动</Text>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        >
          <Row gutter={[12, 12]}>
            {presets.length === 0 ? (
              <Col span={24}><Text style={{ color: '#555' }}>暂无接待套餐，前往「接待套餐」页面创建</Text></Col>
            ) : (
              presets.map((preset: any) => (
                <Col key={preset.id} xs={12} sm={8} md={6} lg={4}>
                  <div style={{ background: '#141414', border: `1px solid ${preset.color || '#333'}44`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{PRESET_ICONS[preset.icon] || '🎯'}</div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{preset.name}</div>
                    <div style={{ color: '#666', fontSize: 11, marginBottom: 10, minHeight: 28 }}>{preset.description}</div>
                    <Popconfirm title={`启动「${preset.name}」`} description="确认要启动此接待套餐吗？" onConfirm={() => handleTriggerPreset(preset)} okText="确认启动" cancelText="取消">
                      <Button type="primary" size="small" loading={triggeringId === preset.id} style={{ background: preset.color || '#1677ff', border: 'none', width: '100%' }}>启动</Button>
                    </Popconfirm>
                  </div>
                </Col>
              ))
            )}
          </Row>
        </Card>

        {/* 设备在线状态 */}
        <Card
          title={<Space><Text style={{ color: '#fff' }}>设备在线状态</Text><Tag color="blue" style={{ fontSize: 11 }}>每60秒刷新</Tag></Space>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
        >
          <Row gutter={[12, 12]}>
            {devices.length === 0 ? (
              <Col span={24}><Text style={{ color: '#555' }}>暂无设备信息</Text></Col>
            ) : (
              devices.map((dev: any) => (
                <Col key={dev.id} xs={12} sm={8} md={6}>
                  <div style={{ background: '#141414', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${dev.online ? '#52c41a22' : '#ff4d4f22'}` }}>
                    <Badge color={dev.online ? '#52c41a' : '#ff4d4f'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 13 }}>{dev.name}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{dev.ip}</div>
                    </div>
                    <Tag color={dev.online ? 'green' : 'red'} style={{ fontSize: 10 }}>{dev.online ? '在线' : '离线'}</Tag>
                  </div>
                </Col>
              ))
            )}
          </Row>
        </Card>

        {/* 流程进度 */}
        {status.flowRunning && (
          <Card
            title={<Text style={{ color: '#fff' }}><ClockCircleOutlined style={{ marginRight: 6, color: '#1677ff' }} />执行中的流程</Text>}
            style={{ background: '#1a1a1a', border: '1px solid #1677ff', borderRadius: 12 }}
          >
            <Text style={{ color: '#ccc' }}>{status.flowName}</Text>
            <Progress percent={status.flowProgress || 0} strokeColor={{ from: '#1677ff', to: '#52c41a' }} style={{ marginTop: 8 }} />
          </Card>
        )}

        {/* 实时日志 */}
        <Card
          title={<Text style={{ color: '#fff' }}>实时操作日志</Text>}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          <div ref={logRef} style={{ height: 280, overflowY: 'auto', background: '#0d1117', borderRadius: '0 0 12px 12px', padding: 12, fontFamily: 'monospace' }}>
            {displayLogs.map((log: any, i: number) => (
              <div key={log.id || i} style={{ marginBottom: 4, fontSize: 13 }}>
                <Text style={{ color: '#555' }}>[{log.time || log.created_at}] </Text>
                <Tag color={log.status === 'success' ? 'green' : log.status === 'error' ? 'red' : 'blue'} style={{ fontSize: 11 }}>{log.action}</Tag>
                <Text style={{ color: '#888' }}>{log.source} — </Text>
                <Text style={{ color: log.status === 'error' ? '#ff4d4f' : '#ccc' }}>{log.result}</Text>
              </div>
            ))}
          </div>
        </Card>
      </Space>

      <Modal title="切换专场" open={switchModalVisible} onOk={handleSwitchScene} onCancel={() => setSwitchModalVisible(false)} confirmLoading={loading}>
        <Select style={{ width: '100%', marginTop: 8 }} placeholder="选择专场" value={selectedScene} onChange={setSelectedScene}>
          {scenes.map((s) => <Option key={s} value={s}>{s}</Option>)}
        </Select>
      </Modal>
    </Spin>
  )
}
