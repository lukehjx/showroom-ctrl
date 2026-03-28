import { useState, useEffect } from 'react'
import { Card, Tabs, Collapse, Form, Input, Button, Typography, Space, message, Spin, InputNumber, Switch, Grid } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { getConfig, saveConfig } from '../api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const { Panel } = Collapse

const defaultConfig = {
  apiUrl: 'http://36.134.146.69:8200',
  apiUsername: 'admin',
  apiPassword: '',
  hallId: 'HALL_001',
  robotSN: 'ROBOT_001',
  robotAppKey: '',
  robotSecret: '',
  robotWebhook: 'http://36.134.146.69:8200/webhook/robot',
  wecomBotId: '',
  wecomBotSecret: '',
  qwenApiKey: '',
  qwenModel: 'qwen-turbo',
  tcpHost: '192.168.1.1',
  tcpPort: 8080,
  tcpListenPort: 8081,
  logLevel: 'info',
  maxLogDays: 30,
  autoStartOnBoot: false,
}

export default function Config() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const screens = useBreakpoint()
  const isMobile = !screens.md

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const data: any = await getConfig()
        form.setFieldsValue({ ...defaultConfig, ...data })
      } catch {
        form.setFieldsValue(defaultConfig)
      }
      setLoading(false)
    }
    fetch()
  }, [form])

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await saveConfig(values)
      message.success('配置已保存')
    } catch {
      message.error('保存失败')
    }
    setSaving(false)
  }

  const inputStyle = isMobile ? { height: 44 } : {}

  const sections = [
    {
      key: 'api', label: '中控连接',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="API 地址" name="apiUrl" rules={[{ required: true }]}>
            <Input placeholder="http://..." style={inputStyle} />
          </Form.Item>
          <Form.Item label="用户名" name="apiUsername"><Input style={inputStyle} /></Form.Item>
          <Form.Item label="密码" name="apiPassword"><Input.Password placeholder="留空不修改" style={inputStyle} /></Form.Item>
          <Form.Item label="展馆 ID" name="hallId"><Input placeholder="HALL_001" style={inputStyle} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'robot', label: '机器人',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="机器人 SN" name="robotSN"><Input placeholder="设备序列号" style={inputStyle} /></Form.Item>
          <Form.Item label="AppKey" name="robotAppKey"><Input style={inputStyle} /></Form.Item>
          <Form.Item label="Secret" name="robotSecret"><Input.Password style={inputStyle} /></Form.Item>
          <Form.Item label="Webhook URL" name="robotWebhook"><Input placeholder="http://..." style={inputStyle} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'wecom', label: '企微Bot',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="Bot ID" name="wecomBotId"><Input style={inputStyle} /></Form.Item>
          <Form.Item label="Bot Secret" name="wecomBotSecret"><Input.Password style={inputStyle} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'ai', label: 'AI 配置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="Qwen API Key" name="qwenApiKey"><Input.Password placeholder="sk-..." style={inputStyle} /></Form.Item>
          <Form.Item label="Qwen 模型" name="qwenModel"><Input placeholder="qwen-turbo" style={inputStyle} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'tcp', label: 'TCP 配置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="主机" name="tcpHost"><Input placeholder="192.168.1.1" style={inputStyle} /></Form.Item>
          <Form.Item label="发送端口" name="tcpPort"><InputNumber style={{ width: '100%', height: isMobile ? 44 : undefined }} min={1} max={65535} /></Form.Item>
          <Form.Item label="监听端口" name="tcpListenPort"><InputNumber style={{ width: '100%', height: isMobile ? 44 : undefined }} min={1} max={65535} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'other', label: '其他参数',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="日志级别" name="logLevel"><Input placeholder="info / debug / warn" style={inputStyle} /></Form.Item>
          <Form.Item label="日志保留天数" name="maxLogDays"><InputNumber style={{ width: '100%', height: isMobile ? 44 : undefined }} min={1} max={365} /></Form.Item>
          <Form.Item label="开机自启" name="autoStartOnBoot" valuePropName="checked"><Switch /></Form.Item>
        </Space>
      ),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={isMobile ? 10 : 16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={isMobile ? 5 : 4} style={{ color: '#fff', margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8, color: '#1677ff' }} />系统配置
          </Title>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            style={{ minHeight: isMobile ? 44 : undefined }}
          >
            保存配置
          </Button>
        </div>

        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Form form={form} layout="vertical">
            {isMobile ? (
              // Mobile: collapse panels
              <Collapse
                defaultActiveKey={['api']}
                style={{ background: 'transparent', border: 'none' }}
                expandIconPosition="end"
              >
                {sections.map((s) => (
                  <Panel
                    key={s.key}
                    header={<Text style={{ color: '#fff', fontWeight: 600 }}>{s.label}</Text>}
                    style={{ background: '#141414', borderBottom: '1px solid #2a2a2a', marginBottom: 4 }}
                  >
                    {s.children}
                  </Panel>
                ))}
              </Collapse>
            ) : (
              // Desktop/Tablet: tabs
              <Tabs items={sections} />
            )}
          </Form>
        </Card>
        <Text style={{ color: '#555', fontSize: 12 }}>
          * 修改配置后点击右上角「保存配置」按钮生效，部分配置需重启服务
        </Text>
      </Space>
    </Spin>
  )
}
