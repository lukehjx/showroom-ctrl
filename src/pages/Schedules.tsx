import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Typography, Space, Tag, Modal, Form, Input,
  Select, Switch, message, Popconfirm, Spin, Row, Col,
} from 'antd'
import {
  ClockCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule, getPresets, getFlows } from '../api'

const { Title, Text } = Typography
const { Option } = Select

const QUICK_CRONS = [
  { label: '每天早9点', value: '0 9 * * *' },
  { label: '每天中午12点', value: '0 12 * * *' },
  { label: '每天下午5点', value: '0 17 * * *' },
  { label: '每周一早9点', value: '0 9 * * 1' },
  { label: '每30分钟', value: '*/30 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '工作日早9点', value: '0 9 * * 1-5' },
]

const ACTION_TYPES = [
  { value: 'trigger_preset', label: '触发套餐' },
  { value: 'trigger_flow', label: '触发流程' },
  { value: 'tcp', label: 'TCP发送' },
  { value: 'http', label: 'HTTP请求' },
]

const mockSchedules = [
  { id: '1', name: '早间开馆', cron: '0 9 * * *', actionType: 'trigger_preset', actionParam: '主题一', nextRun: '2024-01-16 09:00:00', enabled: true },
  { id: '2', name: '午间休馆', cron: '0 12 * * *', actionType: 'tcp', actionParam: '关闭灯光', nextRun: '2024-01-15 12:00:00', enabled: false },
]

export default function Schedules() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [actionType, setActionType] = useState('trigger_preset')
  const [form] = Form.useForm()

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const data: any = await getSchedules()
      setSchedules(data?.list || data || mockSchedules)
    } catch { setSchedules(mockSchedules) }
    setLoading(false)
  }

  useEffect(() => {
    fetchSchedules()
    getPresets().then((d: any) => setPresets(d?.list || d || [])).catch(() => setPresets([{ id: '1', name: 'VIP接待' }]))
    getFlows().then((d: any) => setFlows(d?.list || d || [])).catch(() => setFlows([{ id: '1', name: '标准接待流程' }]))
  }, [])

  const handleEdit = (s: any) => {
    setEditingSchedule(s)
    setActionType(s.actionType)
    form.setFieldsValue(s)
    setModalVisible(true)
  }

  const handleNew = () => {
    setEditingSchedule(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true, actionType: 'trigger_preset' })
    setActionType('trigger_preset')
    setModalVisible(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, values)
        message.success('任务已更新')
      } else {
        await createSchedule(values)
        message.success('任务已创建')
      }
      setModalVisible(false)
      fetchSchedules()
    } catch { message.error('保存失败') }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id)
      message.success('已删除')
      fetchSchedules()
    } catch { message.error('删除失败') }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleSchedule(id, enabled)
      setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, enabled } : s))
    } catch { message.error('操作失败') }
  }

  const columns = [
    { title: '任务名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ color: '#fff', fontWeight: 500 }}>{v}</Text> },
    {
      title: 'Cron 表达式', dataIndex: 'cron', key: 'cron',
      render: (v: string) => {
        const match = QUICK_CRONS.find((q) => q.value === v)
        return (
          <Space>
            <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag>
            {match && <Text style={{ color: '#888', fontSize: 11 }}>{match.label}</Text>}
          </Space>
        )
      }
    },
    {
      title: '动作类型', dataIndex: 'actionType', key: 'actionType',
      render: (v: string) => {
        const t = ACTION_TYPES.find((a) => a.value === v)
        return <Tag color="purple">{t?.label || v}</Tag>
      }
    },
    { title: '动作参数', dataIndex: 'actionParam', key: 'actionParam', render: (v: string) => <Text style={{ color: '#888', fontSize: 12 }}>{v}</Text> },
    { title: '下次执行', dataIndex: 'nextRun', key: 'nextRun', render: (v: string) => <Text style={{ color: '#888', fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: '启用', dataIndex: 'enabled', key: 'enabled',
      render: (v: boolean, record: any) => (
        <Switch size="small" checked={v} onChange={(val) => handleToggle(record.id, val)} />
      )
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />定时任务
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>新建任务</Button>
        </div>
        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Table dataSource={schedules} columns={columns} rowKey="id" pagination={{ pageSize: 15 }} />
        </Card>
      </Space>

      <Modal
        title={editingSchedule ? '编辑定时任务' : '新建定时任务'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={540}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="如：早间开馆" />
          </Form.Item>

          <Form.Item label="Cron 表达式" name="cron" rules={[{ required: true }]}>
            <Input placeholder="0 9 * * *" />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12 }}>快捷选择：</Text>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_CRONS.map((q) => (
                <Tag
                  key={q.value}
                  style={{ cursor: 'pointer' }}
                  color="blue"
                  onClick={() => form.setFieldValue('cron', q.value)}
                >
                  {q.label}
                </Tag>
              ))}
            </div>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="动作类型" name="actionType" rules={[{ required: true }]}>
                <Select onChange={(v) => setActionType(v)}>
                  {ACTION_TYPES.map((a) => <Option key={a.value} value={a.value}>{a.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="动作参数" name="actionParam">
                {actionType === 'trigger_preset' ? (
                  <Select placeholder="选择套餐">
                    {presets.map((p) => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                  </Select>
                ) : actionType === 'trigger_flow' ? (
                  <Select placeholder="选择流程">
                    {flows.map((f) => <Option key={f.id} value={f.id}>{f.name}</Option>)}
                  </Select>
                ) : (
                  <Input placeholder={actionType === 'tcp' ? 'HOST:PORT|DATA' : 'https://...'} />
                )}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="立即启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}
