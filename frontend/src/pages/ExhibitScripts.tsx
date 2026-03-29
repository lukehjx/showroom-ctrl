import { useEffect, useState } from 'react'
import {
  Button, Table, Space, Switch, Input, Modal, Form, Select,
  message, Popconfirm, Tag, Typography, Card, InputNumber
} from 'antd'
import {
  EditOutlined, DeleteOutlined, ReloadOutlined,
  PlusOutlined, SoundOutlined
} from '@ant-design/icons'
import api from '../api'

const { Text } = Typography
const { TextArea } = Input

interface Terminal {
  id: number
  terminal_id: number
  name: string
}

interface Resource {
  id: number
  resource_id: number
  terminal_id: number
  title: string
  file_name: string
}

interface ExhibitScript {
  id: number
  terminal_id: number
  terminal_name: string
  trigger_phrases: string
  opening_speech: string
  resource_id: number | null
  resource_title: string
  commentary: string
  nav_position: string
  tts_delay_seconds: number
  enabled: boolean
  note: string
  sort_order: number
  ai_commentary_enabled: boolean
  auto_tour_enabled: boolean
}

export default function ExhibitScriptsPage() {
  const [scripts, setScripts] = useState<ExhibitScript[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [resourceLoading, setResourceLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editScript, setEditScript] = useState<ExhibitScript | null>(null)
  const [form] = Form.useForm()
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null)

  const fetchScripts = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/exhibit-scripts')
      if (res?.code === 0) setScripts(res.data)
    } catch { message.error('加载失败') }
    finally { setLoading(false) }
  }

  const fetchTerminals = async () => {
    try {
      const res: any = await api.get('/api/terminals')
      if (res?.code === 0) setTerminals(res.data)
    } catch {}
  }

  const fetchResources = async (terminalId: number) => {
    setResourceLoading(true)
    setResources([])
    try {
      const res: any = await api.get(`/api/terminals/${terminalId}/resources`)
      if (res?.code === 0) setResources(res.data)
    } catch { message.error('加载资源失败') }
    finally { setResourceLoading(false) }
  }

  useEffect(() => {
    fetchScripts()
    fetchTerminals()
  }, [])

  const handleTerminalChange = (terminalId: number) => {
    setSelectedTerminalId(terminalId)
    form.setFieldValue('resource_id', undefined)
    form.setFieldValue('resource_title', '')
    const t = terminals.find(t => t.terminal_id === terminalId)
    if (t) {
      form.setFieldValue('terminal_name', t.name)
      fetchResources(terminalId)
    }
  }

  const handleResourceChange = (resourceId: number) => {
    const r = resources.find(r => r.resource_id === resourceId)
    if (r) {
      form.setFieldValue('resource_title', r.title || r.file_name)
    }
  }

  const handleToggle = async (script: ExhibitScript) => {
    try {
      const res: any = await api.put(`/api/exhibit-scripts/${script.id}`, { enabled: !script.enabled })
      if (res?.code === 0) fetchScripts()
      else message.error(res?.message || '操作失败')
    } catch { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try {
      const res: any = await api.delete(`/api/exhibit-scripts/${id}`)
      if (res?.code === 0) { message.success('已删除'); fetchScripts() }
      else message.error(res?.message || '删除失败')
    } catch { message.error('删除失败') }
  }

  const openEdit = (script: ExhibitScript | null) => {
    setEditScript(script)
    if (script) {
      const termId = script.terminal_id
      setSelectedTerminalId(termId)
      form.setFieldsValue({
        terminal_id: termId,
        terminal_name: script.terminal_name,
        trigger_phrases: script.trigger_phrases,
        opening_speech: script.opening_speech,
        resource_id: script.resource_id,
        resource_title: script.resource_title,
        commentary: script.commentary,
        nav_position: script.nav_position,
        tts_delay_seconds: script.tts_delay_seconds,
        enabled: script.enabled,
        note: script.note,
        sort_order: script.sort_order,
        ai_commentary_enabled: script.ai_commentary_enabled,
        auto_tour_enabled: script.auto_tour_enabled,
      })
      if (termId) fetchResources(termId)
    } else {
      form.resetFields()
      form.setFieldsValue({
        enabled: true,
        tts_delay_seconds: 2,
        sort_order: 99,
        ai_commentary_enabled: true,
        auto_tour_enabled: false,
      })
      setResources([])
      setSelectedTerminalId(null)
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const terminal = terminals.find(t => t.terminal_id === values.terminal_id)
    const resource = resources.find(r => r.resource_id === values.resource_id)
    const payload = {
      ...values,
      terminal_name: terminal?.name || values.terminal_name || '',
      resource_title: resource?.title || resource?.file_name || values.resource_title || '',
    }
    try {
      let res: any
      if (editScript) {
        res = await api.put(`/api/exhibit-scripts/${editScript.id}`, payload)
      } else {
        res = await api.post('/api/exhibit-scripts', payload)
      }
      if (res?.code === 0) {
        message.success(editScript ? '更新成功' : '添加成功')
        setModalOpen(false)
        fetchScripts()
      } else {
        message.error(res?.message || '保存失败')
      }
    } catch { message.error('保存失败') }
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'sort_order',
      width: 60,
      render: (v: number) => <Tag color="blue" style={{ minWidth: 32, textAlign: 'center' }}>{v}</Tag>,
    },
    {
      title: '终端',
      dataIndex: 'terminal_name',
      render: (v: string, r: ExhibitScript) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v || `终端#${r.terminal_id}`}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {r.terminal_id}</div>
        </div>
      ),
    },
    {
      title: '触发词',
      dataIndex: 'trigger_phrases',
      render: (v: string) => v
        ? <Tag color="cyan">{v}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>未配置</Text>,
    },
    {
      title: '讲解资源',
      dataIndex: 'resource_title',
      render: (v: string, r: ExhibitScript) => v
        ? <div><div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>resource_id: {r.resource_id}</div></div>
        : <Text type="secondary" style={{ fontSize: 12 }}>未绑定</Text>,
    },
    {
      title: 'AI讲解',
      dataIndex: 'ai_commentary_enabled',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '开启' : '关闭'}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 70,
      render: (v: boolean, r: ExhibitScript) => (
        <Switch checked={v} size="small" onChange={() => handleToggle(r)} />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, r: ExhibitScript) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="编辑" />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20 }}>
            <SoundOutlined style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
            展项讲解配置
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            配置各终端展项的讲解触发词、文件资源和解说词
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchScripts} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
            添加讲解
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: 'rgba(15,22,40,0.85)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={scripts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="middle"
          style={{ borderRadius: 10 }}
        />
      </Card>

      <Modal
        title={editScript ? '编辑展项讲解' : '添加展项讲解'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={620}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="terminal_id"
            label="终端（选终端后加载资源列表）"
            rules={[{ required: true, message: '请选择终端' }]}
          >
            <Select
              showSearch
              placeholder="选择展厅终端"
              onChange={handleTerminalChange}
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={terminals.map(t => ({ value: t.terminal_id, label: `${t.name} (ID:${t.terminal_id})` }))}
            />
          </Form.Item>

          <Form.Item
            name="resource_id"
            label="讲解资源（文件列表）"
            rules={[{ required: false }]}
          >
            <Select
              showSearch
              loading={resourceLoading}
              placeholder={selectedTerminalId ? (resourceLoading ? '加载资源中...' : '选择资源文件') : '请先选择终端'}
              disabled={!selectedTerminalId}
              onChange={handleResourceChange}
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={resources.map(r => ({
                value: r.resource_id,
                label: r.title || r.file_name || `资源#${r.resource_id}`
              }))}
            />
          </Form.Item>

          <Form.Item name="resource_title" label="资源名称（自动填充）">
            <Input placeholder="选择资源后自动填充，或手动输入" />
          </Form.Item>

          <Form.Item name="trigger_phrases" label="触发词">
            <Input placeholder="如：讲解大岛台，多个用逗号分隔" />
          </Form.Item>

          <Form.Item name="opening_speech" label="开场白（TTS）">
            <TextArea rows={2} placeholder="到达展项时的开场白" />
          </Form.Item>

          <Form.Item name="commentary" label="讲解词">
            <TextArea rows={4} placeholder="展项讲解详细内容" />
          </Form.Item>

          <Form.Item name="nav_position" label="导航位置">
            <Input placeholder="机器人导航点位名称（可选）" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="tts_delay_seconds" label="TTS延迟(秒)">
              <InputNumber min={0} max={30} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="ai_commentary_enabled" label="AI智能讲解" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="auto_tour_enabled" label="自动导览" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="note" label="备注">
            <Input placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
