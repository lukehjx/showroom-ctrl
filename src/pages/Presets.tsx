import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Button, Typography, Space, Modal, Form, Input,
  Select, message, Spin, Popconfirm, Progress, Tag, ColorPicker,
  Empty, Grid,
} from 'antd'
import {
  GiftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  PlayCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { getPresets, createPreset, updatePreset, deletePreset, triggerPreset, getPresetStatus, getFlows } from '../api'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { useBreakpoint } = Grid

const ICON_OPTIONS = [
  { value: 'vip', label: '👑 VIP' },
  { value: 'group', label: '👥 团队' },
  { value: 'kids', label: '🎈 亲子' },
  { value: 'quick', label: '⚡ 快速' },
  { value: 'full', label: '🏛️ 全程' },
  { value: 'custom', label: '🎯 自定义' },
]
const ICON_MAP: Record<string, string> = {
  vip: '👑', group: '👥', kids: '🎈', quick: '⚡', full: '🏛️', custom: '🎯',
}
const DEFAULT_COLORS = ['#faad14', '#1677ff', '#52c41a', '#eb2f96', '#722ed1', '#13c2c2']

const mockPresets = [
  { id: '1', name: 'VIP接待', description: '专属VIP参观路线，配备专人讲解，参观全部重点展项', icon: 'vip', color: '#faad14', flows: ['1'] },
  { id: '2', name: '标准团队', description: '适合15-30人团队，60分钟完整参观', icon: 'group', color: '#1677ff', flows: ['1', '2'] },
  { id: '3', name: '亲子体验', description: '针对家庭亲子，互动性强的参观路线', icon: 'kids', color: '#52c41a', flows: [] },
  { id: '4', name: '快速参观', description: '30分钟精华路线，适合时间紧张的访客', icon: 'quick', color: '#eb2f96', flows: ['2'] },
]

interface Preset {
  id: string
  name: string
  description: string
  icon: string
  color: string
  flows: string[]
}

interface RunningState {
  id: string
  progress: number
  status: 'running' | 'done'
}

export default function Presets() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [running, setRunning] = useState<Record<string, RunningState>>({})
  const [form] = Form.useForm()

  const screens = useBreakpoint()
  const isMobile = !screens.md

  const fetchPresets = async () => {
    setLoading(true)
    try {
      const data: any = await getPresets()
      setPresets(data?.list || data || mockPresets)
    } catch { setPresets(mockPresets) }
    setLoading(false)
  }

  useEffect(() => {
    fetchPresets()
    getFlows().then((d: any) => setFlows(d?.list || d || [])).catch(() => setFlows([
      { id: '1', name: '标准接待流程' }, { id: '2', name: 'VIP专属路线' },
    ]))
  }, [])

  const handleTrigger = async (preset: Preset) => {
    setRunning((prev) => ({ ...prev, [preset.id]: { id: preset.id, progress: 0, status: 'running' } }))
    try {
      await triggerPreset(preset.id)
      message.success(`「${preset.name}」已启动`)
      let p = 0
      const timer = setInterval(async () => {
        p += 10
        if (p >= 100) {
          clearInterval(timer)
          setRunning((prev) => ({ ...prev, [preset.id]: { id: preset.id, progress: 100, status: 'done' } }))
          setTimeout(() => setRunning((prev) => { const n = { ...prev }; delete n[preset.id]; return n }), 3000)
          return
        }
        try {
          const s: any = await getPresetStatus(preset.id)
          const progress = s?.progress ?? p
          setRunning((prev) => ({ ...prev, [preset.id]: { id: preset.id, progress, status: 'running' } }))
        } catch {
          setRunning((prev) => ({ ...prev, [preset.id]: { id: preset.id, progress: p, status: 'running' } }))
        }
      }, 2000)
    } catch {
      message.error('启动失败')
      setRunning((prev) => { const n = { ...prev }; delete n[preset.id]; return n })
    }
  }

  const handleEdit = (preset: Preset) => {
    setEditingPreset(preset)
    form.setFieldsValue({ ...preset, color: preset.color || '#1677ff' })
    setModalVisible(true)
  }

  const handleNew = () => {
    setEditingPreset(null)
    form.resetFields()
    form.setFieldsValue({ icon: 'custom', color: '#1677ff' })
    setModalVisible(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const colorVal = typeof values.color === 'object' ? values.color?.toHexString?.() || '#1677ff' : values.color
    const payload = { ...values, color: colorVal }
    setLoading(true)
    try {
      if (editingPreset) {
        await updatePreset(editingPreset.id, payload)
        message.success('套餐已更新')
      } else {
        await createPreset(payload)
        message.success('套餐已创建')
      }
      setModalVisible(false)
      fetchPresets()
    } catch { message.error('保存失败') }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePreset(id)
      message.success('已删除')
      fetchPresets()
    } catch { message.error('删除失败') }
  }

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={isMobile ? 12 : 20} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ color: '#fff', margin: 0 }}>
              <GiftOutlined style={{ marginRight: 8, color: '#faad14' }} />接待套餐
            </Title>
            {!isMobile && (
              <Text style={{ color: '#888', fontSize: 12 }}>为不同类型的访客配置专属接待流程，一键启动全流程</Text>
            )}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNew} size={isMobile ? 'middle' : 'large'}>
            {isMobile ? '新建' : '新建套餐'}
          </Button>
        </div>

        {presets.length === 0 ? (
          <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
            <Empty description={<Text style={{ color: '#555' }}>暂无接待套餐，点击「新建套餐」开始</Text>} style={{ padding: 48 }} />
          </Card>
        ) : (
          <Row gutter={[isMobile ? 10 : 20, isMobile ? 10 : 20]}>
            {presets.map((preset) => {
              const state = running[preset.id]
              const isRunning = !!state
              const isDone = state?.status === 'done'
              return (
                <Col key={preset.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    style={{
                      background: '#1a1a1a',
                      border: `2px solid ${isRunning ? preset.color : '#2a2a2a'}`,
                      borderRadius: 16,
                      textAlign: 'center',
                      transition: 'all 0.3s',
                      boxShadow: isRunning ? `0 0 20px ${preset.color}44` : 'none',
                    }}
                    styles={{ body: { padding: isMobile ? '16px 14px' : '24px 20px' } }}
                  >
                    {/* 图标 */}
                    <div style={{
                      width: isMobile ? 56 : 72,
                      height: isMobile ? 56 : 72,
                      borderRadius: '50%',
                      margin: '0 auto 12px',
                      background: `${preset.color}22`,
                      border: `2px solid ${preset.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? 24 : 32,
                    }}>
                      {ICON_MAP[preset.icon] || '🎯'}
                    </div>

                    {/* 名称 */}
                    <Title level={isMobile ? 5 : 4} style={{ color: '#fff', margin: '0 0 6px' }}>{preset.name}</Title>

                    {/* 描述 */}
                    <Text style={{ color: '#888', fontSize: 12, display: 'block', minHeight: isMobile ? 0 : 40, marginBottom: 10 }}>
                      {preset.description}
                    </Text>

                    {/* 关联流程 */}
                    {!isMobile && (
                      <div style={{ marginBottom: 14, minHeight: 24 }}>
                        {(preset.flows || []).slice(0, 3).map((fid: string) => {
                          const flow = flows.find((f) => f.id === fid)
                          return flow ? <Tag key={fid} color="blue" style={{ fontSize: 11 }}>{flow.name}</Tag> : null
                        })}
                        {(preset.flows || []).length === 0 && (
                          <Tag color="default" style={{ fontSize: 11 }}>未绑定流程</Tag>
                        )}
                      </div>
                    )}

                    {/* 进度条 */}
                    {isRunning && (
                      <div style={{ marginBottom: 10 }}>
                        <Progress
                          percent={state.progress}
                          strokeColor={preset.color}
                          status={isDone ? 'success' : 'active'}
                          size="small"
                        />
                        <Text style={{ color: isDone ? '#52c41a' : '#888', fontSize: 11 }}>
                          {isDone ? '✅ 执行完成' : `执行中 ${state.progress}%`}
                        </Text>
                      </div>
                    )}

                    {/* 一键启动按钮 */}
                    <div style={{ marginBottom: 10 }}>
                      <Popconfirm
                        title={`启动「${preset.name}」`}
                        description={<>即将启动此接待套餐的全部流程<br />确认继续？</>}
                        onConfirm={() => handleTrigger(preset)}
                        okText="✅ 确认启动"
                        cancelText="取消"
                        okButtonProps={{ style: { background: preset.color, border: 'none' } }}
                      >
                        <Button
                          type="primary"
                          icon={isDone ? <CheckCircleOutlined /> : <PlayCircleOutlined />}
                          loading={isRunning && !isDone}
                          disabled={isRunning}
                          block
                          style={{
                            background: isDone ? '#52c41a' : preset.color,
                            border: 'none',
                            minHeight: 60,
                            fontSize: 16,
                            fontWeight: 600,
                          }}
                        >
                          {isDone ? '已完成' : isRunning ? '执行中' : '一键启动'}
                        </Button>
                      </Popconfirm>
                    </div>

                    {/* 编辑/删除 */}
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(preset)}>编辑</Button>
                      <Popconfirm title="确认删除此套餐？" onConfirm={() => handleDelete(preset.id)}>
                        <Button size="small" icon={<DeleteOutlined />} danger />
                      </Popconfirm>
                    </Space>
                  </Card>
                </Col>
              )
            })}
          </Row>
        )}
      </Space>

      <Modal
        title={editingPreset ? '编辑接待套餐' : '新建接待套餐'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', height: '100vh' } : {}}
        styles={isMobile ? { body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } } : {}}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="套餐名称" name="name" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="如：VIP接待、标准团队" size="large" style={{ height: 44 }} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea placeholder="简短描述此套餐适用场景" rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item label="图标" name="icon" rules={[{ required: true }]}>
                <Select style={{ height: 44 }}>
                  {ICON_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={isMobile ? 24 : 12}>
              <Form.Item label="颜色" name="color">
                <ColorPicker
                  presets={[{ label: '预设色', colors: DEFAULT_COLORS }]}
                  format="hex"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="绑定流程（可多选，按顺序执行）" name="flows">
            <Select mode="multiple" placeholder="选择要执行的流程" allowClear>
              {flows.map((f) => <Option key={f.id} value={f.id}>{f.name}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}
