import { useState, useEffect } from 'react'
import {
  Card, Row, Col, List, Typography, Tag, Button, Modal, Select, message, Spin, Badge, Empty,
} from 'antd'
import { DesktopOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { getTerminals, getTerminalResources, pushResource, getScenes } from '../api'

const { Title, Text } = Typography
const { Option } = Select

const mockTerminals = [
  { id: '1', name: 'LED主展屏', ip: '192.168.1.101', type: 'display', online: true },
  { id: '2', name: '副屏A', ip: '192.168.1.102', type: 'display', online: true },
  { id: '3', name: '数字人终端', ip: '192.168.1.103', type: 'digital_human', online: false },
]
const mockResources = [
  { id: 'r1', name: '航天科技宣传片.mp4', type: 'video', size: '256MB' },
  { id: 'r2', name: '深海探索纪录片.mp4', type: 'video', size: '180MB' },
  { id: 'r3', name: '科技展图册.pdf', type: 'document', size: '12MB' },
]

export default function Terminals() {
  const [terminals, setTerminals] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pushModalVisible, setPushModalVisible] = useState(false)
  const [pushingResource, setPushingResource] = useState<any>(null)
  const [scenes, setScenes] = useState<string[]>([])
  const [selectedScene, setSelectedScene] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const data: any = await getTerminals()
        setTerminals(data?.list || data || mockTerminals)
      } catch { setTerminals(mockTerminals) }
    }
    fetch()
    getScenes().then((d: any) => {
      if (d?.list) setScenes(d.list.map((s: any) => s.name || s))
    }).catch(() => setScenes(['主展厅', '副展厅']))
  }, [])

  const selectTerminal = async (terminal: any) => {
    setSelectedTerminal(terminal)
    setLoading(true)
    try {
      const data: any = await getTerminalResources(terminal.id)
      setResources(data?.list || data || mockResources)
    } catch { setResources(mockResources) }
    setLoading(false)
  }

  const openPushModal = (resource: any) => {
    setPushingResource(resource)
    setPushModalVisible(true)
  }

  const handlePush = async () => {
    if (!selectedScene) { message.warning('请选择专场'); return }
    try {
      await pushResource(selectedTerminal.id, pushingResource.id, selectedScene)
      message.success('投放成功')
      setPushModalVisible(false)
    } catch { message.error('投放失败') }
  }

  const typeColor: Record<string, string> = { display: 'blue', digital_human: 'purple', audio: 'green', video: 'red', document: 'orange' }

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <DesktopOutlined style={{ marginRight: 8, color: '#1677ff' }} />终端与资源
        </Title>
        <Row gutter={16} style={{ height: 'calc(100vh - 160px)' }}>
          {/* 左侧终端列表 */}
          <Col span={8}>
            <Card title={<Text style={{ color: '#fff' }}>终端列表</Text>} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', height: '100%' }}>
              {terminals.length === 0 ? (
                <Empty description={<Text style={{ color: '#555' }}>暂无终端</Text>} />
              ) : (
                terminals.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => selectTerminal(t)}
                    style={{
                      padding: '10px 12px', marginBottom: 8, borderRadius: 8, cursor: 'pointer',
                      background: selectedTerminal?.id === t.id ? '#1677ff22' : '#141414',
                      border: `1px solid ${selectedTerminal?.id === t.id ? '#1677ff' : '#2a2a2a'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 500 }}>{t.name}</Text>
                      <Badge color={t.online ? '#52c41a' : '#ff4d4f'} text={<Text style={{ color: t.online ? '#52c41a' : '#ff4d4f', fontSize: 11 }}>{t.online ? '在线' : '离线'}</Text>} />
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={typeColor[t.type] || 'default'} style={{ fontSize: 10 }}>{t.type}</Tag>
                      <Text style={{ color: '#555', fontSize: 11, marginLeft: 4 }}>{t.ip}</Text>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </Col>

          {/* 右侧资源列表 */}
          <Col span={16}>
            <Card
              title={<Text style={{ color: '#fff' }}>{selectedTerminal ? `${selectedTerminal.name} — 资源列表` : '选择终端查看资源'}</Text>}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', height: '100%' }}
            >
              {!selectedTerminal ? (
                <Empty description={<Text style={{ color: '#555' }}>请先选择左侧终端</Text>} />
              ) : (
                <List
                  dataSource={resources}
                  renderItem={(res: any) => (
                    <List.Item
                      extra={
                        <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => openPushModal(res)}>
                          投放
                        </Button>
                      }
                      style={{ borderBottom: '1px solid #2a2a2a' }}
                    >
                      <List.Item.Meta
                        title={<Text style={{ color: '#fff' }}>{res.name}</Text>}
                        description={
                          <Space>
                            <Tag color={typeColor[res.type] || 'blue'} style={{ fontSize: 10 }}>{res.type}</Tag>
                            {res.size && <Text style={{ color: '#555', fontSize: 11 }}>{res.size}</Text>}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>

      <Modal title="选择投放专场" open={pushModalVisible} onOk={handlePush} onCancel={() => setPushModalVisible(false)}>
        <Text style={{ display: 'block', marginBottom: 8, color: '#888' }}>资源：{pushingResource?.name}</Text>
        <Select style={{ width: '100%' }} placeholder="选择专场" value={selectedScene} onChange={setSelectedScene}>
          {scenes.map((s) => <Option key={s} value={s}>{s}</Option>)}
        </Select>
      </Modal>
    </Spin>
  )
}

function Space({ children, direction, size, style }: any) {
  const isVertical = direction === 'vertical'
  return (
    <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: size || 8, ...style }}>
      {children}
    </div>
  )
}
