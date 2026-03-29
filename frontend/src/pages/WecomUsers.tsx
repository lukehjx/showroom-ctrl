import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag } from 'antd'
import { EditOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons'

interface WecomUser {
  id: number
  userid: string
  display_name: string
  self_reported_name: string
  name_confirmed: boolean
  first_seen_at: string
  updated_at: string
}

export default function WecomUsersPage() {
  const [list, setList] = useState<WecomUser[]>([])
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState<WecomUser | null>(null)
  const [editVisible, setEditVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wecom-users')
      const json = await res.json()
      if (json.code === 0) setList(json.data || [])
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const openEdit = (user: WecomUser) => {
    setEditUser(user)
    form.setFieldsValue({ display_name: user.display_name || '' })
    setEditVisible(true)
  }

  const handleEdit = async (values: any) => {
    if (!editUser) return
    try {
      const res = await fetch(`/api/wecom-users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: values.display_name, name_confirmed: true }),
      })
      const json = await res.json()
      if (json.code === 0) {
        message.success('姓名已更新')
        setEditVisible(false)
        form.resetFields()
        fetchList()
      } else {
        message.error(json.message || '更新失败')
      }
    } catch {
      message.error('更新失败')
    }
  }

  const columns = [
    {
      title: '企微 Key',
      dataIndex: 'userid',
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
      title: '显示姓名',
      dataIndex: 'display_name',
      render: (v: string, row: WecomUser) => (
        <Space size={6}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v || '-'}</span>
          {row.name_confirmed && (
            <CheckCircleOutlined style={{ color: '#10b981', fontSize: 13 }} title="已确认" />
          )}
        </Space>
      ),
    },
    {
      title: '自报姓名',
      dataIndex: 'self_reported_name',
      render: (v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'name_confirmed',
      render: (v: boolean) => v
        ? <Tag style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144', borderRadius: 4 }}>已确认</Tag>
        : <Tag style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 4 }}>待确认</Tag>,
    },
    {
      title: '首次出现',
      dataIndex: 'first_seen_at',
      render: (v: string) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v ? v.slice(0, 16) : '-'}</span>,
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, row: WecomUser) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(row)}
          style={{ color: 'var(--accent-blue)', borderColor: 'rgba(0,212,255,0.3)', background: 'transparent' }}
        >编辑</Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <TeamOutlined style={{ fontSize: 20, color: 'var(--accent-blue)' }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>企微用户档案</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
          共 {list.length} 位用户
        </span>
      </div>

      <div
        className="tech-card"
        style={{ marginBottom: 16, padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}
      >
        💡 用户通过企微Bot交互后自动录入。管理员可设置「显示姓名」覆盖用户自报名，确认后生效。
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
          locale={{ emptyText: <span style={{ color: 'var(--text-muted)' }}>暂无用户记录</span> }}
        />
      </div>

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>编辑用户姓名</span>}
        open={editVisible}
        onCancel={() => { setEditVisible(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        {editUser && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(0,212,255,0.06)', borderRadius: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>用户Key: </span>
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{editUser.userid}</span>
            {editUser.self_reported_name && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 16 }}>自报名: </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{editUser.self_reported_name}</span>
              </>
            )}
          </div>
        )}
        <Form form={form} onFinish={handleEdit} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="display_name"
            label="显示姓名"
            extra={<span style={{ color: 'var(--text-muted)', fontSize: 12 }}>留空则使用自报姓名</span>}
          >
            <Input placeholder="管理员设置的姓名（优先级最高）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
