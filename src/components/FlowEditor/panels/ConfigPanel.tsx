import { Form, Input, Select, InputNumber, Radio, Button, Typography, Divider } from 'antd'
import type { Node } from 'reactflow'
import type { NodeData } from '../nodes/CustomNode'

const { Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface ConfigPanelProps {
  node: Node<NodeData> | null
  onChange: (id: string, config: Partial<NodeData>) => void
  onClose: () => void
}

const WAIT_MODES = [
  { label: '直接继续', value: 'none' },
  { label: '等回调', value: 'callback' },
  { label: '等延迟', value: 'delay' },
]

function RobotNavConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="目标点位">
      <Input value={config.position as string} onChange={(e) => onChange({ ...config, position: e.target.value })} placeholder="输入点位名称或ID" />
    </Form.Item>
  )
}

function RobotSpeakConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="播报文字">
      <TextArea value={config.text as string} onChange={(e) => onChange({ ...config, text: e.target.value })} placeholder="输入播报内容" rows={4} />
    </Form.Item>
  )
}

function PushResourceConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <>
      <Form.Item label="终端"><Input value={config.terminal as string} onChange={(e) => onChange({ ...config, terminal: e.target.value })} placeholder="终端ID" /></Form.Item>
      <Form.Item label="资源"><Input value={config.resource as string} onChange={(e) => onChange({ ...config, resource: e.target.value })} placeholder="资源名称" /></Form.Item>
    </>
  )
}

function SwitchSceneConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="目标专场">
      <Input value={config.scene as string} onChange={(e) => onChange({ ...config, scene: e.target.value })} placeholder="专场名称或ID" />
    </Form.Item>
  )
}

function DigitalHumanConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <>
      <Form.Item label="终端"><Input value={config.terminal as string} onChange={(e) => onChange({ ...config, terminal: e.target.value })} placeholder="终端ID" /></Form.Item>
      <Form.Item label="命令">
        <Select value={config.command as string} onChange={(v) => onChange({ ...config, command: v })} placeholder="选择命令">
          <Option value="start">启动</Option>
          <Option value="stop">停止</Option>
          <Option value="pause">暂停</Option>
          <Option value="resume">恢复</Option>
        </Select>
      </Form.Item>
    </>
  )
}

function NarrationConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="指令类型">
      <Select value={config.instruction as string} onChange={(v) => onChange({ ...config, instruction: v })} placeholder="选择指令">
        <Option value="start">开始讲解</Option>
        <Option value="stop">停止讲解</Option>
        <Option value="next">下一段</Option>
        <Option value="prev">上一段</Option>
      </Select>
    </Form.Item>
  )
}

function TcpConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <>
      <Form.Item label="主机"><Input value={config.host as string} onChange={(e) => onChange({ ...config, host: e.target.value })} placeholder="192.168.1.100" /></Form.Item>
      <Form.Item label="端口"><InputNumber value={config.port as number} onChange={(v) => onChange({ ...config, port: v })} placeholder="8080" style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="数据"><TextArea value={config.data as string} onChange={(e) => onChange({ ...config, data: e.target.value })} placeholder="发送的数据" rows={3} /></Form.Item>
    </>
  )
}

function HttpConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <>
      <Form.Item label="URL"><Input value={config.url as string} onChange={(e) => onChange({ ...config, url: e.target.value })} placeholder="https://example.com/api" /></Form.Item>
      <Form.Item label="方法">
        <Select value={(config.method as string) || 'GET'} onChange={(v) => onChange({ ...config, method: v })}>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
        </Select>
      </Form.Item>
      <Form.Item label="请求体"><TextArea value={config.body as string} onChange={(e) => onChange({ ...config, body: e.target.value })} placeholder="JSON body" rows={3} /></Form.Item>
    </>
  )
}

function DelayConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="延迟时间（秒）">
      <InputNumber value={config.seconds as number} onChange={(v) => onChange({ ...config, seconds: v })} min={0} style={{ width: '100%' }} />
    </Form.Item>
  )
}

function HallControlConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <Form.Item label="操作">
      <Select value={config.action as string} onChange={(v) => onChange({ ...config, action: v })} placeholder="选择操作">
        <Option value="open">开启</Option>
        <Option value="close">关闭</Option>
        <Option value="standby">待展</Option>
      </Select>
    </Form.Item>
  )
}

type ConfigComp = React.FC<{ config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }>

const CONFIG_COMPONENTS: Record<string, ConfigComp> = {
  robot_nav: RobotNavConfig,
  robot_speak: RobotSpeakConfig,
  push_resource: PushResourceConfig,
  switch_scene: SwitchSceneConfig,
  digital_human: DigitalHumanConfig,
  narration: NarrationConfig,
  tcp_send: TcpConfig,
  http_request: HttpConfig,
  delay: DelayConfig,
  hall_control: HallControlConfig,
}

export default function ConfigPanel({ node, onChange, onClose }: ConfigPanelProps) {
  if (!node) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Text style={{ color: '#555' }}>点击节点进行配置</Text>
      </div>
    )
  }

  const ConfigComponent = CONFIG_COMPONENTS[node.data.type]

  return (
    <div style={{ padding: '12px 16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#fff', fontWeight: 600 }}>{node.data.icon} {node.data.label}</Text>
        <Button type="text" size="small" onClick={onClose} style={{ color: '#888' }}>✕</Button>
      </div>
      <Divider style={{ margin: '8px 0', borderColor: '#2a2a2a' }} />
      <Form layout="vertical" size="small">
        <Form.Item label={<Text style={{ color: '#ccc', fontSize: 12 }}>节点名称</Text>}>
          <Input value={node.data.label} onChange={(e) => onChange(node.id, { label: e.target.value })} />
        </Form.Item>
        {ConfigComponent && (
          <ConfigComponent
            config={node.data.config || {}}
            onChange={(cfg) => onChange(node.id, { config: cfg })}
          />
        )}
        <Divider style={{ margin: '8px 0', borderColor: '#2a2a2a' }} />
        <Form.Item label={<Text style={{ color: '#ccc', fontSize: 12 }}>等待条件</Text>}>
          <Radio.Group
            value={node.data.waitMode || 'none'}
            onChange={(e) => onChange(node.id, { waitMode: e.target.value })}
            optionType="button"
            buttonStyle="solid"
            size="small"
            options={WAIT_MODES}
          />
        </Form.Item>
      </Form>
    </div>
  )
}
