import { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, Switch, message, Popconfirm, Tag, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons'
import api, { triggerPreset } from '../api'

interface Preset { id: number; name: string; description: string; icon: string; color: string; sort_order: number; enabled: boolean; created_at: string }

const COLORS = ['#00d4ff', '#7c3aed', '#00ff88', '#ff6b35', '#ff4757', '#ffd32a', '#a29bfe', '#fd79a8']
const ICONS = ['🎯', '🏆', '🌟', '🎪', '🎭', '🎬', '🏛️', '🚀', '💡', '🔮', '🎊', '🌈']

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [form] = Form.useForm()
  const [triggering, setTriggering] = useState<number | null>(null)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0])

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/presets')
      if (Array.isArray(res?.data)) setPresets(res.data)
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setSelectedColor(COLORS[0])
    setSelectedIcon(ICONS[0])
    form.resetFields()
    form.setFieldsValue({ icon: ICONS[0], color: COLORS[0], enabled: true, sort_order: 0 })
    setModalOpen(true)
  }

  const openEdit = (p: Preset) => {
    setEditing(p)
    setSelectedColor(p.color || COLORS[0])
    setSelectedIcon(p.icon || ICONS[0])
    form.setFieldsValue({ ...p })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const vals = await form.validateFields()
    vals.color = selectedColor
    vals.icon = selectedIcon
    try {
      if (editing) {
        await api.put(`/api/presets/${editing.id}`, vals)
        message.success('更新成功')
      } else {
        await api.post('/api/presets', vals)
        message.success('创建成功')
      }
      setModalOpen(false)
      load()
    } catch (e) { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/presets/${id}`)
      message.success('删除成功')
      load()
    } catch (e) { message.error('删除失败') }
  }

  const handleTrigger = async (id: number) => {
    setTriggering(id)
    try {
      await triggerPreset(id)
      message.success('套餐已启动')
    } catch (e) { message.error('启动失败') }
    finally { setTriggering(null) }
  }

  return (
    <div style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>接待套餐</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>管理展厅接待流程套餐</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{
          background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600
        }}>
          新建套餐
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {presets.map(p => (
            <div
              key={p.id}
              className="tech-card"
              style={{
                padding: 0, overflow: 'hidden',
                borderColor: p.color ? `${p.color}44` : 'var(--border-glow)',
                opacity: p.enabled ? 1 : 0.55,
                position: 'relative'
              }}
            >
              {/* Color strip */}
              <div style={{
                height: 4, background: `linear-gradient(90deg, ${p.color || 'var(--accent-blue)'}, transparent)`
              }} />

              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${p.color || 'var(--accent-blue)'}18`,
                    border: `1px solid ${p.color || 'var(--accent-blue)'}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0
                  }}>
                    {p.icon || '🎯'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{p.description || '—'}</div>
                  </div>
                  {!p.enabled && <Tag color="default" style={{ flexShrink: 0 }}>禁用</Tag>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={triggering === p.id}
                    disabled={!p.enabled}
                    onClick={() => handleTrigger(p.id)}
                    style={{
                      flex: 1, height: 38, fontWeight: 600,
                      background: `linear-gradient(135deg, ${p.color || 'var(--accent-blue)'}, ${p.color || '#7c3aed'}99)`,
                      border: 'none',
                      boxShadow: `0 4px 16px ${p.color || 'var(--accent-blue)'}33`
                    }}
                  >
                    一键启动
                  </Button>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(p)} style={{
                    background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)',
                    color: 'var(--text-secondary)', width: 38, padding: 0
                  }} />
                  <Popconfirm title="确认删除？" onConfirm={() => handleDelete(p.id)}>
                    <Button icon={<DeleteOutlined />} danger style={{
                      background: 'rgba(255,71,87,0.08)', borderColor: 'rgba(255,71,87,0.2)',
                      color: 'var(--danger)', width: 38, padding: 0
                    }} />
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}

          {presets.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: 60,
              color: 'var(--text-muted)', fontSize: 15
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              暂无接待套餐，点击右上角创建
            </div>
          )}
        </div>
      )}

      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>{editing ? '编辑套餐' : '新建套餐'}</span>}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        styles={{ body: { background: 'var(--bg-secondary)' }, header: { background: 'var(--bg-secondary)' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="套餐名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：VIP接待" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
          <Form.Item label="图标">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ICONS.map(icon => (
                <div
                  key={icon}
                  onClick={() => { setSelectedIcon(icon); form.setFieldValue('icon', icon) }}
                  style={{
                    width: 36, height: 36, fontSize: 20,
                    borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: selectedIcon === icon ? '2px solid var(--accent-blue)' : '1px solid var(--border-glow)',
                    background: selectedIcon === icon ? 'rgba(0,212,255,0.1)' : 'transparent'
                  }}
                >{icon}</div>
              ))}
            </div>
          </Form.Item>
          <Form.Item label="主题色">
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => { setSelectedColor(c); form.setFieldValue('color', c) }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: selectedColor === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: selectedColor === c ? `0 0 8px ${c}` : 'none'
                  }}
                />
              ))}
            </div>
          </Form.Item>
          <Form.Item label="排序" name="sort_order">
            <Input type="number" defaultValue={0} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
