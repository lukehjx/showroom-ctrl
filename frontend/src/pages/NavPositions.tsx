import { useEffect, useState } from 'react'
import {
  Button, Table, Space, Input, Modal, Form, Select,
  message, Popconfirm, Tag, Typography, Card, Alert
} from 'antd'
import {
  EditOutlined, DeleteOutlined, ReloadOutlined,
  PlusOutlined, EnvironmentOutlined, InfoCircleOutlined,
  SyncOutlined, WarningOutlined
} from '@ant-design/icons'
import api from '../api'

const { Text } = Typography

interface NavPosition {
  id: number
  cloud_position_name: string
  robot_poi_name: string
  description: string | null
}

interface Terminal {
  id: number
  name: string
}

interface MapPositionsData {
  pois: string[]
  from_cache: boolean
}

export default function NavPositionsPage() {
  const [positions, setPositions] = useState<NavPosition[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [mapPositions, setMapPositions] = useState<MapPositionsData>({ pois: [], from_cache: false })
  const [loadingPois, setLoadingPois] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPos, setEditPos] = useState<NavPosition | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/api/nav-positions')
      if (res?.code === 0) setPositions(res.data)
      else message.error(res?.message || '加载失败')
    } catch {
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

  const fetchMapPositions = async (showMsg = false) => {
    setLoadingPois(true)
    try {
      const res: any = await api.get('/api/robot/map-positions')
      if (res?.code === 0) {
        setMapPositions(res.data)
        if (showMsg) {
          const count = res.data.pois?.length || 0
          if (count > 0) message.success(`已获取 ${count} 个POI点位`)
          else message.warning('机器人暂无POI数据')
        }
      }
    } catch {
      if (showMsg) message.error('获取POI列表失败')
    } finally {
      setLoadingPois(false)
    }
  }

  useEffect(() => {
    fetchPositions()
    fetchTerminals()
    fetchMapPositions()
  }, [])

  const openAdd = () => {
    setEditPos(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (pos: NavPosition) => {
    setEditPos(pos)
    form.setFieldsValue({
      cloud_position_name: pos.cloud_position_name,
      robot_poi_name: pos.robot_poi_name,
      description: pos.description,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      let res: any
      if (editPos) {
        res = await api.put(`/api/nav-positions/${editPos.id}`, values)
      } else {
        res = await api.post('/api/nav-positions', values)
      }
      if (res?.code === 0) {
        message.success(editPos ? '更新成功' : '添加成功')
        setModalOpen(false)
        fetchPositions()
      } else {
        message.error(res?.message || '保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res: any = await api.delete(`/api/nav-positions/${id}`)
      if (res?.code === 0) {
        message.success('已删除')
        fetchPositions()
      } else {
        message.error(res?.message || '删除失败')
      }
    } catch {
      message.error('删除失败')
    }
  }

  const mappedNames = new Set(positions.map(p => p.cloud_position_name))
  const unmappedCount = terminals.filter(t => !mappedNames.has(t.name)).length

  // POI 下拉选项：机器人上报的 + 当前已有映射里的（去重兜底）
  const existingPois = positions.map(p => p.robot_poi_name).filter(Boolean)
  const poiOptions = Array.from(new Set([...mapPositions.pois, ...existingPois]))
    .filter(Boolean)
    .sort()
    .map(p => ({ value: p, label: p }))

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{index + 1}</Text>
      ),
    },
    {
      title: '展厅终端名',
      dataIndex: 'cloud_position_name',
      render: (v: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent-blue)',
            boxShadow: '0 0 6px rgba(0,212,255,0.6)',
            display: 'inline-block', flexShrink: 0
          }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
        </div>
      ),
    },
    {
      title: '机器人 POI 名',
      dataIndex: 'robot_poi_name',
      render: (v: string) => (
        <Tag color="cyan" icon={<EnvironmentOutlined />} style={{ fontSize: 13 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'description',
      render: (v: string | null) => v
        ? <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, r: NavPosition) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm
            title="确认删除此映射？"
            onConfirm={() => handleDelete(r.id)}
            okText="删除" cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20 }}>
            <EnvironmentOutlined style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
            点位映射
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            展厅终端 ↔ 机器人导航点位
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPositions} loading={loading}>刷新列表</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增映射</Button>
        </Space>
      </div>

      {/* Info */}
      <Alert
        icon={<InfoCircleOutlined />}
        showIcon
        type="info"
        message="APK安装后，可从机器人读取POI列表。当前请手动填写机器人地图中的点位名称。"
        style={{
          marginBottom: 12,
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 8,
        }}
      />

      {/* POI 状态条 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', marginBottom: 16,
        background: 'rgba(15,22,40,0.7)',
        border: '1px solid rgba(0,212,255,0.12)',
        borderRadius: 8,
      }}>
        {mapPositions.pois.length > 0 ? (
          <>
            <span style={{ color: '#22c55e', fontSize: 13 }}>
              ● 已从机器人获取 {mapPositions.pois.length} 个POI点位
              {mapPositions.from_cache && (
                <span style={{ color: '#f59e0b', marginLeft: 6 }}>（历史数据）</span>
              )}
            </span>
          </>
        ) : (
          <span style={{ color: '#f59e0b', fontSize: 13 }}>
            <WarningOutlined style={{ marginRight: 6 }} />
            机器人尚未上报点位数据，请先安装APK并确保机器人连接
          </span>
        )}
        <Button
          size="small" icon={<SyncOutlined />}
          loading={loadingPois}
          onClick={() => fetchMapPositions(true)}
          style={{ marginLeft: 'auto' }}
        >
          刷新POI列表
        </Button>
      </div>

      {unmappedCount > 0 && (
        <Alert
          type="warning" showIcon
          message={`还有 ${unmappedCount} 个终端未配置导航点位映射，导览路线功能将无法为其导航。`}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {[
          { label: '已配置映射', value: positions.length, color: '#00d4ff' },
          { label: '终端总数', value: terminals.length, color: '#7c3aed' },
          { label: '未配置', value: unmappedCount, color: unmappedCount > 0 ? '#f59e0b' : '#22c55e' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1, padding: '14px 20px',
            background: 'rgba(15,22,40,0.85)',
            border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: stat.color, flexShrink: 0,
              boxShadow: `0 0 8px ${stat.color}80`
            }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card
        style={{ background: 'rgba(15,22,40,0.85)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={positions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: '暂无点位映射，点击「新增映射」开始配置' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: 'var(--accent-blue)' }} />
            {editPos ? '编辑点位映射' : '新增点位映射'}
          </div>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="cloud_position_name"
            label="展厅终端"
            rules={[{ required: true, message: '请选择展厅终端' }]}
            extra="选择需要配置导航点位的展厅终端"
          >
            <Select
              showSearch
              placeholder="选择展厅终端"
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={terminals.map(t => ({ value: t.name, label: t.name }))}
            />
          </Form.Item>

          <Form.Item
            name="robot_poi_name"
            label={
              <span>
                机器人 POI 名
                {mapPositions.from_cache && mapPositions.pois.length > 0 && (
                  <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>
                    （历史数据）
                  </span>
                )}
              </span>
            }
            rules={[{ required: true, message: '请选择或输入POI名称' }]}
            extra={
              poiOptions.length === 0
                ? '机器人未上报点位，可手动输入点位名称'
                : `已获取 ${poiOptions.length} 个点位，也可手动输入`
            }
          >
            <Select
              showSearch
              allowClear
              placeholder={poiOptions.length === 0 ? '手动输入POI名称（机器人未上报）' : '选择或搜索POI点位'}
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={poiOptions}
              notFoundContent={
                <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  <WarningOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
                  机器人尚未上报点位，请先连接机器人
                  <br />
                  <Button
                    size="small" type="link" icon={<SyncOutlined />}
                    loading={loadingPois}
                    onClick={() => fetchMapPositions(true)}
                    style={{ padding: '4px 0', marginTop: 4 }}
                  >
                    重新获取
                  </Button>
                </div>
              }
              // 允许自由输入（通过 onChange 配合 value）
              onSearch={(val) => {
                if (val) form.setFieldValue('robot_poi_name', val)
              }}
            />
          </Form.Item>

          <Form.Item name="description" label="备注">
            <Input placeholder="可选备注说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
