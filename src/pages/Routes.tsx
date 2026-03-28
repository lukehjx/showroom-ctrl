import { useState, useEffect } from 'react'
import {
  Card, Button, List, Typography, Space, Modal, Input, message,
  Popconfirm, Tag, Switch, Empty, Grid, Alert,
} from 'antd'
import {
  PlusOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined,
  ApartmentOutlined, MobileOutlined,
} from '@ant-design/icons'
import FlowEditor from '../components/FlowEditor'
import type { Node, Edge } from 'reactflow'
import type { NodeData } from '../components/FlowEditor/nodes/CustomNode'
import { getFlows, createFlow, updateFlow, deleteFlow, executeFlow, toggleFlow } from '../api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface Flow {
  id: string
  name: string
  enabled: boolean
  nodes: Node<NodeData>[]
  edges: Edge[]
  updatedAt?: string
}

export default function RoutesPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [currentFlow, setCurrentFlow] = useState<Flow | null>(null)
  const [loading, setLoading] = useState(false)
  const [newModalVisible, setNewModalVisible] = useState(false)
  const [newName, setNewName] = useState('')

  const screens = useBreakpoint()
  const isMobile = !screens.md
  const isTablet = screens.md && !screens.lg

  const fetchFlows = async () => {
    try {
      const data: any = await getFlows()
      setFlows(data?.list || data || [])
    } catch {
      setFlows([
        { id: '1', name: '标准接待流程', enabled: true, nodes: [], edges: [] },
        { id: '2', name: 'VIP专属路线', enabled: true, nodes: [], edges: [] },
      ])
    }
  }

  useEffect(() => { fetchFlows() }, [])

  const handleSelectFlow = (flow: Flow) => {
    setCurrentFlow(flow)
  }

  const handleSave = async (nodes: Node<NodeData>[], edges: Edge[]) => {
    if (!currentFlow) return
    setLoading(true)
    try {
      const data = { name: currentFlow.name, nodes, edges }
      if (currentFlow.id.startsWith('new_')) {
        await createFlow(data)
      } else {
        await updateFlow(currentFlow.id, data)
      }
      message.success('流程已保存')
      fetchFlows()
    } catch {
      message.error('保存失败')
    }
    setLoading(false)
  }

  const handleNewFlow = async () => {
    if (!newName.trim()) { message.warning('请输入流程名称'); return }
    const newFlow: Flow = { id: `new_${Date.now()}`, name: newName, enabled: true, nodes: [], edges: [] }
    setFlows((prev) => [...prev, newFlow])
    setCurrentFlow(newFlow)
    setNewModalVisible(false)
    setNewName('')
  }

  const handleDelete = async (id: string) => {
    try {
      if (!id.startsWith('new_')) await deleteFlow(id)
      setFlows((prev) => prev.filter((f) => f.id !== id))
      if (currentFlow?.id === id) setCurrentFlow(null)
      message.success('已删除')
    } catch { message.error('删除失败') }
  }

  const handleExecute = async (id: string) => {
    try {
      await executeFlow(id)
      message.success('流程已启动执行')
    } catch { message.error('执行失败') }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleFlow(id, enabled)
      setFlows((prev) => prev.map((f) => f.id === id ? { ...f, enabled } : f))
    } catch { message.error('操作失败') }
  }

  // Mobile: show flow list + tip to use desktop for editing
  if (isMobile) {
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ color: '#fff', margin: 0 }}>
            <ApartmentOutlined style={{ marginRight: 6, color: '#1677ff' }} />流程编辑器
          </Title>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setNewModalVisible(true)} style={{ minHeight: 36 }}>
            新建
          </Button>
        </div>

        <Alert
          icon={<MobileOutlined />}
          message="建议在桌面端编辑流程"
          description="可视化流程编辑器在大屏上体验更佳。手机端可查看和执行已有流程。"
          type="info"
          showIcon
          style={{ background: '#1a2a3a', border: '1px solid #1677ff44' }}
        />

        {flows.length === 0 ? (
          <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
            <Empty description={<Text style={{ color: '#555' }}>暂无流程</Text>} style={{ padding: 32 }} />
          </Card>
        ) : (
          flows.map((flow) => (
            <Card
              key={flow.id}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{flow.name}</Text>
                <Switch size="small" checked={flow.enabled} onChange={(v) => handleToggle(flow.id, v)} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <Tag color={flow.enabled ? 'green' : 'default'} style={{ fontSize: 11 }}>{flow.enabled ? '启用' : '禁用'}</Tag>
                <Tag color="blue" style={{ fontSize: 11 }}>{(flow.nodes || []).length} 节点</Tag>
              </div>
              <Space size={8}>
                <Button
                  size="middle"
                  icon={<PlayCircleOutlined />}
                  type="primary"
                  ghost
                  onClick={() => handleExecute(flow.id)}
                  style={{ minHeight: 44 }}
                >
                  执行
                </Button>
                <Popconfirm title="确认删除此流程？" onConfirm={() => handleDelete(flow.id)}>
                  <Button size="middle" icon={<DeleteOutlined />} danger style={{ minHeight: 44 }} />
                </Popconfirm>
              </Space>
            </Card>
          ))
        )}

        <Modal
          title="新建流程"
          open={newModalVisible}
          onOk={handleNewFlow}
          onCancel={() => setNewModalVisible(false)}
          width="95%"
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入流程名称"
            style={{ marginTop: 8, height: 44 }}
            onPressEnter={handleNewFlow}
          />
        </Modal>
      </Space>
    )
  }

  // Tablet & Desktop: full editor
  return (
    <div style={{ display: 'flex', gap: 16, height: isTablet ? 'calc(100vh - 90px)' : 'calc(100vh - 104px)' }}>
      {/* 左侧流程列表 */}
      <div style={{ width: isTablet ? 200 : 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card
          title={<Text style={{ color: '#fff' }}><ApartmentOutlined style={{ marginRight: 6 }} />流程列表</Text>}
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setNewModalVisible(true)}>
              新建
            </Button>
          }
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', flex: 1 }}
          styles={{ body: { padding: 0 } }}
        >
          {flows.length === 0 ? (
            <Empty description={<Text style={{ color: '#555' }}>暂无流程</Text>} style={{ padding: 24 }} />
          ) : (
            <List
              dataSource={flows}
              renderItem={(flow) => (
                <List.Item
                  onClick={() => handleSelectFlow(flow)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    background: currentFlow?.id === flow.id ? '#1677ff22' : 'transparent',
                    borderBottom: '1px solid #2a2a2a',
                    borderLeft: currentFlow?.id === flow.id ? '3px solid #1677ff' : '3px solid transparent',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{flow.name}</Text>
                      <Switch size="small" checked={flow.enabled} onChange={(v) => handleToggle(flow.id, v)} onClick={(_, e) => e.stopPropagation()} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tag color={flow.enabled ? 'green' : 'default'} style={{ fontSize: 10 }}>{flow.enabled ? '启用' : '禁用'}</Tag>
                      <Tag color="blue" style={{ fontSize: 10 }}>{(flow.nodes || []).length} 节点</Tag>
                    </div>
                    <Space size={6} style={{ marginTop: 6 }}>
                      <Button size="small" icon={<PlayCircleOutlined />} type="primary" ghost
                        onClick={(e) => { e.stopPropagation(); handleExecute(flow.id) }}>执行</Button>
                      <Popconfirm title="确认删除此流程？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(flow.id) }}>
                        <Button size="small" icon={<DeleteOutlined />} danger onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      {/* 右侧编辑器 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {currentFlow ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>
                <EditOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                {currentFlow.name}
              </Title>
              {loading && <Text style={{ color: '#888', fontSize: 12 }}>保存中...</Text>}
            </div>
            <div style={{ flex: 1 }}>
              <FlowEditor
                key={currentFlow.id}
                initialNodes={currentFlow.nodes || []}
                initialEdges={currentFlow.edges || []}
                onSave={handleSave}
              />
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
              <Text style={{ color: '#555', fontSize: 16 }}>从左侧选择流程，或新建一个流程</Text>
            </div>
          </div>
        )}
      </div>

      <Modal title="新建流程" open={newModalVisible} onOk={handleNewFlow} onCancel={() => setNewModalVisible(false)}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="输入流程名称"
          style={{ marginTop: 8 }}
          onPressEnter={handleNewFlow}
        />
      </Modal>
    </div>
  )
}
