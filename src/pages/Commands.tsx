import { useState, useEffect } from 'react'
import { Card, Table, Typography, Space, Tag, Button, Input, message, Spin } from 'antd'
import { CodeOutlined, SearchOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { getCommands } from '../api'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography
const { Search } = Input

const mockCommands = [
  { id: '1', name: '灯光开启', group: 'lighting', type: 'TCP', host: '192.168.1.50', port: 8080, data: 'LIGHT_ON', description: '开启主展厅灯光' },
  { id: '2', name: '灯光关闭', group: 'lighting', type: 'TCP', host: '192.168.1.50', port: 8080, data: 'LIGHT_OFF', description: '关闭主展厅灯光' },
  { id: '3', name: '幕布升起', group: 'curtain', type: 'HTTP', url: 'http://192.168.1.60/up', method: 'GET', description: '升起投影幕布' },
  { id: '4', name: '幕布降落', group: 'curtain', type: 'HTTP', url: 'http://192.168.1.60/down', method: 'GET', description: '降落投影幕布' },
  { id: '5', name: '音量调高', group: 'audio', type: 'TCP', host: '192.168.1.55', port: 9000, data: 'VOL+10', description: '音量增加10%' },
]

export default function Commands() {
  const [commands, setCommands] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const data: any = await getCommands()
        setCommands(data?.list || data || mockCommands)
      } catch { setCommands(mockCommands) }
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = commands.filter((c) =>
    !search || c.name?.includes(search) || c.group?.includes(search) || c.description?.includes(search)
  )

  const handleAddToFlow = (cmd: any) => {
    message.success(`已将「${cmd.name}」添加到流程编辑器`)
    navigate('/routes')
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ color: '#fff', fontWeight: 500 }}>{v}</Text> },
    { title: '分组', dataIndex: 'group', key: 'group', render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'TCP' ? 'orange' : 'cyan'}>{v}</Tag>
    },
    {
      title: '详情', key: 'detail',
      render: (_: unknown, record: any) => record.type === 'TCP'
        ? <Text style={{ color: '#888', fontSize: 12 }}>{record.host}:{record.port} → {record.data}</Text>
        : <Text style={{ color: '#888', fontSize: 12 }}>{record.method} {record.url}</Text>
    },
    { title: '描述', dataIndex: 'description', key: 'description', render: (v: string) => <Text style={{ color: '#888', fontSize: 12 }}>{v}</Text> },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: any) => (
        <Button size="small" type="primary" ghost icon={<PlusSquareOutlined />} onClick={() => handleAddToFlow(record)}>
          添加到流程
        </Button>
      ),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <CodeOutlined style={{ marginRight: 8, color: '#1677ff' }} />命令库
          </Title>
          <Search
            placeholder="搜索命令..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
        </div>
        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 15 }}
          />
        </Card>
      </Space>
    </Spin>
  )
}
