import { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, Switch, message, Popconfirm, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, RobotOutlined } from '@ant-design/icons'
import api from '../api'

interface Robot { id: number; sn: string; name: string; app_key: string; webhook_url: string; enabled: boolean }

export default function RobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Robot | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/robots')
      if (Array.isArray(res?.data)) setRobots(res.data)
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true })
    setModalOpen(true)
  }

  const openEdit = (r: Robot) => {
    setEditing(r)
    form.setFieldsValue({ ...r })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const vals = await form.validateFields()
    try {
      if (editing) {
        await api.put(`/api/robots/${editing.id}`, vals)
        message.success('更新成功')
      } else {
        await api.post('/api/robots', vals)
        message.success('创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e) { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try { await api.delete(`/api/robots/${id}`); message.success('删除成功'); load() }
    catch (e) { message.error('删除失败') }
  }

  return (
    <div style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>机器人配置</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>管理展厅服务机器人</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{
          background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600
        }}>
          添加机器人
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {robots.map(r => (
            <div key={r.id} className="tech-card" style={{
              padding: '20px 22px',
              borderColor: r.enabled ? 'rgba(0,255,136,0.2)' : 'var(--border-glow)',
              opacity: r.enabled ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: r.enabled ? 'rgba(0,255,136,0.1)' : 'rgba(143,163,188,0.1)',
                  border: `1px solid ${r.enabled ? 'rgba(0,255,136,0.3)' : 'rgba(143,163,188,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: r.enabled ? '0 0 16px rgba(0,255,136,0.15)' : 'none'
                }}>
                  <RobotOutlined style={{ fontSize: 24, color: r.enabled ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                    <span className={`status-dot ${r.enabled ? 'online' : 'offline'}`} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    SN: <code style={{ color: 'var(--accent-blue)', background: 'rgba(0,212,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>{r.sn || '—'}</code>
                  </div>
                </div>
              </div>

              {r.webhook_url && (
                <div style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(0,0,0,0.2)', marginBottom: 14,
                  fontSize: 11, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  Webhook: {r.webhook_url}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<EditOutlined />} onClick={() => openEdit(r)} style={{
                  flex: 1, background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-secondary)'
                }}>
                  编辑
                </Button>
                <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
                  <Button icon={<DeleteOutlined />} danger style={{
                    background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)', color: 'var(--danger)'
                  }} />
                </Popconfirm>
              </div>
            </div>
          ))}

          {robots.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: 60,
              color: 'var(--text-muted)', fontSize: 15
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              暂无机器人配置
            </div>
          )}
        </div>
      )}

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>{editing ? '编辑机器人' : '添加机器人'}</span>}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        styles={{ body: { background: 'var(--bg-secondary)' }, header: { background: 'var(--bg-secondary)' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="机器人名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="如：大厅迎宾机器人" />
          </Form.Item>
          <Form.Item label="序列号 (SN)" name="sn">
            <Input placeholder="设备SN号" />
          </Form.Item>
          <Form.Item label="App Key" name="app_key">
            <Input placeholder="机器人 App Key" />
          </Form.Item>
          <Form.Item label="Webhook URL" name="webhook_url">
            <Input placeholder="http://..." />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
