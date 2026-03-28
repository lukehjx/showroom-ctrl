import { useState, useRef, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
} from 'reactflow'
import type {
  Node, Edge, OnConnect, OnNodesChange, OnEdgesChange, ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import CustomNode from './nodes/CustomNode'
import type { NodeData } from './nodes/CustomNode'
import ActionPanel from './panels/ActionPanel'
import ConfigPanel from './panels/ConfigPanel'

const nodeTypes = { custom: CustomNode }

const NODE_DEFAULTS: Record<string, Omit<NodeData, 'config'>> = {
  robot_nav:     { label: '机器人导航', type: 'robot_nav',     icon: '🚗', color: '#1677ff' },
  robot_speak:   { label: '机器人播报', type: 'robot_speak',   icon: '🗣️', color: '#52c41a' },
  push_resource: { label: '投放资源',   type: 'push_resource', icon: '📺', color: '#eb2f96' },
  switch_scene:  { label: '切换专场',   type: 'switch_scene',  icon: '🔀', color: '#fa8c16' },
  digital_human: { label: '数字人控制', type: 'digital_human', icon: '🤖', color: '#722ed1' },
  narration:     { label: '讲解控制',   type: 'narration',     icon: '📢', color: '#13c2c2' },
  tcp_send:      { label: 'TCP 发送',   type: 'tcp_send',      icon: '🌐', color: '#faad14' },
  http_request:  { label: 'HTTP 请求',  type: 'http_request',  icon: '🔗', color: '#ff4d4f' },
  delay:         { label: '延迟等待',   type: 'delay',         icon: '⏱️', color: '#595959' },
  hall_control:  { label: '整馆控制',   type: 'hall_control',  icon: '🏢', color: '#2db7f5' },
}

let nodeIdCounter = 100

interface FlowEditorProps {
  initialNodes?: Node<NodeData>[]
  initialEdges?: Edge[]
  onSave?: (nodes: Node<NodeData>[], edges: Edge[]) => void
}

export default function FlowEditor({ initialNodes = [], initialEdges = [], onSave }: FlowEditorProps) {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#1677ff' } }, eds)),
    []
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const nodeType = event.dataTransfer.getData('application/reactflow')
    if (!nodeType || !rfInstance || !reactFlowWrapper.current) return

    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    const position = rfInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })

    const defaults = NODE_DEFAULTS[nodeType]
    if (!defaults) return

    const newNode: Node<NodeData> = {
      id: `node_${++nodeIdCounter}`,
      type: 'custom',
      position,
      data: { ...defaults, config: {}, waitMode: 'none' },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [rfInstance])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleNodeChange = useCallback((id: string, update: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...update } } : n)
    )
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: { ...prev.data, ...update } } : prev)
  }, [])

  const handleSave = () => {
    onSave?.(nodes, edges)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0d0d0d', borderRadius: 12, overflow: 'hidden' }}>
      {/* 左侧动作面板 */}
      <div style={{ width: 180, borderRight: '1px solid #2a2a2a', background: '#141414', overflowY: 'auto', flexShrink: 0 }}>
        <ActionPanel onDragStart={onDragStart} />
      </div>

      {/* 画布 */}
      <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#0d0d0d' }}
          deleteKeyCode="Delete"
        >
          <Background variant={BackgroundVariant.Dots} color="#2a2a2a" gap={16} />
          <Controls style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
          <MiniMap
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            nodeColor="#1677ff"
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>

        {/* 保存按钮 */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <button
            onClick={handleSave}
            style={{
              background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 8px rgba(22,119,255,0.4)',
            }}
          >
            💾 保存流程
          </button>
        </div>

        {/* 提示 */}
        {nodes.length === 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ color: '#555', fontSize: 14 }}>从左侧拖入节点开始构建流程</div>
          </div>
        )}
      </div>

      {/* 右侧配置面板 */}
      <div style={{ width: 260, borderLeft: '1px solid #2a2a2a', background: '#141414', overflowY: 'auto', flexShrink: 0 }}>
        <ConfigPanel
          node={selectedNode}
          onChange={handleNodeChange}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  )
}
