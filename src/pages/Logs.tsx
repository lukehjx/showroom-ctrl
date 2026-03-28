import { useState, useEffect } from 'react'
import { Card, Table, Typography, Space, Tag, Input, Button } from 'antd'
import { FileTextOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { getOperationLogs } from '../api'

const { Title, Text } = Typography
const { Search } = Input

const mockLogs = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  action: ['切换专场', '机器人导航', '投放资源', 'TCP发送', 'HTTP请求', '开启展厅', '关闭展厅'][i % 7],
  source: ['系统', '流程', '展项', '手动', 'API'][i % 5],
  time: `2024-01-15 ${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${String(i * 2 % 60).padStart(2, '0')}:00`,
  result: i % 4 === 3 ? '连接失败' : '执行成功',
  status: i % 4 === 3 ? 'error' : 'success',
}))

export default function Logs() {
  const [logs, setLogs] = useState<any[]>(mockLogs)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })

  const fetchLogs = async (page = 1, keyword = '') => {
    setLoading(true)
    try {
      const data: any = await getOperationLogs({ page, pageSize: 15, keyword })
      if (data?.list) {
        setLogs(data.list)
        setPagination((p) => ({ ...p, current: page, total: data.total || data.list.length }))
      }
    } catch { /* use mock */ }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = logs.filter((l) =>
    !search || l.action?.includes(search) || l.source?.includes(search) || l.result?.includes(search)
  )

  const columns = [
    {
      title: '时间', dataIndex: 'time', key: 'time',
      render: (v: string) => <Text style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{v}</Text>
    },
    { title: '操作', dataIndex: 'action', key: 'action', render: (v: string) => <Text style={{ color: '#fff' }}>{v}</Text> },
    { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: '结果', dataIndex: 'result', key: 'result',
      render: (v: string, record: any) => (
        <Text style={{ color: record.status === 'error' ? '#ff4d4f' : '#52c41a' }}>{v}</Text>
      )
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag>
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />操作日志
        </Title>
        <Space>
          <Search placeholder="搜索日志..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} prefix={<SearchOutlined />} />
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>刷新</Button>
        </Space>
      </div>
      <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total || filtered.length,
            onChange: (page) => fetchLogs(page, search),
          }}
        />
      </Card>
    </Space>
  )
}
