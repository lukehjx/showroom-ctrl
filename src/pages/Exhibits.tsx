import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, Switch, message,
  Tag, Typography, Popconfirm, Tooltip, Spin, Empty, Grid, Row, Col,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, QrcodeOutlined,
  AppstoreOutlined, DownloadOutlined,
} from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { getExhibits, createExhibit, updateExhibit, deleteExhibit } from '../api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface Exhibit {
  id: string
  name: string
  keywords: string
  position: string
  autoNarration: boolean
  resources?: string[]
}

const mockExhibits: Exhibit[] = [
  { id: '1', name: '航天发展史', keywords: '航天,火箭,卫星', position: 'POI_001', autoNarration: true },
  { id: '2', name: '深海探索', keywords: '深海,潜水艇', position: 'POI_002', autoNarration: false },
  { id: '3', name: '人工智能', keywords: 'AI,机器人', position: 'POI_003', autoNarration: true },
]

export default function Exhibits() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [qrModalVisible, setQrModalVisible] = useState(false)
  const [editingExhibit, setEditingExhibit] = useState<Exhibit | null>(null)
  const [qrExhibit, setQrExhibit] = useState<Exhibit | null>(null)
  const [form] = Form.useForm()

  const screens = useBreakpoint()
  const isMobile = !screens.md

  const fetchExhibits = async () => {
    setLoading(true)
    try {
      const data: any = await getExhibits()
      setExhibits(data?.list || data || mockExhibits)
    } catch {
      setExhibits(mockExhibits)
    }
    setLoading(false)
  }

  useEffect(() => { fetchExhibits() }, [])

  const handleEdit = (exhibit: Exhibit) => {
    setEditingExhibit(exhibit)
    form.setFieldsValue(exhibit)
    setModalVisible(true)
  }

  const handleNew = () => {
    setEditingExhibit(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      if (editingExhibit) {
        await updateExhibit(editingExhibit.id, values)
        message.success('展项已更新')
      } else {
        await createExhibit(values)
        message.success('展项已创建')
      }
      setModalVisible(false)
      fetchExhibits()
    } catch {
      message.error('保存失败')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExhibit(id)
      message.success('已删除')
      fetchExhibits()
    } catch {
      message.error('删除失败')
    }
  }

  const handleShowQR = (exhibit: Exhibit) => {
    setQrExhibit(exhibit)
    setQrModalVisible(true)
  }

  const handleDownloadQR = () => {
    if (!qrExhibit) return
    const svg = document.getElementById('exhibit-qr')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${qrExhibit.name}-qrcode.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Desktop table columns
  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ color: '#fff' }}>{v}</Text> },
    { title: '关键词', dataIndex: 'keywords', key: 'keywords', render: (v: string) => v?.split(',').map((k: string) => <Tag key={k} color="blue" style={{ fontSize: 11 }}>{k}</Tag>) },
    { title: '绑定点位', dataIndex: 'position', key: 'position', render: (v: string) => <Tag color="purple">{v || '—'}</Tag> },
    {
      title: '自动讲解', dataIndex: 'autoNarration', key: 'autoNarration',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '开启' : '关闭'}</Tag>
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: Exhibit) => (
        <Space>
          <Tooltip title="编辑"><Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Tooltip title="生成二维码">
            <Button size="small" icon={<QrcodeOutlined />} onClick={() => handleShowQR(record)} style={{ borderColor: '#1677ff', color: '#1677ff' }} />
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Mobile card list
  const MobileCardList = () => (
    <Row gutter={[10, 10]}>
      {exhibits.length === 0 ? (
        <Col span={24}>
          <Empty description={<Text style={{ color: '#555' }}>暂无展项</Text>} />
        </Col>
      ) : (
        exhibits.map((exhibit) => (
          <Col span={24} key={exhibit.id}>
            <Card
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{exhibit.name}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="purple" style={{ fontSize: 11 }}>{exhibit.position || '—'}</Tag>
                    <Tag color={exhibit.autoNarration ? 'green' : 'default'} style={{ fontSize: 11 }}>
                      {exhibit.autoNarration ? '自动讲解' : '手动讲解'}
                    </Tag>
                  </div>
                  {exhibit.keywords && (
                    <div style={{ marginTop: 6 }}>
                      {exhibit.keywords.split(',').slice(0, 3).map((k) => (
                        <Tag key={k} color="blue" style={{ fontSize: 10, marginBottom: 2 }}>{k}</Tag>
                      ))}
                    </div>
                  )}
                </div>
                <Space size={6} style={{ marginLeft: 8, flexShrink: 0 }}>
                  <Button
                    size="middle"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(exhibit)}
                    style={{ minHeight: 44, minWidth: 44 }}
                  />
                  <Button
                    size="middle"
                    icon={<QrcodeOutlined />}
                    onClick={() => handleShowQR(exhibit)}
                    style={{ borderColor: '#1677ff', color: '#1677ff', minHeight: 44, minWidth: 44 }}
                  />
                  <Popconfirm title="确认删除？" onConfirm={() => handleDelete(exhibit.id)}>
                    <Button size="middle" icon={<DeleteOutlined />} danger style={{ minHeight: 44, minWidth: 44 }} />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          </Col>
        ))
      )}
    </Row>
  )

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={isMobile ? 10 : 16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={isMobile ? 5 : 4} style={{ color: '#fff', margin: 0 }}>
            <AppstoreOutlined style={{ marginRight: 8, color: '#1677ff' }} />展项管理
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNew} size={isMobile ? 'middle' : 'middle'} style={{ minHeight: 44 }}>
            新建展项
          </Button>
        </div>

        {isMobile ? (
          <MobileCardList />
        ) : (
          <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
            <Table
              dataSource={exhibits}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description={<Text style={{ color: '#555' }}>暂无展项</Text>} /> }}
              style={{ background: 'transparent' }}
            />
          </Card>
        )}
      </Space>

      {/* 编辑弹窗 */}
      <Modal
        title={editingExhibit ? '编辑展项' : '新建展项'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={isMobile ? '100%' : 480}
        style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : {}}
        styles={isMobile ? { body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } } : {}}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="展项名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="输入展项名称" style={{ height: 44 }} />
          </Form.Item>
          <Form.Item label="关键词" name="keywords">
            <Input placeholder="多个关键词用逗号分隔" style={{ height: 44 }} />
          </Form.Item>
          <Form.Item label="绑定点位" name="position">
            <Input placeholder="点位ID，如 POI_001" style={{ height: 44 }} />
          </Form.Item>
          <Form.Item label="自动讲解" name="autoNarration" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title={<Space><QrcodeOutlined />展项二维码 — {qrExhibit?.name}</Space>}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadQR}>下载 SVG</Button>,
          <Button key="close" onClick={() => setQrModalVisible(false)}>关闭</Button>,
        ]}
        centered
        width={isMobile ? '95%' : 400}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          {qrExhibit && (
            <>
              <div style={{ background: '#fff', display: 'inline-block', padding: 16, borderRadius: 12 }}>
                <QRCodeSVG
                  id="exhibit-qr"
                  value={`http://36.134.146.69:8200/api/qrcode/${qrExhibit.id}`}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Text style={{ color: '#888', fontSize: 12 }}>展项：{qrExhibit.name}</Text><br />
                <Text style={{ color: '#555', fontSize: 11 }}>ID: {qrExhibit.id}</Text>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Spin>
  )
}
