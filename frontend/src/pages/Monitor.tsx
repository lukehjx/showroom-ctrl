import { useEffect, useState, useCallback } from 'react'
import { Button } from 'antd'
import {
  SyncOutlined, RobotOutlined, ThunderboltFilled,
  WifiOutlined, ClockCircleOutlined, PlayCircleFilled, ReloadOutlined
} from '@ant-design/icons'
import api, { triggerPreset, refreshDeviceStatus } from '../api'

interface DeviceStatus { id: number; terminal_id: number; terminal_name: string; ip: string; is_online: boolean; response_ms?: number }
interface Robot { id: number; name: string; sn: string; enabled: boolean }
interface Preset { id: number; name: string; description: string; icon: string; color: string; enabled: boolean }
interface LogItem { id: number; action: string; source: string; result: string; created_at: string }
interface CurrentScene { scene_id: number; scene_name: string; updated_at: string }

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="tech-card" style={{ padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color, flexShrink: 0,
          boxShadow: `0 0 12px ${color}22`
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export default function MonitorPage() {
  const time = useClock()
  const [scene, setScene] = useState<CurrentScene | null>(null)
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [robots, setRobots] = useState<Robot[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sceneRes, devRes, robRes, preRes, logRes] = await Promise.allSettled([
        api.get('/api/current-scene'),
        api.get('/api/device-status'),
        api.get('/api/robots'),
        api.get('/api/presets'),
        api.get('/api/logs?page=1&page_size=25'),
      ])
      if (sceneRes.status === 'fulfilled' && sceneRes.value?.data) setScene(sceneRes.value.data)
      if (devRes.status === 'fulfilled' && Array.isArray(devRes.value?.data)) setDevices(devRes.value.data)
      if (robRes.status === 'fulfilled' && Array.isArray(robRes.value?.data)) setRobots(robRes.value.data)
      if (preRes.status === 'fulfilled' && Array.isArray(preRes.value?.data)) setPresets(preRes.value.data)
      if (logRes.status === 'fulfilled' && logRes.value?.data?.items) setLogs(logRes.value.data.items)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const t = setInterval(fetchAll, 10000)
    return () => clearInterval(t)
  }, [fetchAll])

  const onlineDevices = devices.filter(d => d.is_online).length
  const activeRobots = robots.filter(r => r.enabled).length

  const handleTrigger = async (id: number) => {
    setTriggering(id)
    try { await triggerPreset(id); fetchAll() }
    catch (e) { console.error(e) }
    finally { setTriggering(null) }
  }

  const handleRefreshDevices = async () => {
    try { await refreshDeviceStatus(); setTimeout(fetchAll, 1500) }
    catch (e) { console.error(e) }
  }

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Top Banner */}
      <div className="tech-card" style={{
        padding: '18px 28px', marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.06))',
        borderColor: 'rgba(0,212,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            展厅智控 <span style={{ color: 'var(--accent-blue)' }}>监控大屏</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            当前专场：
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
              {scene?.scene_name || '—'}
            </span>
            {scene?.updated_at && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                更新于 {new Date(scene.updated_at).toLocaleTimeString('zh-CN')}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums', letterSpacing: 2, fontFamily: 'monospace' }}>
            {time.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {time.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchAll} style={{
          background: 'rgba(0,212,255,0.1)', borderColor: 'rgba(0,212,255,0.3)',
          color: 'var(--accent-blue)'
        }}>
          刷新
        </Button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          icon={<RobotOutlined />}
          label="机器人在线"
          value={activeRobots > 0 ? <span className="glow-green">{activeRobots}</span> : <span style={{ color: 'var(--danger)' }}>0</span>}
          color="#00ff88"
          sub={`共 ${robots.length} 台配置`}
        />
        <StatCard
          icon={<ThunderboltFilled />}
          label="当前专场"
          value={<span style={{ fontSize: 16, fontWeight: 600 }}>{scene?.scene_name || '无'}</span>}
          color="#00d4ff"
          sub={scene ? `ID: ${scene.scene_id}` : '未设置'}
        />
        <StatCard
          icon={<WifiOutlined />}
          label="设备在线"
          value={`${onlineDevices}/${devices.length}`}
          color={onlineDevices === devices.length ? '#00ff88' : '#ffd32a'}
          sub={`${devices.length - onlineDevices} 台离线`}
        />
        <StatCard
          icon={<PlayCircleFilled />}
          label="可用套餐"
          value={presets.filter(p => p.enabled).length}
          color="#7c3aed"
          sub={`共 ${presets.length} 个套餐`}
        />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Devices */}
        <div className="tech-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              <WifiOutlined style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
              设备在线状态
            </div>
            <Button size="small" icon={<SyncOutlined />} onClick={handleRefreshDevices} style={{
              background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)',
              color: 'var(--text-secondary)', fontSize: 12
            }}>
              检测
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devices.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无设备数据</div>
            )}
            {devices.map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: d.is_online ? 'rgba(0,255,136,0.04)' : 'rgba(255,71,87,0.04)',
                border: `1px solid ${d.is_online ? 'rgba(0,255,136,0.15)' : 'rgba(255,71,87,0.15)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`status-dot ${d.is_online ? 'online' : 'offline'}`} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{d.terminal_name || `终端 ${d.terminal_id}`}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {d.is_online ? (
                    <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>
                      {d.response_ms ? `${d.response_ms}ms` : '在线'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--danger)' }}>离线</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Presets Quick Trigger */}
        <div className="tech-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            <ThunderboltFilled style={{ marginRight: 8, color: 'var(--accent-orange)' }} />
            接待套餐快启
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {presets.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>暂无套餐</div>
            )}
            {presets.slice(0, 6).map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,107,53,0.04)',
                border: '1px solid rgba(255,107,53,0.12)',
                opacity: p.enabled ? 1 : 0.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{p.icon || '🎯'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</div>}
                  </div>
                </div>
                <Button
                  size="small"
                  type="primary"
                  loading={triggering === p.id}
                  disabled={!p.enabled}
                  onClick={() => handleTrigger(p.id)}
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 }}
                >
                  启动
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logs - Terminal style */}
      <div className="tech-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: 'var(--accent-green)' }} />
          实时操作日志
        </div>
        <div className="terminal-log" style={{ height: 240 }}>
          {logs.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>暂无日志</div>
          )}
          {logs.map((l) => (
            <div key={l.id} className="log-line" style={{ marginBottom: 2 }}>
              <span className="log-time">{new Date(l.created_at).toLocaleTimeString('zh-CN', { hour12: false })}</span>
              <span style={{ color: 'rgba(0,212,255,0.6)', marginRight: 8 }}>[{l.source || 'sys'}]</span>
              <span>{l.action}</span>
              {l.result && <span style={{ color: 'rgba(0,255,136,0.5)', marginLeft: 8 }}>→ {typeof l.result === 'string' ? l.result.slice(0, 60) : 'ok'}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
