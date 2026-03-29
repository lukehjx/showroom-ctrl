import { useEffect, useState } from 'react'
import {
  Button, Table, Space, Switch, Input, Modal, Form, Select,
  message, Popconfirm, Tag, Typography, Card
} from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined, EditOutlined,
  DeleteOutlined, ReloadOutlined, PlusOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import api from '../api'

const { Text } = Typography
const { TextArea } = Input

interface TourStop {
  id: number
  robot_sn: string
  terminal_id: number
  terminal_name: string
  nav_poi_name: string | null
  order_index: number
  welcome_text: string | null
  enabled: boolean
  note: string | null
}

interface Terminal {
  id: number
  name: string
}

export default function TourStopsPage() {
  const [stops, setStops] = useState<TourStop[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(false)
  const [initing, setIniting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStop, setEditStop] = useState<TourStop | null>(null)
  const [form] = Form.useForm()

  const fetchStops = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/tour-stops')
      if (res?.code === 0) setStops(res.data)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTerminals = async () => {
    try {
      const res: any = await api.get('/api/terminals')
      if (res?.code === 0) setTerminals(res.data)
    } catch {}
  }

  useEffect(() => {
    fetchStops()
    fetchTerminals()
  }, [])

  const handleInit = async () => {
    setIniting(true)
    try {
      const res: any = await api.post('/api/tour-stops/init')
      if (res?.code === 0) {
        message.success(res.data?.message || '初始化成功')
        fetchStops()
      } else {
        message.error(res?.message || '初始化失败')
      }
    } catch {
      message.error('初始化失败')
    } finally {
      setIniting(false)
    }
  }

  const handleOrder = async (id: number, direction: 'up' | 'down') => {
    try {
      const res: any = await api.patch(`/api/tour-stops/${id}/order`, { direction })
      if (res?.code === 0) fetchStops()
      else message.error(res?.message || '排序失败')
    } catch {
      message.error('排序失败')
    }
  }

  const handleToggle = async (stop: TourStop) => {
    try {
      const res: any = await api.put(`/api/tour-stops/${stop.id}`, { enabled: !stop.enabled })
      if (res?.code === 0) fetchStops()
      else message.error(res?.message || '操作失败')
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res: any = await api.delete(`/api/tour-stops/${id}`)
      if (res?.code === 0) {
        message.success('已删除')
        fetchStops()
      } else {
        message.error(res?.message || '删除失败')
      }
    } catch {
      message.error('删除失败')
    }
  }

  const openEdit = (stop: TourStop | null) => {
    setEditStop(stop)
    if (stop) {
      form.setFieldsValue({
        terminal_id: stop.terminal_id,
        nav_poi_name: stop.nav_poi_name,
        welcome_text: stop.welcome_text,
        note: stop.note,
      })
    } else {
      form.resetFields()
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const terminal = terminals.find(t => t.id === values.terminal_id)
    const payload = {
      ...values,
      terminal_name: terminal?.name || '',
    }
    try {
      let res: any
      if (editStop) {
        res = await api.put(`/api/tour-stops/${editStop.id}`, payload)
      } else {
        res = await api.post('/api/tour-stops', payload)
      }
      if (res?.code === 0) {
        message.success(editStop ? '更新成功' : '添加成功')
        setModalOpen(false)
        fetchStops()
      } else {
        message.error(res?.message || '保存失败')
      }
    } catch {
      message.error('保存失败')
    }
  }

  const columns = [
    {
      title: '序号',
      dataIndex: 'order_index',
      width: 70,
      render: (v: number) => (
        <Tag color="blue" style={{ fontSize: 14, minWidth: 32, textAlign: 'center' }}>{v}</Tag>
      ),
    },
    {
      title: '终端名称',
      dataIndex: 'terminal_name',
      render: (v: string, r: TourStop) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v || `终端#${r.terminal_id}`}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {r.terminal_id}</div>
        </div>
      ),
    },
    {
      title: '导航POI',
      dataIndex: 'nav_poi_name',
      render: (v: string | null) => v
        ? <Tag color="cyan">{v}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>未配置</Text>,
    },
    {
      title: '欢迎词',
      dataIndex: 'welcome_text',
      ellipsis: true,
      render: (v: string | null) => v
        ? <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>-</Text>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean, r: TourStop) => (
        <Switch checked={v} size="small" onChange={() => handleToggle(r)} />
      ),
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, r: TourStop, index: number) => (
        <Space size={4}>
          <Button
            size="small" icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => handleOrder(r.id, 'up')}
            title="上移"
          />
          <Button
            size="small" icon={<ArrowDownOutlined />}
            disabled={index === stops.length - 1}
            onClick={() => handleOrder(r.id, 'down')}
            title="下移"
          />
          <Button
            size="small" icon={<EditOutlined />}
            onClick={() => openEdit(r)}
            title="编辑"
          />
          <Popconfirm
            title="确认删除该站点？"
            onConfirm={() => handleDelete(r.id)}
            okText="删除" cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />} title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
            导览路线管理
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            配置机器人导览停靠站点、导航POI和欢迎词
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchStops} loading={loading}>刷新</Button>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            loading={initing}
            onClick={handleInit}
            style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}
          >
            初始化默认路线
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit(null)}>
            添加站点
          </Button>
        </Space>
      </div>

      <Card
        style={{ background: 'rgba(15,22,40,0.85)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={stops}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          style={{ borderRadius: 10 }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title={editStop ? '编辑站点' : '添加站点'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="terminal_id"
            label="终端"
            rules={[{ required: true, message: '请选择终端' }]}
          >
            <Select
              showSearch
              placeholder="选择展厅终端"
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={terminals.map(t => ({ value: t.id, label: `${t.name} (ID:${t.id})` }))}
            />
          </Form.Item>
          <Form.Item name="nav_poi_name" label="导航POI名">
            <Input placeholder="机器人导航POI名称（可选）" />
          </Form.Item>
          <Form.Item name="welcome_text" label="欢迎词（TTS文本）">
            <TextArea rows={3} placeholder="到达该终端时机器人播报的内容" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
