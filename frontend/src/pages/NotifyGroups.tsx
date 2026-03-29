import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, message, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, NotificationOutlined } from '@ant-design/icons'

interface NotifyGroup {
  id: number
  name: string
  chat_id: string
  enabled: boolean
  notify_types: string
  created_at: string
}

export default function NotifyGroupsPage() {
  const [list, setList] = useState<NotifyGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notify-groups')
      const json = await res.json()
      if (json.code === 0) setList(json.data || [])
    } catch {
      message.error('获取通知群列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch('/api/notify-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, chat_id: values.chat_id }),
      })
      const json = await res.json()
      if (json.code === 0) {
        message.success('通知群添加成功')
        setCreateVisible(false)
        form.resetFields()
        fetchList()
      } else {
        message.error(json.message || '添加失败')
      }
    } catch {
      message.error('添加失败')
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const res = await fetch(`/api/notify-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const json = await res.json()
      if (json.code === 0) {
        fetchList()
      } else {
        message.error(json.message || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/notify-groups/${id}`, { method: 'DELETE' })
      message.success('已删除')
      fetchList()
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: '群名称',
      dataIndex: 'name',
      render: (v: string) => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '群ID',
      dataIndex: 'chat_id',
      render: (v: string) => (
        <span style={{
          fontFamily: 'monospace', fontSize: 12,
          color: 'var(--text-muted)',
          background: 'rgba(0,212,255,0.06)',
          padding: '2px 8px', borderRadius: 4,
        }}>{v}</span>
      ),
    },
    {
      title: '通知类型',
      dataIndex: 'notify_types',
      render: (v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v || '全部'}</span>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      render: (v: boolean, row: NotifyGroup) => (
        <Switch
          checked={v}
          onChange={(checked) => handleToggle(row.id, checked)}
          style={{ background: v ? 'var(--accent-blue)' : undefined }}
        />
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, row: NotifyGroup) => (
        <Popconfirm title="确认删除此通知群?" onConfirm={() => handleDelete(row.id)}>
          <Button size="small" icon={<DeleteOutlined />} type="text" danger />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotificationOutlined style={{ fontSize: 20, color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>通知群配置</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateVisible(true)}
          style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}
        >新增通知群</Button>
      </div>

      <div
        className="tech-card"
        style={{ marginBottom: 16, padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}
      >
        💡 通知群用于接收预约提醒、访客到访、系统告警等消息推送。请填写企业微信群的 Chat ID。
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
          locale={{ emptyText: <span style={{ color: 'var(--text-muted)' }}>暂无通知群，点击右上角添加</span> }}
        />
      </div>

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>新增通知群</span>}
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} onFinish={handleCreate} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="群名称" rules={[{ required: true, message: '请输入群名称' }]}>
            <Input placeholder="如：展厅运营群" />
          </Form.Item>
          <Form.Item
            name="chat_id"
            label="群 Chat ID"
            rules={[{ required: true, message: '请输入群 Chat ID' }]}
            extra={<span style={{ color: 'var(--text-muted)', fontSize: 12 }}>企业微信群的唯一标识符</span>}
          >
            <Input placeholder="如：MC1BCN2K100..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
