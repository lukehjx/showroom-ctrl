import { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Typography, Space, message, Spin, InputNumber, Switch } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { getConfig, saveConfig } from '../api'

const { Title, Text } = Typography

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

  const tabItems = [
    {
      key: 'api', label: '中控连接',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="API 地址" name="apiUrl" rules={[{ required: true }]}>
            <Input placeholder="http://..." />
          </Form.Item>
          <Form.Item label="用户名" name="apiUsername"><Input /></Form.Item>
          <Form.Item label="密码" name="apiPassword"><Input.Password placeholder="留空不修改" /></Form.Item>
          <Form.Item label="展馆 ID" name="hallId"><Input placeholder="HALL_001" /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'robot', label: '机器人',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="机器人 SN" name="robotSN"><Input placeholder="设备序列号" /></Form.Item>
          <Form.Item label="AppKey" name="robotAppKey"><Input /></Form.Item>
          <Form.Item label="Secret" name="robotSecret"><Input.Password /></Form.Item>
          <Form.Item label="Webhook URL" name="robotWebhook"><Input placeholder="http://..." /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'wecom', label: '企微Bot',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="Bot ID" name="wecomBotId"><Input /></Form.Item>
          <Form.Item label="Bot Secret" name="wecomBotSecret"><Input.Password /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'ai', label: 'AI 配置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="Qwen API Key" name="qwenApiKey"><Input.Password placeholder="sk-..." /></Form.Item>
          <Form.Item label="Qwen 模型" name="qwenModel"><Input placeholder="qwen-turbo" /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'tcp', label: 'TCP 配置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="主机" name="tcpHost"><Input placeholder="192.168.1.1" /></Form.Item>
          <Form.Item label="发送端口" name="tcpPort"><InputNumber style={{ width: '100%' }} min={1} max={65535} /></Form.Item>
          <Form.Item label="监听端口" name="tcpListenPort"><InputNumber style={{ width: '100%' }} min={1} max={65535} /></Form.Item>
        </Space>
      ),
    },
    {
      key: 'other', label: '其他参数',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <Form.Item label="日志级别" name="logLevel"><Input placeholder="info / debug / warn" /></Form.Item>
          <Form.Item label="日志保留天数" name="maxLogDays"><InputNumber style={{ width: '100%' }} min={1} max={365} /></Form.Item>
          <Form.Item label="开机自启" name="autoStartOnBoot" valuePropName="checked"><Switch /></Form.Item>
        </Space>
      ),
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8, color: '#1677ff' }} />系统配置
          </Title>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存配置</Button>
        </div>
        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Form form={form} layout="vertical">
            <Tabs items={tabItems} />
          </Form>
        </Card>
        <Text style={{ color: '#555', fontSize: 12 }}>
          * 修改配置后点击右上角「保存配置」按钮生效，部分配置需重启服务
        </Text>
      </Space>
    </Spin>
  )
}
