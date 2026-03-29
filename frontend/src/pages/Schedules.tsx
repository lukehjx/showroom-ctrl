import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Tooltip } from 'antd'
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons'

interface ScheduledTask {
  id: number
  name: string
  cron_expr: string
  action_type: string
  action_config: Record<string, any> | null
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

const ACTION_TYPE_MAP: Record<string, string> = {
  trigger_preset: '触发接待套餐',
  daily_report: '每日播报',
  scene_switch: '切换场景',
  robot_nav: '机器人导航',
  custom: '自定义',
}

export default function SchedulesPage() {
  const [list, setList] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editTask, setEditTask] = useState<ScheduledTask | null>(null)
  const [form] = Form.useForm()

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/schedules')
      const json = await res.json()
      if (json.code === 0) setList(json.data || [])
    } catch {
      message.error('获取定时任务失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const openCreate = () => {
    setEditTask(null)
    form.resetFields()
    setModalVisible(true)
  }

  const openEdit = (task: ScheduledTask) => {
    setEditTask(task)
    form.setFieldsValue({
      name: task.name,
      cron_expr: task.cron_expr,
      action_type: task.action_type,
      enabled: task.enabled,
    })
    setModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      const body = {
        name: values.name,
        cron_expr: values.cron_expr,
        action_type: values.action_type,
        enabled: values.enabled ?? true,
      }
      const url = editTask ? `/api/schedules/${editTask.id}` : '/api/schedules'
      const method = editTask ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.code === 0) {
        message.success(editTask ? '任务已更新' : '任务已创建')
        setModalVisible(false)
        form.resetFields()
        fetchList()
      } else {
        message.error(json.message || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const res = await fetch(`/api/schedules/${id}/toggle`, { method: 'POST' })
      const json = await res.json()
      if (json.code === 0) {
        fetchList()
      } else {
        message.error(json.message || '切换失败')
      }
    } catch {
      message.error('切换失败')
    }
  }

  const handleRunNow = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}/run-now`, { method: 'POST' })
      const json = await res.json()
      if (json.code === 0) {
        message.success(`「${name}」已触发执行`)
      } else {
        message.warning(json.message || '触发失败，该接口可能不存在')
      }
    } catch {
      message.error('触发失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      message.success('已删除')
      fetchList()
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      render: (v: string) => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cron_expr',
      render: (v: string) => (
        <span style={{
          fontFamily: 'monospace', fontSize: 12,
          color: '#00d4ff',
          background: 'rgba(0,212,255,0.08)',
          padding: '2px 8px', borderRadius: 4,
        }}>{v}</span>
      ),
    },
    {
      title: '动作类型',
      dataIndex: 'action_type',
      render: (v: string) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {ACTION_TYPE_MAP[v] || v}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (v: boolean, row: ScheduledTask) => (
        <Switch
          checked={v}
          onChange={() => handleToggle(row.id)}
          style={{ background: v ? 'var(--accent-blue)' : undefined }}
        />
      ),
    },
    {
      title: '上次执行',
      dataIndex: 'last_run_at',
      render: (v: string | null) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v ? v.slice(0, 16) : '从未'}</span>,
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, row: ScheduledTask) => (
        <Space size={4}>
          <Tooltip title="立即执行">
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRunNow(row.id, row.name)}
              style={{ color: '#10b981', borderColor: '#10b98144', background: 'transparent' }}
            />
          </Tooltip>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
            style={{ color: 'var(--accent-blue)', borderColor: 'rgba(0,212,255,0.3)', background: 'transparent' }}
          />
          <Popconfirm title="确认删除此任务?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClockCircleOutlined style={{ fontSize: 20, color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>定时任务</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            共 {list.filter(t => t.enabled).length} 个启用 / {list.length} 个总计
          </span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}
        >新建任务</Button>
      </div>

      <div className="tech-card">
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          style={{ background: 'transparent' }}
          locale={{ emptyText: <span style={{ color: 'var(--text-muted)' }}>暂无定时任务</span> }}
        />
      </div>

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>{editTask ? '编辑定时任务' : '新建定时任务'}</span>}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText={editTask ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="如：每日开场" />
          </Form.Item>
          <Form.Item
            name="cron_expr"
            label="Cron 表达式"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            extra={<span style={{ color: 'var(--text-muted)', fontSize: 12 }}>如：0 9 * * *（每天09:00）</span>}
          >
            <Input placeholder="0 9 * * *" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="action_type" label="动作类型" rules={[{ required: true, message: '请选择动作类型' }]}>
            <Select
              options={Object.entries(ACTION_TYPE_MAP).map(([v, l]) => ({ value: v, label: l }))}
              placeholder="请选择"
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
