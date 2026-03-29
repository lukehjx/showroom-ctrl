import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Space, Tag, Popconfirm } from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface Appointment {
  id: number
  creator_userid: string
  creator_name: string
  visitor_name: string
  visit_time: string
  purpose: string
  attendees: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string
  created_at: string
}

const STATUS_MAP = {
  pending: { label: '待确认', color: '#f59e0b' },
  confirmed: { label: '已确认', color: '#10b981' },
  cancelled: { label: '已取消', color: '#6b7280' },
}

export default function AppointmentsPage() {
  const [list, setList] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [createVisible, setCreateVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchList = async (status?: string) => {
    setLoading(true)
    try {
      const qs = status ? `?status=${status}` : ''
      const res = await fetch(`/api/appointments${qs}`)
      const json = await res.json()
      if (json.code === 0) setList(json.data || [])
    } catch {
      message.error('获取预约列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList(filterStatus) }, [filterStatus])

  const handleCreate = async (values: any) => {
    try {
      const body = {
        visitor_name: values.visitor_name,
        visit_time: values.visit_time?.format('YYYY-MM-DD HH:mm:ss'),
        purpose: values.purpose || '',
        notes: values.notes || '',
        creator_name: '',
        creator_userid: '',
      }
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.code === 0) {
        message.success('预约创建成功')
        setCreateVisible(false)
        form.resetFields()
        fetchList(filterStatus)
      } else {
        message.error(json.message || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const handlePatch = async (id: number, fields: Record<string, any>) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (json.code === 0) {
        message.success('操作成功')
        fetchList(filterStatus)
      } else {
        message.error(json.message || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
      message.success('已删除')
      fetchList(filterStatus)
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      render: (v: number) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{v}</span>,
    },
    {
      title: '访客姓名',
      dataIndex: 'visitor_name',
      render: (v: string) => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '来访时间',
      dataIndex: 'visit_time',
      render: (v: string) => v ? <span style={{ color: 'var(--text-secondary)' }}>{dayjs(v).format('MM/DD HH:mm')}</span> : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => {
        const s = STATUS_MAP[v as keyof typeof STATUS_MAP] || { label: v, color: '#6b7280' }
        return <Tag style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}44`, borderRadius: 4 }}>{s.label}</Tag>
      },
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      render: (v: string) => <span style={{ color: 'var(--text-secondary)' }}>{v || '-'}</span>,
    },
    {
      title: '备注',
      dataIndex: 'notes',
      ellipsis: true,
      render: (v: string) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v || '-'}</span>,
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, row: Appointment) => (
        <Space size={4}>
          {row.status === 'pending' && (
            <>
              <Button
                size="small"
                icon={<CheckOutlined />}
                style={{ color: '#10b981', borderColor: '#10b98144', background: 'transparent', fontSize: 12 }}
                onClick={() => handlePatch(row.id, { status: 'confirmed' })}
              >确认</Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                style={{ color: '#f59e0b', borderColor: '#f59e0b44', background: 'transparent', fontSize: 12 }}
                onClick={() => handlePatch(row.id, { status: 'cancelled' })}
              >取消</Button>
            </>
          )}
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" icon={<DeleteOutlined />} type="text" danger style={{ fontSize: 12 }} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarOutlined style={{ fontSize: 20, color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>预约管理</span>
        </div>
        <Space>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'pending', label: '待确认' },
              { value: 'confirmed', label: '已确认' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateVisible(true)}
            style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}
          >新建预约</Button>
        </Space>
      </div>

      <div className="tech-card">
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          style={{ background: 'transparent' }}
        />
      </div>

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>新建预约</span>}
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} onFinish={handleCreate} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="visitor_name" label="访客姓名" rules={[{ required: true, message: '请输入访客姓名' }]}>
            <Input placeholder="请输入访客姓名" />
          </Form.Item>
          <Form.Item name="visit_time" label="来访时间" rules={[{ required: true, message: '请选择来访时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item name="purpose" label="来访事由">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
