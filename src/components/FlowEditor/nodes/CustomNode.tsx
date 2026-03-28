import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { Tag } from 'antd'

export interface NodeData {
  label: string
  type: string
  icon: string
  color: string
  config: Record<string, unknown>
  waitMode?: 'callback' | 'delay' | 'none'
}

const NODE_COLORS: Record<string, string> = {
  robot_nav: '#1677ff',
  robot_speak: '#52c41a',
  push_resource: '#eb2f96',
  switch_scene: '#fa8c16',
  digital_human: '#722ed1',
  narration: '#13c2c2',
  tcp_send: '#faad14',
  http_request: '#ff4d4f',
  delay: '#595959',
  hall_control: '#2db7f5',
}

function CustomNode({ data, selected }: NodeProps<NodeData>) {
  const color = NODE_COLORS[data.type] || '#1677ff'
  return (
    <div
      style={{
        background: selected ? '#1a2a3a' : '#1f1f1f',
        border: `2px solid ${selected ? '#1677ff' : color}`,
        borderRadius: 10,
        padding: '8px 14px',
        minWidth: 150,
        boxShadow: selected ? `0 0 12px ${color}44` : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, border: '2px solid #141414', width: 10, height: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{data.icon}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{data.label}</div>
          {data.config && Object.keys(data.config).length > 0 && (
            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
              {Object.entries(data.config).slice(0, 2).map(([k, v]) => (
                <span key={k} style={{ marginRight: 6 }}>{k}: {String(v).slice(0, 15)}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {data.waitMode && data.waitMode !== 'none' && (
        <Tag color={data.waitMode === 'callback' ? 'blue' : 'orange'} style={{ fontSize: 10, marginTop: 4, display: 'block', width: 'fit-content' }}>
          {data.waitMode === 'callback' ? '等回调' : '等延迟'}
        </Tag>
      )}
      <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #141414', width: 10, height: 10 }} />
    </div>
  )
}

export default memo(CustomNode)
