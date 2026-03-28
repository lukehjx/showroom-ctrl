import { Typography, Space } from 'antd'

const { Text } = Typography

const NODE_TYPES = [
  { type: 'robot_nav', icon: '🚗', label: '机器人导航', color: '#1677ff' },
  { type: 'robot_speak', icon: '🗣️', label: '机器人播报', color: '#52c41a' },
  { type: 'push_resource', icon: '📺', label: '投放资源', color: '#eb2f96' },
  { type: 'switch_scene', icon: '🔀', label: '切换专场', color: '#fa8c16' },
  { type: 'digital_human', icon: '🤖', label: '数字人控制', color: '#722ed1' },
  { type: 'narration', icon: '📢', label: '讲解控制', color: '#13c2c2' },
  { type: 'tcp_send', icon: '🌐', label: 'TCP 发送', color: '#faad14' },
  { type: 'http_request', icon: '🔗', label: 'HTTP 请求', color: '#ff4d4f' },
  { type: 'delay', icon: '⏱️', label: '延迟等待', color: '#595959' },
  { type: 'hall_control', icon: '🏢', label: '整馆控制', color: '#2db7f5' },
]

interface ActionPanelProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void
}

export default function ActionPanel({ onDragStart }: ActionPanelProps) {
  return (
    <div style={{ padding: '12px 8px' }}>
      <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 12, paddingLeft: 4 }}>
        拖拽节点到画布
      </Text>
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {NODE_TYPES.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            style={{
              background: '#1a1a1a',
              border: `1px solid ${node.color}44`,
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = `${node.color}22`
              ;(e.currentTarget as HTMLDivElement).style.borderColor = node.color
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '#1a1a1a'
              ;(e.currentTarget as HTMLDivElement).style.borderColor = `${node.color}44`
            }}
          >
            <span style={{ fontSize: 18 }}>{node.icon}</span>
            <Text style={{ color: '#ccc', fontSize: 13 }}>{node.label}</Text>
          </div>
        ))}
      </Space>
    </div>
  )
}
