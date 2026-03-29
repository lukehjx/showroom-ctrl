import { useEffect, useState, useRef, useCallback } from 'react'
import { Button, Modal, Form, Input, Select, Switch, Tag, Spin, Popconfirm, App } from 'antd'
import {
  PlusOutlined, DeleteOutlined, PlayCircleOutlined,
  BranchesOutlined, SaveOutlined, PlusCircleOutlined
} from '@ant-design/icons'
import api from '../api'

interface Route { id: number; name: string; path: string; description: string; enabled: boolean; created_at: string }
interface Lane { id: number; route_id: number; name: string; sort_order: number }
interface Step {
  id: number; lane_id: number; action_type: string;
  action_config: any; description: string; sort_order: number;
  wait_type?: string; wait_timeout?: number
}

const ACTION_TYPES = [
  { type: 'robot_nav', label: '机器人导航', emoji: '🚗', color: '#00d4ff' },
  { type: 'robot_speak', label: '机器人播报', emoji: '🗣️', color: '#00ff88' },
  { type: 'media_play', label: '投放资源', emoji: '📺', color: '#ff6b35' },
  { type: 'scene_switch', label: '切换专场', emoji: '🔀', color: '#ffd32a' },
  { type: 'digital_human', label: '数字人控制', emoji: '🤖', color: '#7c3aed' },
  { type: 'narrate', label: '讲解控制', emoji: '📢', color: '#ff4757' },
  { type: 'tcp_send', label: 'TCP 发送', emoji: '🌐', color: '#1890ff' },
  { type: 'http_request', label: 'HTTP 请求', emoji: '🔗', color: '#52c41a' },
  { type: 'wait', label: '延迟等待', emoji: '⏱️', color: '#faad14' },
]

const getActionDef = (type: string) =>
  ACTION_TYPES.find(a => a.type === type) || { type, label: type, emoji: '⚙️', color: '#8fa3bc' }

// ─── 节点配置 Modal ──────────────────────────────────────────────
function StepConfigModal({
  open, actionType, initialConfig, onOk, onCancel
}: {
  open: boolean
  actionType: string
  initialConfig?: any
  onOk: (cfg: { description: string; action_config: any; wait_timeout?: number }) => void
  onCancel: () => void
}) {
  const [form] = Form.useForm()
  const [scenes, setScenes] = useState<any[]>([])
  const [terminals, setTerminals] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [commands, setCommands] = useState<any[]>([])
  const [pois, setPois] = useState<string[]>([])
  const [tcpMode, setTcpMode] = useState<'preset'|'custom'>('preset')
  const [showRawJson, setShowRawJson] = useState(false)
  const def = getActionDef(actionType)

  useEffect(() => {
    if (!open) return
    if (initialConfig) {
      const cfg = typeof initialConfig === 'string' ? (() => { try { return JSON.parse(initialConfig) } catch { return {} } })() : (initialConfig || {})
      form.setFieldsValue({ ...cfg, narrate_text: cfg.text, wait_seconds: cfg.seconds })
      if (cfg.host) setTcpMode('custom')
    }
    api.get('/api/scenes').then((r: any) => setScenes(r.data?.data || []))
    api.get('/api/terminals').then((r: any) => setTerminals(r.data?.data || []))
    api.get('/api/commands').then((r: any) => setCommands(r.data?.data || []))
    api.get('/api/robot/map-positions').then((r: any) => setPois(r.data?.pois || [])).catch(() => {})
  }, [open])

  const onTerminalChange = (terminalId: number) => {
    form.setFieldsValue({ resource_id: undefined })
    api.get(`/api/terminals/${terminalId}/resources`).then((r: any) => setResources(r.data?.data || []))
  }

  const handleOk = async () => {
    const vals = await form.validateFields()
    let cfg: any = {}
    if (actionType === 'robot_nav') cfg = { poi_name: vals.poi_name }
    else if (actionType === 'robot_speak') cfg = { text: vals.text }
    else if (actionType === 'media_play') cfg = { scene_id: vals.scene_id, terminal_id: vals.terminal_id, resource_id: vals.resource_id }
    else if (actionType === 'scene_switch') cfg = { scene_id: vals.scene_id }
    else if (actionType === 'digital_human') cfg = { terminal_id: vals.terminal_id, command: vals.command }
    else if (actionType === 'narrate') cfg = { text: vals.narrate_text }
    else if (actionType === 'tcp_send') {
      if (tcpMode === 'preset') cfg = { command_id: vals.command_id }
      else cfg = { host: vals.host || '112.20.77.18', port: Number(vals.port) || 8989, data: vals.data }
    }
    else if (actionType === 'http_request') cfg = { url: vals.url, method: vals.method || 'GET' }
    else { try { cfg = JSON.parse(vals.raw_json || '{}') } catch { cfg = {} } }

    onOk({
      description: vals.description || def.label,
      action_config: cfg,
      wait_timeout: actionType === 'wait' ? Number(vals.wait_seconds || 3) : undefined,
    })
    form.resetFields()
    setShowRawJson(false)
  }

  const s = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e8ff' }
  const lbl = (t: string) => <span style={{color:'#8fa3bc'}}>{t}</span>

  return (
    <Modal
      title={<span style={{color:'#e0e8ff'}}>{def.emoji} 配置 {def.label}</span>}
      open={open} onOk={handleOk}
      onCancel={() => { form.resetFields(); setShowRawJson(false); onCancel() }}
      okText="保存步骤" cancelText="取消" width={460}
      styles={{ body: { background: '#0d1b2a', padding: '16px 24px' } }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label={lbl("步骤描述")} name="description">
          <Input placeholder={`如：${def.label}步骤`} style={s} />
        </Form.Item>

        {actionType === 'robot_nav' && (
          <Form.Item label={lbl("目标位置（POI）")} name="poi_name" rules={[{required:true,message:'请填写POI名'}]}>
            {pois.length > 0
              ? <Select placeholder="选择点位" options={pois.map(p=>({label:p,value:p}))} />
              : <Input placeholder="机器人尚未上报点位，请手填" style={s} />}
          </Form.Item>
        )}

        {actionType === 'robot_speak' && (
          <Form.Item label={lbl("播报文字")} name="text" rules={[{required:true}]}>
            <Input.TextArea rows={3} placeholder="如：欢迎参观思德科技展厅" style={s} />
          </Form.Item>
        )}

        {actionType === 'media_play' && (<>
          <Form.Item label={lbl("场景")} name="scene_id" rules={[{required:true}]}>
            <Select placeholder="选择场景" options={scenes.map((sc:any)=>({label:sc.scene_name||sc.name,value:sc.id||sc.scene_id}))} onChange={()=>form.setFieldsValue({terminal_id:undefined,resource_id:undefined})} />
          </Form.Item>
          <Form.Item label={lbl("终端")} name="terminal_id" rules={[{required:true}]}>
            <Select placeholder="选择终端" onChange={onTerminalChange} options={terminals.map((t:any)=>({label:t.terminal_name||t.name,value:t.id||t.terminal_id}))} />
          </Form.Item>
          <Form.Item label={lbl("资源")} name="resource_id" rules={[{required:true}]}>
            <Select placeholder={resources.length?'选择资源':'先选终端'} options={resources.map((r:any)=>({label:r.title||r.file_name,value:r.id||r.resource_id}))} />
          </Form.Item>
        </>)}

        {actionType === 'scene_switch' && (
          <Form.Item label={lbl("目标场景")} name="scene_id" rules={[{required:true}]}>
            <Select placeholder="选择场景" options={scenes.map((sc:any)=>({label:sc.scene_name||sc.name,value:sc.id||sc.scene_id}))} />
          </Form.Item>
        )}

        {actionType === 'digital_human' && (<>
          <Form.Item label={lbl("终端")} name="terminal_id" rules={[{required:true}]}>
            <Select placeholder="选择终端" options={terminals.map((t:any)=>({label:t.terminal_name||t.name,value:t.id||t.terminal_id}))} />
          </Form.Item>
          <Form.Item label={lbl("指令")} name="command" rules={[{required:true}]}>
            <Select options={[{label:'进入',value:'Enter'},{label:'离开',value:'Leave'},{label:'待机',value:'Standby'},{label:'播放',value:'Play'},{label:'暂停',value:'Pause'}]} />
          </Form.Item>
        </>)}

        {actionType === 'narrate' && (
          <Form.Item label={lbl("讲解指令")} name="narrate_text" rules={[{required:true}]}>
            <Select options={[{label:'播放',value:'播放。'},{label:'暂停',value:'暂停。'},{label:'继续',value:'继续。'},{label:'停止',value:'停止。'},{label:'自动讲解',value:'自动讲解。'}]} />
          </Form.Item>
        )}

        {actionType === 'tcp_send' && (<>
          <Form.Item label={lbl("发送方式")}>
            <Select value={tcpMode} onChange={v=>setTcpMode(v as any)} options={[{label:'选已有指令',value:'preset'},{label:'自定义',value:'custom'}]} style={{width:'100%'}} />
          </Form.Item>
          {tcpMode === 'preset'
            ? <Form.Item label={lbl("指令")} name="command_id" rules={[{required:true}]}>
                <Select placeholder="选择指令" options={commands.filter((c:any)=>c.protocol_type==='tcp').map((c:any)=>({label:`${c.group_name||''} / ${c.name}`,value:c.id}))} />
              </Form.Item>
            : <>
                <Form.Item label={lbl("Host")} name="host"><Input placeholder="112.20.77.18" style={s} /></Form.Item>
                <Form.Item label={lbl("Port")} name="port"><Input placeholder="8989" type="number" style={s} /></Form.Item>
                <Form.Item label={lbl("数据")} name="data" rules={[{required:true}]}><Input placeholder="如：2_85_142_1156" style={s} /></Form.Item>
              </>}
        </>)}

        {actionType === 'http_request' && (<>
          <Form.Item label={lbl("Method")} name="method" initialValue="GET">
            <Select options={[{label:'GET',value:'GET'},{label:'POST',value:'POST'}]} style={{width:120}} />
          </Form.Item>
          <Form.Item label={lbl("URL")} name="url" rules={[{required:true}]}>
            <Input placeholder="http://..." style={s} />
          </Form.Item>
        </>)}

        {actionType === 'wait' && (
          <Form.Item label={lbl("等待秒数")} name="wait_seconds" rules={[{required:true}]} initialValue={3}>
            <Input type="number" min={1} max={300} suffix="秒" style={s} />
          </Form.Item>
        )}

        {!['robot_nav','robot_speak','media_play','scene_switch','digital_human','narrate','tcp_send','http_request','wait'].includes(actionType) && (
          <Form.Item label={lbl("配置（JSON）")} name="raw_json">
            <Input.TextArea rows={3} placeholder='{"key":"value"}' style={s} />
          </Form.Item>
        )}

        <div style={{marginTop:8}}>
          <Button type="link" size="small" style={{color:'#8fa3bc',padding:0}} onClick={()=>setShowRawJson(!showRawJson)}>
            {showRawJson ? '▲ 收起原始JSON' : '▼ 查看/编辑原始JSON（高级）'}
          </Button>
          {showRawJson && <Form.Item name="raw_json_adv" style={{marginTop:8}}>
            <Input.TextArea rows={4} placeholder='直接编辑JSON' style={s} />
          </Form.Item>}
        </div>
      </Form>
    </Modal>
  )
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────
function RoutesPageInner() {
  const { message } = App.useApp()

  // ── State ──
  const [routes, setRoutes] = useState<Route[]>([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [lanes, setLanes] = useState<Lane[]>([])
  const [steps, setSteps] = useState<Record<number, Step[]>>({})
  const [flowLoading, setFlowLoading] = useState(false)

  // new route modal
  const [newRouteOpen, setNewRouteOpen] = useState(false)
  const [newRouteLoading, setNewRouteLoading] = useState(false)
  const [routeForm] = Form.useForm()

  // new lane modal
  const [newLaneOpen, setNewLaneOpen] = useState(false)
  const [newLaneLoading, setNewLaneLoading] = useState(false)
  const [laneForm] = Form.useForm()

  // step config modal
  const [stepCfgOpen, setStepCfgOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: string; laneId: number } | null>(null)
  const [stepSaving, setStepSaving] = useState(false)

  const [triggering, setTriggering] = useState(false)

  // drag
  const dragType = useRef<string | null>(null)

  // ── Load routes ──
  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true)
    try {
      const res: any = await api.get('/api/routes')
      const list: Route[] = res?.data || []
      setRoutes(list)
    } catch {
      message.error('加载流程列表失败')
    } finally {
      setRoutesLoading(false)
    }
  }, [message])

  useEffect(() => { loadRoutes() }, [loadRoutes])

  // ── Load flow data for selected route ──
  const loadFlow = useCallback(async (routeId: number) => {
    setFlowLoading(true)
    try {
      const lRes: any = await api.get(`/api/routes/${routeId}/lanes`)
      const laneList: Lane[] = lRes?.data || []
      setLanes(laneList)

      const stepsMap: Record<number, Step[]> = {}
      await Promise.all(laneList.map(async (lane) => {
        const sRes: any = await api.get(`/api/lanes/${lane.id}/steps`)
        stepsMap[lane.id] = sRes?.data || []
      }))
      setSteps(stepsMap)
    } catch {
      message.error('加载流程图失败')
    } finally {
      setFlowLoading(false)
    }
  }, [message])

  const selectRoute = (r: Route) => {
    setSelectedRoute(r)
    setLanes([])
    setSteps({})
    loadFlow(r.id)
  }

  // ── Create route ──
  const handleCreateRoute = async () => {
    let vals: any
    try {
      vals = await routeForm.validateFields()
    } catch {
      return
    }
    if (!vals.path) {
      vals.path = `/route/${Date.now()}`
    }
    setNewRouteLoading(true)
    try {
      await api.post('/api/routes', { ...vals, enabled: vals.enabled ?? true })
      message.success('创建成功')
      setNewRouteOpen(false)
      routeForm.resetFields()
      await loadRoutes()
    } catch (e: any) {
      message.error(`创建失败：${e?.message || '未知错误'}`)
    } finally {
      setNewRouteLoading(false)
    }
  }

  // ── Delete route ──
  const handleDeleteRoute = async (id: number) => {
    try {
      await api.delete(`/api/routes/${id}`)
      message.success('删除成功')
      if (selectedRoute?.id === id) {
        setSelectedRoute(null)
        setLanes([])
        setSteps({})
      }
      await loadRoutes()
    } catch {
      message.error('删除失败')
    }
  }

  // ── Trigger route ──
  const handleTrigger = async () => {
    if (!selectedRoute) return
    setTriggering(true)
    try {
      await api.post(`/api/routes/${selectedRoute.id}/trigger`)
      message.success('流程已触发')
    } catch {
      message.error('触发失败')
    } finally {
      setTriggering(false)
    }
  }

  // ── Create lane ──
  const handleCreateLane = async () => {
    if (!selectedRoute) return
    let vals: any
    try {
      vals = await laneForm.validateFields()
    } catch {
      return
    }
    setNewLaneLoading(true)
    try {
      await api.post(`/api/routes/${selectedRoute.id}/lanes`, {
        name: vals.name,
        sort_order: lanes.length + 1,
        parallel_group: null,
      })
      message.success('泳道创建成功')
      setNewLaneOpen(false)
      laneForm.resetFields()
      await loadFlow(selectedRoute.id)
    } catch {
      message.error('创建泳道失败')
    } finally {
      setNewLaneLoading(false)
    }
  }

  // ── Drag & Drop ──
  const onDragStart = (type: string) => {
    dragType.current = type
  }

  const onDropOnLane = async (laneId: number) => {
    const type = dragType.current
    if (!type) return
    dragType.current = null
    // open step config modal
    setPendingAction({ type, laneId })
    setStepCfgOpen(true)
  }

  const handleSaveStep = async (cfg: { description: string; action_config: any; wait_timeout?: number }) => {
    if (!pendingAction) return
    setStepSaving(true)
    try {
      const laneSteps = steps[pendingAction.laneId] || []
      await api.post(`/api/lanes/${pendingAction.laneId}/steps`, {
        sort_order: laneSteps.length + 1,
        action_type: pendingAction.type,
        action_config: cfg.action_config,
        wait_type: pendingAction.type === 'wait' ? 'fixed' : 'none',
        wait_timeout: cfg.wait_timeout || 0,
        description: cfg.description,
      })
      message.success('步骤已保存')
      setStepCfgOpen(false)
      setPendingAction(null)
      if (selectedRoute) await loadFlow(selectedRoute.id)
    } catch {
      message.error('保存步骤失败')
    } finally {
      setStepSaving(false)
    }
  }

  // ── Save positions to localStorage ──
  const savePositions = () => {
    if (!selectedRoute) return
    const key = `route_positions_${selectedRoute.id}`
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), lanes: lanes.map(l => l.id) }))
    message.success('布局已保存到本地')
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* ─── Left: Route List ─── */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>流程管理</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{routes.length} 条流程</div>
          </div>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { routeForm.resetFields(); routeForm.setFieldsValue({ enabled: true }); setNewRouteOpen(true) }}
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 }}
          >
            新建
          </Button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {routesLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin size="small" /></div>
          ) : routes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔀</div>
              暂无流程
            </div>
          ) : (
            routes.map(r => (
              <div
                key={r.id}
                onClick={() => selectRoute(r)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderLeft: selectedRoute?.id === r.id
                    ? '3px solid #00d4ff'
                    : '3px solid transparent',
                  background: selectedRoute?.id === r.id
                    ? 'rgba(0,212,255,0.08)'
                    : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.15s',
                  opacity: r.enabled ? 1 : 0.5,
                }}
              >
                <BranchesOutlined style={{ color: selectedRoute?.id === r.id ? '#00d4ff' : 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.path || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!r.enabled && <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>禁用</Tag>}
                  <Popconfirm
                    title="确认删除此流程？"
                    onConfirm={(e) => { e?.stopPropagation(); handleDeleteRoute(r.id) }}
                    onPopupClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 11, width: 22, height: 22, padding: 0 }}
                    />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Right: Flow Editor ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedRoute ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👈</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>选择一条流程开始编辑</div>
            <div style={{ fontSize: 13 }}>或点击"新建"创建第一个流程</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedRoute.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedRoute.path} · {lanes.length} 个泳道
                </div>
              </div>
              <Button
                icon={<PlusCircleOutlined />}
                onClick={() => { laneForm.resetFields(); setNewLaneOpen(true) }}
                style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)', color: '#a855f7' }}
              >
                添加泳道
              </Button>
              <Button icon={<SaveOutlined />} onClick={savePositions}
                style={{ background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-secondary)' }}
              >
                保存布局
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={triggering}
                disabled={!selectedRoute.enabled}
                onClick={handleTrigger}
                style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 }}
              >
                触发执行
              </Button>
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Action Panel (draggable) */}
              <div style={{
                width: 140, flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
                background: 'rgba(0,0,0,0.15)', padding: '12px 8px', overflowY: 'auto'
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, paddingLeft: 4 }}>
                  拖入画布
                </div>
                {ACTION_TYPES.map(act => (
                  <div
                    key={act.type}
                    draggable
                    onDragStart={() => onDragStart(act.type)}
                    style={{
                      padding: '8px 8px',
                      marginBottom: 6,
                      borderRadius: 6,
                      background: `${act.color}14`,
                      border: `1px solid ${act.color}33`,
                      cursor: 'grab',
                      display: 'flex', alignItems: 'center', gap: 6,
                      userSelect: 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${act.color}28`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${act.color}14`)}
                  >
                    <span style={{ fontSize: 14 }}>{act.emoji}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{act.label}</span>
                  </div>
                ))}
              </div>

              {/* Flow Canvas */}
              <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: 20, position: 'relative' }}>
                {flowLoading ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
                ) : lanes.length === 0 ? (
                  <div style={{
                    textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>该流程还没有泳道</div>
                    <div style={{ fontSize: 13, marginBottom: 20 }}>泳道是流程的执行通道，可以并行运行</div>
                    <Button
                      type="primary"
                      icon={<PlusCircleOutlined />}
                      onClick={() => { laneForm.resetFields(); setNewLaneOpen(true) }}
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #00d4ff)', border: 'none' }}
                    >
                      添加第一个泳道
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minHeight: '100%' }}>
                    {lanes.map(lane => {
                      const laneSteps = steps[lane.id] || []
                      return (
                        <div
                          key={lane.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onDropOnLane(lane.id)}
                          style={{
                            minWidth: 220, width: 220, flexShrink: 0,
                            background: 'rgba(124,58,237,0.05)',
                            border: '1px dashed rgba(124,58,237,0.3)',
                            borderRadius: 12,
                            padding: '12px 12px 16px',
                            transition: 'border-color 0.2s',
                          }}
                          onDragEnter={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                          onDragLeave={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)')}
                        >
                          {/* Lane header */}
                          <div style={{
                            fontSize: 13, fontWeight: 700, color: '#a855f7',
                            marginBottom: 14, padding: '4px 8px',
                            background: 'rgba(124,58,237,0.1)', borderRadius: 6,
                            textAlign: 'center',
                          }}>
                            {lane.name || `泳道 ${lane.sort_order}`}
                          </div>

                          {/* Steps */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                            {laneSteps.length === 0 ? (
                              <div style={{
                                fontSize: 12, color: 'var(--text-muted)', padding: '20px 0',
                                textAlign: 'center', width: '100%'
                              }}>
                                ↓ 从左侧拖入动作
                              </div>
                            ) : (
                              laneSteps.map((step, idx) => {
                                const def = getActionDef(step.action_type)
                                return (
                                  <div key={step.id} style={{ width: '100%' }}>
                                    {/* Step node */}
                                    <div style={{
                                      padding: '10px 12px',
                                      borderRadius: 8,
                                      background: `${def.color}18`,
                                      border: `1.5px solid ${def.color}44`,
                                      boxShadow: `0 0 8px ${def.color}22`,
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span style={{ fontSize: 14 }}>{def.emoji}</span>
                                        <Tag style={{
                                          margin: 0, fontSize: 10, padding: '0 5px',
                                          background: `${def.color}22`, borderColor: `${def.color}55`,
                                          color: def.color
                                        }}>
                                          {def.label}
                                        </Tag>
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {step.description || step.action_type}
                                      </div>
                                      {step.wait_timeout && step.wait_timeout > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                          ⏱️ {step.wait_timeout}s
                                        </div>
                                      )}
                                    </div>

                                    {/* Connector */}
                                    {idx < laneSteps.length - 1 && (
                                      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                                        <div style={{ width: 2, height: 16, background: `${def.color}55` }} />
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            )}

                            {/* Drop hint at bottom */}
                            {laneSteps.length > 0 && (
                              <div style={{
                                fontSize: 11, color: 'rgba(124,58,237,0.5)', marginTop: 4,
                                textAlign: 'center', width: '100%'
                              }}>
                                + 拖入更多动作
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: New Route ─── */}
      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>新建流程</span>}
        open={newRouteOpen}
        onOk={handleCreateRoute}
        onCancel={() => { setNewRouteOpen(false); routeForm.resetFields() }}
        okText="保存"
        cancelText="取消"
        confirmLoading={newRouteLoading}
        styles={{ body: { background: 'var(--bg-secondary)' }, header: { background: 'var(--bg-secondary)' } }}
      >
        <Form form={routeForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="流程名称" name="name" rules={[{ required: true, message: '请填写流程名称' }]}>
            <Input placeholder="如：VIP接待流程" />
          </Form.Item>
          <Form.Item label="路径标识（选填，留空自动生成）" name="path">
            <Input placeholder="如：/vip-reception" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="简短描述此流程的用途" />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Modal: New Lane ─── */}
      <Modal
        title={<span style={{ color: 'var(--text-primary)' }}>添加泳道</span>}
        open={newLaneOpen}
        onOk={handleCreateLane}
        onCancel={() => { setNewLaneOpen(false); laneForm.resetFields() }}
        okText="创建泳道"
        cancelText="取消"
        confirmLoading={newLaneLoading}
        styles={{ body: { background: 'var(--bg-secondary)' }, header: { background: 'var(--bg-secondary)' } }}
      >
        <Form form={laneForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="泳道名称" name="name" rules={[{ required: true, message: '请填写泳道名称' }]}>
            <Input placeholder="如：主流程" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Modal: Step Config ─── */}
      <StepConfigModal
        open={stepCfgOpen && !stepSaving}
        actionType={pendingAction?.type || 'wait'}
        onOk={handleSaveStep}
        onCancel={() => { setStepCfgOpen(false); setPendingAction(null) }}
      />
    </div>
  )
}

// 包裹 App provider（antd v5/v6 message 需要）
export default function RoutesPage() {
  return (
    <App>
      <RoutesPageInner />
    </App>
  )
}
