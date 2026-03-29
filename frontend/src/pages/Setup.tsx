import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Steps, Form, Input, Button, Card, Typography, message, Spin, Result, Divider } from 'antd'
import {
  SmileOutlined, CloudOutlined, SyncOutlined, RobotOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import api from '../api'

const { Title, Paragraph, Text } = Typography

const CARD_STYLE = {
  background: 'rgba(15,22,40,0.85)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,212,255,0.08)',
  backdropFilter: 'blur(12px)',
}


interface SyncResult {
  terminals?: number
  resources?: number
  commands?: number
  [key: string]: any
}

export default function SetupPage() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [form2] = Form.useForm()
  const [form4] = Form.useForm()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedConfig, setSavedConfig] = useState<Record<string, string>>({})

  // Load existing config
  useEffect(() => {
    api.get('/api/config').then((res: any) => {
      if (res?.data && Array.isArray(res.data)) {
        const cfg: Record<string, string> = {}
        res.data.forEach((item: any) => { cfg[item.key] = item.value })
        setSavedConfig(cfg)
        // Prefill form2
        form2.setFieldsValue({
          cloud_host: cfg['cloud.host'] || '112.20.77.18:7772',
          cloud_username: cfg['cloud.username'] || 'ZhanGuan',
          cloud_password: cfg['cloud.password'] || 'sidex@123',
          cloud_hall_id: cfg['cloud.hall_id'] || '5',
        })
        // Prefill form4
        form4.setFieldsValue({
          robot_sn: cfg['robot.sn'] || 'MC1BCN2K100262058CA0',
          robot_app_key: cfg['robot.app_key'] || '',
          robot_app_secret: cfg['robot.app_secret'] || '',
          robot_wake_word: cfg['robot.wake_word'] || '旺财',
        })
      }
    }).catch(() => {})
  }, [])

  const putConfigs = async (configs: Record<string, string>) => {
    // Use POST endpoint with array format
    const items = Object.entries(configs).map(([key, value]) => ({ key, value }))
    await api.post('/api/config', items)
    setSavedConfig(prev => ({ ...prev, ...configs }))
  }

  const handleSaveCloud = async () => {
    let vals: any
    try { vals = await form2.validateFields() } catch { return }
    setSaving(true)
    try {
      await putConfigs({
        'cloud.host': vals.cloud_host,
        'cloud.username': vals.cloud_username,
        'cloud.password': vals.cloud_password,
        'cloud.hall_id': vals.cloud_hall_id,
      })
      message.success('云平台配置已保存')
      setCurrent(2)
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res: any = await api.post('/api/sync/all')
      setSyncResult(res?.data || res || {})
      message.success('数据同步完成')
    } catch (e: any) {
      message.error('同步失败：' + (e?.message || '未知错误'))
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveRobot = async () => {
    let vals: any
    try { vals = await form4.validateFields() } catch { return }
    setSaving(true)
    try {
      const configs: Record<string, string> = { 'robot.sn': vals.robot_sn }
      if (vals.robot_app_key) configs['robot.app_key'] = vals.robot_app_key
      if (vals.robot_app_secret) configs['robot.app_secret'] = vals.robot_app_secret
      if (vals.robot_wake_word) configs['robot.wake_word'] = vals.robot_wake_word
      await putConfigs(configs)
      message.success('机器人配置已保存')
      setCurrent(4)
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    try {
      await putConfigs({ 'setup.completed': 'true' })
    } catch {}
    navigate('/monitor')
  }

  const steps = [
    {
      title: '欢迎',
      icon: <SmileOutlined />,
    },
    {
      title: '云平台',
      icon: <CloudOutlined />,
    },
    {
      title: '数据同步',
      icon: <SyncOutlined />,
    },
    {
      title: '机器人',
      icon: <RobotOutlined />,
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />,
    },
  ]

  const inputStyle = {
    background: 'rgba(0,212,255,0.05)',
    borderColor: 'rgba(0,212,255,0.2)',
    color: '#e8f4fd',
  }

  const labelStyle = { color: '#8fa3bc' }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 12px',
          boxShadow: '0 0 24px rgba(0,212,255,0.4)',
        }}>⚡</div>
        <Title level={3} style={{ color: '#e8f4fd', margin: 0 }}>展厅智控系统</Title>
        <Text style={{ color: '#8fa3bc' }}>初始配置向导</Text>
      </div>

      {/* Steps */}
      <div style={{ width: '100%', maxWidth: 700, marginBottom: 24 }}>
        <Steps
          current={current}
          items={steps}
          style={{ color: '#8fa3bc' }}
          size="small"
        />
      </div>

      {/* Card */}
      <Card style={{ ...CARD_STYLE, width: '100%', maxWidth: 700 }} bodyStyle={{ padding: '32px 36px' }}>

        {/* Step 0: Welcome */}
        {current === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
            <Title level={2} style={{ color: '#00d4ff', margin: '0 0 16px' }}>欢迎使用展厅智控系统</Title>
            <Paragraph style={{ color: '#8fa3bc', fontSize: 15, lineHeight: 1.8, maxWidth: 480, margin: '0 auto 24px' }}>
              展厅智控系统帮助您统一管理展厅内的服务机器人、多媒体终端、
              智能场景切换与接待流程，实现展厅数字化智慧运营。
            </Paragraph>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
              {[
                { icon: '🤖', label: '机器人导航与播报' },
                { icon: '📺', label: '多媒体资源投放' },
                { icon: '🔀', label: '场景自动切换' },
                { icon: '📊', label: '实时监控大屏' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '12px 20px',
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: 10,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: 12, color: '#8fa3bc' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <Paragraph style={{ color: '#8fa3bc', fontSize: 13 }}>
              以下向导将帮助您完成系统初始化配置，约需 2-3 分钟。
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => setCurrent(1)}
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                border: 'none',
                fontWeight: 600,
                height: 44,
                padding: '0 40px',
                fontSize: 15,
              }}
            >
              开始配置 →
            </Button>
          </div>
        )}

        {/* Step 1: Cloud Platform */}
        {current === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <CloudOutlined style={{ fontSize: 24, color: '#00d4ff' }} />
              <Title level={4} style={{ color: '#e8f4fd', margin: 0 }}>云平台连接配置</Title>
            </div>
            <Paragraph style={{ color: '#8fa3bc', marginBottom: 24 }}>
              配置展厅云控平台的连接信息，用于同步终端、资源和命令数据。
            </Paragraph>
            <Form form={form2} layout="vertical" initialValues={{
              cloud_host: '112.20.77.18:7772',
              cloud_username: 'ZhanGuan',
              cloud_password: 'sidex@123',
              cloud_hall_id: '5',
            }}>
              <Form.Item label={<span style={labelStyle}>云平台地址</span>} name="cloud_host" rules={[{ required: true, message: '请填写云平台地址' }]}>
                <Input style={inputStyle} placeholder="如：112.20.77.18:7772" />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label={<span style={labelStyle}>账号</span>} name="cloud_username" rules={[{ required: true }]}>
                  <Input style={inputStyle} placeholder="登录账号" />
                </Form.Item>
                <Form.Item label={<span style={labelStyle}>密码</span>} name="cloud_password" rules={[{ required: true }]}>
                  <Input.Password style={inputStyle} placeholder="登录密码" />
                </Form.Item>
              </div>
              <Form.Item label={<span style={labelStyle}>展馆 ID</span>} name="cloud_hall_id" rules={[{ required: true }]}>
                <Input style={inputStyle} placeholder="如：5" />
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Button onClick={() => setCurrent(0)} style={{ color: '#8fa3bc', borderColor: 'rgba(255,255,255,0.15)' }}>
                上一步
              </Button>
              <Button
                type="primary"
                loading={saving}
                onClick={handleSaveCloud}
                style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 }}
              >
                保存配置 & 下一步
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Data Sync */}
        {current === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <SyncOutlined style={{ fontSize: 24, color: '#00d4ff' }} />
              <Title level={4} style={{ color: '#e8f4fd', margin: 0 }}>数据同步</Title>
            </div>
            <Paragraph style={{ color: '#8fa3bc', marginBottom: 24 }}>
              从云平台拉取终端设备、媒体资源和控制指令数据，完成本地初始化。
            </Paragraph>

            {!syncResult ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                {syncing ? (
                  <div>
                    <Spin size="large" />
                    <div style={{ color: '#8fa3bc', marginTop: 16 }}>同步中，请稍候...</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
                    <Paragraph style={{ color: '#8fa3bc', marginBottom: 24 }}>
                      点击下方按钮从云平台同步最新数据
                    </Paragraph>
                    <Button
                      type="primary"
                      size="large"
                      icon={<SyncOutlined />}
                      onClick={handleSync}
                      style={{
                        background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                        border: 'none',
                        fontWeight: 600,
                        height: 44,
                        padding: '0 40px',
                      }}
                    >
                      立即同步
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div>
                <Result
                  status="success"
                  title={<span style={{ color: '#e8f4fd' }}>数据同步完成</span>}
                  subTitle={<span style={{ color: '#8fa3bc' }}>已成功从云平台获取最新数据</span>}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: -16, marginBottom: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: '终端数', key: 'terminals', icon: '🖥️', color: '#00d4ff' },
                    { label: '资源数', key: 'resources', icon: '📦', color: '#00ff88' },
                    { label: '命令数', key: 'commands', icon: '⚡', color: '#7c3aed' },
                  ].map(item => (
                    <div key={item.key} style={{
                      padding: '16px 24px',
                      background: `${item.color}10`,
                      border: `1px solid ${item.color}33`,
                      borderRadius: 10,
                      textAlign: 'center',
                      minWidth: 100,
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>
                        {syncResult[item.key] ?? '—'}
                      </div>
                      <div style={{ fontSize: 12, color: '#8fa3bc' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Button onClick={() => setCurrent(1)} style={{ color: '#8fa3bc', borderColor: 'rgba(255,255,255,0.15)' }}>
                上一步
              </Button>
              <Button
                type={syncResult ? 'primary' : 'default'}
                onClick={() => setCurrent(3)}
                disabled={!syncResult && !syncing}
                style={syncResult ? { background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 } : {}}
              >
                {syncResult ? '下一步 →' : '跳过'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Robot Config */}
        {current === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <RobotOutlined style={{ fontSize: 24, color: '#00d4ff' }} />
              <Title level={4} style={{ color: '#e8f4fd', margin: 0 }}>机器人配置</Title>
            </div>
            <Paragraph style={{ color: '#8fa3bc', marginBottom: 24 }}>
              配置展厅服务机器人的连接参数。App Key 和 App Secret 为可选项，可后续在机器人管理页面补充。
            </Paragraph>
            <Form form={form4} layout="vertical" initialValues={{
              robot_sn: 'MC1BCN2K100262058CA0',
              robot_app_key: '',
              robot_app_secret: '',
              robot_wake_word: '旺财',
            }}>
              <Form.Item label={<span style={labelStyle}>机器人 SN</span>} name="robot_sn" rules={[{ required: true, message: '请填写机器人SN' }]}>
                <Input style={inputStyle} placeholder="设备序列号" />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label={<span style={labelStyle}>App Key（可空）</span>} name="robot_app_key">
                  <Input style={inputStyle} placeholder="可选" />
                </Form.Item>
                <Form.Item label={<span style={labelStyle}>App Secret（可空）</span>} name="robot_app_secret">
                  <Input.Password style={inputStyle} placeholder="可选" />
                </Form.Item>
              <Form.Item
                label={<span style={labelStyle}>唤醒词</span>}
                name="robot_wake_word"
                extra={<span style={{ color: "#8fa3bc", fontSize: 12 }}>当前唤醒词，APK重启后生效，默认：旺财</span>}
              >
                <Input style={inputStyle} placeholder="旺财" />
              </Form.Item>
              </div>
            </Form>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Button onClick={() => setCurrent(2)} style={{ color: '#8fa3bc', borderColor: 'rgba(255,255,255,0.15)' }}>
                上一步
              </Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  onClick={() => setCurrent(4)}
                  style={{ color: '#8fa3bc', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  跳过
                </Button>
                <Button
                  type="primary"
                  loading={saving}
                  onClick={handleSaveRobot}
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', border: 'none', fontWeight: 600 }}
                >
                  保存 & 下一步
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {current === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <Title level={2} style={{ color: '#00d4ff', margin: '0 0 8px' }}>配置完成！</Title>
            <Paragraph style={{ color: '#8fa3bc', marginBottom: 28 }}>
              系统已就绪，以下是您已配置的项目：
            </Paragraph>
            <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto 32px' }}>
              {[
                { key: 'cloud.host', label: '云平台地址', icon: '☁️' },
                { key: 'cloud.username', label: '云平台账号', icon: '👤' },
                { key: 'cloud.hall_id', label: '展馆 ID', icon: '🏛️' },
                { key: 'robot.sn', label: '机器人 SN', icon: '🤖' },
              ].map(item => (
                savedConfig[item.key] ? (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', marginBottom: 8,
                    background: 'rgba(0,255,136,0.05)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#8fa3bc' }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: '#00ff88', fontFamily: 'monospace' }}>
                        {item.key.includes('password') || item.key.includes('secret') ? '••••••' : savedConfig[item.key]}
                      </div>
                    </div>
                    <CheckCircleOutlined style={{ color: '#00ff88', marginLeft: 'auto' }} />
                  </div>
                ) : (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', marginBottom: 8,
                    background: 'rgba(143,163,188,0.04)',
                    border: '1px solid rgba(143,163,188,0.15)',
                    borderRadius: 8,
                    opacity: 0.6,
                  }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#8fa3bc' }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: '#8fa3bc' }}>未配置</div>
                    </div>
                  </div>
                )
              ))}
            </div>
            <Divider style={{ borderColor: 'rgba(0,212,255,0.1)' }} />
            <Button
              type="primary"
              size="large"
              onClick={handleFinish}
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                border: 'none',
                fontWeight: 600,
                height: 48,
                padding: '0 48px',
                fontSize: 16,
              }}
            >
              🚀 开始使用
            </Button>
          </div>
        )}

      </Card>

      <div style={{ marginTop: 20, color: '#8fa3bc33', fontSize: 12 }}>
        可随时通过顶部导航的"初始设置"重新访问此向导
      </div>
    </div>
  )
}
