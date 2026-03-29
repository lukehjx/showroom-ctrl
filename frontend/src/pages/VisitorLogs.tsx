import { useState, useEffect } from 'react'
import { Table, Tag, message, Input } from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'

interface VisitorLog {
  id: number
  robot_sn: string
  visitor_name: string
  visitor_dept: string
  remote_face_id: string
  is_employee: boolean
  arrived_at: string
  left_at: string
  terminals_visited: string
  note: string
}

export default function VisitorLogsPage() {
  const [list, setList] = useState<VisitorLog[]>([])
  const [filtered, setFiltered] = useState<VisitorLog[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/visitor-logs')
      const json = await res.json()
      if (json.code === 0) {
        setList(json.data || [])
        setFiltered(json.data || [])
      }
    } catch {
      message.error('获取访客记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(list)
    } else {
      const q = search.toLowerCase()
      setFiltered(list.filter(r =>
        (r.visitor_name || '').toLowerCase().includes(q) ||
        (r.visitor_dept || '').toLowerCase().includes(q) ||
        (r.robot_sn || '').toLowerCase().includes(q)
      ))
    }
  }, [search, list])

  const columns = [
    {
      title: '到访时间',
      dataIndex: 'arrived_at',
      render: (v: string) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v ? v.slice(0, 16) : '-'}</span>,
    },
    {
      title: '访客姓名',
      dataIndex: 'visitor_name',
      render: (v: string) => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v || '未识别'}</span>,
    },
    {
      title: '部门',
      dataIndex: 'visitor_dept',
      render: (v: string) => <span style={{ color: 'var(--text-secondary)' }}>{v || '-'}</span>,
    },
    {
      title: '身份',
      dataIndex: 'is_employee',
      render: (v: boolean) => v
        ? <Tag style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144', borderRadius: 4 }}>员工</Tag>
        : <Tag style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 4 }}>访客</Tag>,
    },
    {
      title: '离开时间',
      dataIndex: 'left_at',
      render: (v: string) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v ? v.slice(0, 16) : '—'}</span>,
    },
    {
      title: '参观展台',
      dataIndex: 'terminals_visited',
      ellipsis: true,
      render: (v: string) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v || '-'}</span>,
    },
    {
      title: '机器人',
      dataIndex: 'robot_sn',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{v || '-'}</span>,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <EyeOutlined style={{ fontSize: 20, color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>访客记录</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            共 {filtered.length} 条{search ? '（已筛选）' : ''}
          </span>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          placeholder="搜索姓名/部门..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
      </div>

      <div className="tech-card">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          style={{ background: 'transparent' }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <EyeOutlined style={{ fontSize: 32, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }} />
                <span style={{ color: 'var(--text-muted)' }}>暂无访客记录</span>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
