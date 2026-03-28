import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Typography, Space, Select, message, Input, Spin,
} from 'antd'
import { EnvironmentOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { getNavPositions, saveNavPositions, getRobotPOIs } from '../api'

const { Title, Text } = Typography
const { Option } = Select

interface NavMapping {
  key: string
  cloudPosition: string
  robotPOI: string
}

const mockMappings: NavMapping[] = [
  { key: '1', cloudPosition: '展项A-入口', robotPOI: 'POI_001' },
  { key: '2', cloudPosition: '展项B-主台', robotPOI: 'POI_002' },
  { key: '3', cloudPosition: '展项C-演示区', robotPOI: 'POI_003' },
]
const mockPOIs = ['POI_001', 'POI_002', 'POI_003', 'POI_004', 'POI_005', 'HOME', 'CHARGE']

export default function NavPositions() {
  const [mappings, setMappings] = useState<NavMapping[]>(mockMappings)
  const [pois, setPois] = useState<string[]>(mockPOIs)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const data: any = await getNavPositions()
        if (data?.list) setMappings(data.list)
        const poiData: any = await getRobotPOIs()
        if (poiData?.list) setPois(poiData.list)
      } catch { /* use mock */ }
      setLoading(false)
    }
    fetch()
  }, [])

  const handleAdd = () => {
    setMappings((prev) => [...prev, { key: `new_${Date.now()}`, cloudPosition: '', robotPOI: '' }])
  }

  const handleDelete = (key: string) => {
    setMappings((prev) => prev.filter((m) => m.key !== key))
  }

  const handleChange = (key: string, field: keyof NavMapping, value: string) => {
    setMappings((prev) => prev.map((m) => m.key === key ? { ...m, [field]: value } : m))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveNavPositions({ list: mappings })
      message.success('点位映射已保存')
    } catch { message.error('保存失败') }
    setSaving(false)
  }

  const columns = [
    {
      title: '云平台展项点位', dataIndex: 'cloudPosition', key: 'cloudPosition',
      render: (v: string, record: NavMapping) => (
        <Input
          value={v}
          onChange={(e) => handleChange(record.key, 'cloudPosition', e.target.value)}
          placeholder="云平台点位名称"
          style={{ background: '#141414', borderColor: '#2a2a2a', color: '#fff' }}
        />
      ),
    },
    {
      title: '机器人 POI', dataIndex: 'robotPOI', key: 'robotPOI',
      render: (v: string, record: NavMapping) => (
        <Select
          value={v || undefined}
          onChange={(val) => handleChange(record.key, 'robotPOI', val)}
          placeholder="选择机器人POI"
          style={{ width: '100%' }}
        >
          {pois.map((p) => <Option key={p} value={p}>{p}</Option>)}
        </Select>
      ),
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: NavMapping) => (
        <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.key)} />
      ),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <EnvironmentOutlined style={{ marginRight: 8, color: '#1677ff' }} />点位映射
          </Title>
          <Space>
            <Button icon={<PlusOutlined />} onClick={handleAdd}>添加映射</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存</Button>
          </Space>
        </div>
        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 12 }}>
            左列为云平台展项点位名称，右列为机器人内部 POI 点位编号，建立一一对应关系
          </Text>
          <Table
            dataSource={mappings}
            columns={columns}
            rowKey="key"
            pagination={false}
          />
        </Card>
      </Space>
    </Spin>
  )
}
