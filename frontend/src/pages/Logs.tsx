import { useEffect, useState } from 'react'
import { Button, Input, Pagination, Spin } from 'antd'
import { ReloadOutlined, SearchOutlined, FileTextOutlined } from '@ant-design/icons'
import api from '../api'

interface LogItem { id: number; action: string; source: string; params: any; result: any; created_at: string }

const SOURCE_COLOR: Record<string, string> = {
  api: '#00d4ff', tcp: '#7c3aed', scheduler: '#ffd32a',
  preset: '#ff6b35', robot: '#00ff88', sys: '#8fa3bc'
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const PAGE_SIZE = 30

  const load = async (p = page, kw = keyword) => {
    setLoading(true)
    try {
      const url = `/api/logs?page=${p}&page_size=${PAGE_SIZE}${kw ? `&action=${encodeURIComponent(kw)}` : ''}`
      const res: any = await api.get(url)
      if (res?.data) {
        setLogs(res.data.items || [])
        setTotal(res.data.total || 0)
      }
    } catch (e) { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = () => { setPage(1); load(1, keyword) }
  const handlePageChange = (p: number) => { setPage(p); load(p, keyword) }

  const getResultTag = (result: any) => {
    if (!result) return null
    const str = typeof result === 'string' ? result : JSON.stringify(result)
    const isOk = str.includes('ok') || str.includes('success') || str.includes('true')
    const isErr = str.includes('error') || str.includes('fail') || str.includes('Error')
    return (
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 4,
        background: isErr ? 'rgba(255,71,87,0.12)' : isOk ? 'rgba(0,255,136,0.12)' : 'rgba(143,163,188,0.1)',
        color: isErr ? '#ff4757' : isOk ? '#00ff88' : '#8fa3bc',
        border: `1px solid ${isErr ? 'rgba(255,71,87,0.2)' : isOk ? 'rgba(0,255,136,0.2)' : 'rgba(143,163,188,0.15)'}`,
        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block'
      }}>
        {str.slice(0, 50)}
      </span>
    )
  }

  return (
    <div style={{ padding: '20px 24px', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>操作日志</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>系统操作记录追踪</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            placeholder="搜索动作..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200, background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)' }}
          />
          <Button icon={<SearchOutlined />} onClick={handleSearch} style={{
            background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--accent-blue)'
          }}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => load()} style={{
            background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-secondary)'
          }} />
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div className="tech-card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>共 <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{total}</span> 条记录</span>
        </div>
      </div>

      {/* Log table - terminal-ish style */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div className="tech-card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '160px 80px 120px 1fr 100px',
            padding: '10px 16px', gap: 12,
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600
          }}>
            <span>时间</span>
            <span>来源</span>
            <span>动作</span>
            <span>详情</span>
            <span>结果</span>
          </div>

          {logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>暂无日志</div>
          )}

          {logs.map((l, i) => (
            <div key={l.id} style={{
              display: 'grid', gridTemplateColumns: '160px 80px 120px 1fr 100px',
              padding: '10px 16px', gap: 12,
              borderBottom: '1px solid var(--border-subtle)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              alignItems: 'center',
              transition: 'background 0.15s'
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {new Date(l.created_at).toLocaleString('zh-CN', { hour12: false }).slice(5)}
              </span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                background: `${SOURCE_COLOR[l.source] || SOURCE_COLOR.sys}14`,
                color: SOURCE_COLOR[l.source] || SOURCE_COLOR.sys,
                border: `1px solid ${SOURCE_COLOR[l.source] || SOURCE_COLOR.sys}33`,
                textAlign: 'center', display: 'inline-block'
              }}>
                {l.source || 'sys'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {l.action}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {l.params ? (typeof l.params === 'string' ? l.params : JSON.stringify(l.params)).slice(0, 80) : '—'}
              </span>
              {getResultTag(l.result)}
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
            showSizeChanger={false}
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
      )}
    </div>
  )
}
