import { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, Switch, Tag, Spin, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, BranchesOutlined } from '@ant-design/icons'
import api from '../api'

interface Route { id: number; name: string; path: string; description: string; enabled: boolean; created_at: string }
interface Lane { id: number; route_id: number; name: string; sort_order: number }
interface Step { id: number; lane_id: number; action_type: string; action_config: any; description: string; sort_order: number }

const ACTION_COLOR: Record<string, string> = {
  http: '#00d4ff', tcp: '#7c3aed', wait: '#ffd32a',
  log: '#00ff88', scene: '#ff6b35', default: '#8fa3bc'
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<number | null>(null)
  const [lanes, setLanes] = useState<Record<number, Lane[]>>({})
  const [steps, setSteps] = useState<Record<number, Step[]>>({})
  const [form] = Form.useForm()
  const [triggering, setTriggering] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/routes')
      if (Array.isArray(res?.data)) setRoutes(res.data)
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadLanes = async (routeId: number) => {
    try {
      const res: any = await api.get(`/api/routes/${routeId}/lanes`)
      if (Array.isArray(res?.data)) {
        setLanes(prev => ({ ...prev, [routeId]: res.data }))
        // load steps for each lane
        for (const lane of res.data) {
          const sRes: any = await api.get(`/api/lanes/${lane.id}/steps`)
          if (Array.isArray(sRes?.data)) {
            setSteps(prev => ({ ...prev, [lane.id]: sRes.data }))
          }
        }
      }
    } catch (e) { }
  }

  const handleExpand = (routeId: number) => {
    if (expandedRoute === routeId) { setExpandedRoute(null); return }
    setExpandedRoute(routeId)
    if (!lanes[routeId]) loadLanes(routeId)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true })
    setModalOpen(true)
  }

  const openEdit = (r: Route) => {
    setEditing(r)
    form.setFieldsValue({ ...r })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const vals = await form.validateFields()
    try {
      if (editing) {
        await api.put(`/api/routes/${editing.id}`, vals)
        message.success('更新成功')
      } else {
        await api.post('/api/routes', vals)
        message.success('创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e) { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try { await api.delete(`/api/routes/${id}`); message.success('删除成功'); load() }
    catch (e) { message.error('删除失败') }
  }

  const handleTrigger = async (id: number) => {
    setTriggering(id)
    try { await api.post(`/api/routes/${id}/trigger`); message.success('流程已触发') }
    catch (e) { message.error('触发失败') }
    finally { setTriggering(null) }
  }

  return (
    <div style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>流程管理</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>配置和管理展厅自动化流程</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{
          background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600
        }}>
          新建流程
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {routes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔀</div>
              暂无流程，点击右上角创建
            </div>
          )}
          {routes.map(r => (
            <div key={r.id} className="tech-card" style={{ overflow: 'hidden', opacity: r.enabled ? 1 : 0.6 }}>
              {/* Route header */}
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0
                }}>
                  <BranchesOutlined style={{ color: 'var(--accent-blue)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.name}
                    {!r.enabled && <Tag color="default" style={{ marginLeft: 8, fontSize: 11 }}>禁用</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {r.path && <code style={{ color: 'var(--accent-blue)', background: 'rgba(0,212,255,0.08)', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{r.path}</code>}
                    {r.description}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={triggering === r.id}
                    disabled={!r.enabled}
                    onClick={() => handleTrigger(r.id)}
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none' }}
                  >
                    触发
                  </Button>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} style={{
                    background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-secondary)'
                  }} />
                  <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
                    <Button size="small" icon={<DeleteOutlined />} danger style={{
                      background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)', color: 'var(--danger)'
                    }} />
                  </Popconfirm>
                  <Button
                    size="small"
                    onClick={() => handleExpand(r.id)}
                    style={{
                      background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.2)',
                      color: 'var(--accent-purple)', minWidth: 60
                    }}
                  >
                    {expandedRoute === r.id ? '收起' : '展开'}
                  </Button>
                </div>
              </div>

              {/* Lanes & Steps */}
              {expandedRoute === r.id && (
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '14px 20px'
                }}>
                  {!lanes[r.id] ? (
                    <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
                  ) : lanes[r.id].length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>暂无泳道</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {lanes[r.id].map(lane => (
                        <div key={lane.id} style={{ borderLeft: '2px solid var(--accent-purple)', paddingLeft: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 8 }}>
                            泳道：{lane.name}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {(steps[lane.id] || []).map((step, si) => (
                              <div key={step.id} style={{
                                padding: '6px 12px', borderRadius: 6,
                                background: `${ACTION_COLOR[step.action_type] || ACTION_COLOR.default}14`,
                                border: `1px solid ${ACTION_COLOR[step.action_type] || ACTION_COLOR.default}33`,
                                display: 'flex', alignItems: 'center', gap: 6
                              }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{si + 1}</span>
                                <Tag color={ACTION_COLOR[step.action_type] || 'default'} style={{ margin: 0, fontSize: 10 }}>{step.action_type}</Tag>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{step.description || step.action_type}</span>
                              </div>
                            ))}
                            {(steps[lane.id] || []).length === 0 && (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>无步骤</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>{editing ? '编辑流程' : '新建流程'}</span>}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        styles={{ body: { background: 'var(--bg-secondary)' }, header: { background: 'var(--bg-secondary)' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="流程名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="如：VIP接待流程" />
          </Form.Item>
          <Form.Item label="路径标识" name="path">
            <Input placeholder="如：/vip-reception" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
