import { useState, useEffect } from 'react'
import {
  Card, Table, Typography, Space, Tag, Modal, Timeline, Button,
  Spin, Descriptions, Empty,
} from 'antd'
import {
  BarChartOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { getReports, getReport } from '../api'

const { Title, Text } = Typography

const mockReports = [
  {
    id: '1', startTime: '2024-01-15 09:00:00', endTime: '2024-01-15 10:15:00',
    duration: '1小时15分', presetName: 'VIP接待', exhibitCount: 8,
    status: 'completed',
  },
  {
    id: '2', startTime: '2024-01-15 14:00:00', endTime: '2024-01-15 14:45:00',
    duration: '45分钟', presetName: '快速参观', exhibitCount: 4,
    status: 'completed',
  },
  {
    id: '3', startTime: '2024-01-14 10:00:00', endTime: '2024-01-14 11:30:00',
    duration: '1小时30分', presetName: '标准团队', exhibitCount: 10,
    status: 'completed',
  },
]

const mockDetail = {
  id: '1',
  presetName: 'VIP接待',
  startTime: '2024-01-15 09:00:00',
  endTime: '2024-01-15 10:15:00',
  duration: '1小时15分',
  exhibits: [
    { name: '航天发展史', time: '09:05', duration: '12分钟' },
    { name: '深海探索', time: '09:20', duration: '15分钟' },
    { name: '人工智能', time: '09:38', duration: '20分钟' },
    { name: '量子科技', time: '10:00', duration: '15分钟' },
  ],
  resources: [
    { name: '航天宣传片.mp4', terminal: 'LED主屏', time: '09:05' },
    { name: '深海纪录片.mp4', terminal: '副屏A', time: '09:20' },
    { name: 'AI介绍.mp4', terminal: '数字人终端', time: '09:38' },
  ],
  timeline: [
    { time: '09:00', event: '接待开始', type: 'start' },
    { time: '09:03', event: '机器人导航至展项A', type: 'nav' },
    { time: '09:05', event: '开始讲解「航天发展史」', type: 'narration' },
    { time: '09:17', event: '投放资源：航天宣传片.mp4', type: 'resource' },
    { time: '09:20', event: '导航至展项B', type: 'nav' },
    { time: '10:12', event: '最后一项讲解完成', type: 'narration' },
    { time: '10:15', event: '接待结束，机器人归位', type: 'end' },
  ],
}

export default function Reports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const fetchReports = async (page = 1) => {
    setLoading(true)
    try {
      const data: any = await getReports({ page, pageSize: 10 })
      setReports(data?.list || data || mockReports)
      setPagination((p) => ({ ...p, current: page, total: data?.total || mockReports.length }))
    } catch { setReports(mockReports) }
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [])

  const showDetail = async (id: string) => {
    setDetailVisible(true)
    setDetailLoading(true)
    try {
      const data: any = await getReport(id)
      setDetail(data || mockDetail)
    } catch { setDetail(mockDetail) }
    setDetailLoading(false)
  }

  const timelineColor = (type: string) => {
    if (type === 'start' || type === 'end') return 'green'
    if (type === 'nav') return 'blue'
    if (type === 'narration') return 'orange'
    return 'gray'
  }

  const columns = [
    {
      title: '套餐名称', dataIndex: 'presetName', key: 'presetName',
      render: (v: string) => <Text style={{ color: '#fff', fontWeight: 500 }}>{v}</Text>
    },
    {
      title: '开始时间', dataIndex: 'startTime', key: 'startTime',
      render: (v: string) => <Text style={{ color: '#888', fontSize: 12 }}>{v}</Text>
    },
    {
      title: '结束时间', dataIndex: 'endTime', key: 'endTime',
      render: (v: string) => <Text style={{ color: '#888', fontSize: 12 }}>{v}</Text>
    },
    {
      title: '用时', dataIndex: 'duration', key: 'duration',
      render: (v: string) => <Tag color="blue">{v}</Tag>
    },
    {
      title: '展项数', dataIndex: 'exhibitCount', key: 'exhibitCount',
      render: (v: number) => <Tag color="green">{v} 项</Tag>
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'orange'}>{v === 'completed' ? '已完成' : '进行中'}</Tag>
    },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: any) => (
        <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => showDetail(record.id)}>查看详情</Button>
      )
    },
  ]

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8, color: '#1677ff' }} />接待报告
        </Title>
        <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12 }}>
          <Table
            dataSource={reports}
            columns={columns}
            rowKey="id"
            locale={{ emptyText: <Empty description={<Text style={{ color: '#555' }}>暂无接待记录</Text>} /> }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: fetchReports,
            }}
          />
        </Card>
      </Space>

      <Modal
        title={<Space><BarChartOutlined />接待报告详情</Space>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
        width={700}
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="套餐">{detail.presetName}</Descriptions.Item>
                <Descriptions.Item label="用时">{detail.duration}</Descriptions.Item>
                <Descriptions.Item label="开始">{detail.startTime}</Descriptions.Item>
                <Descriptions.Item label="结束">{detail.endTime}</Descriptions.Item>
              </Descriptions>

              <Card title={<Text style={{ color: '#fff' }}>参观展项</Text>} size="small"
                style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
                {(detail.exhibits || []).map((ex: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a2a' }}>
                    <Space>
                      <Tag color="blue">{i + 1}</Tag>
                      <Text style={{ color: '#fff' }}>{ex.name}</Text>
                    </Space>
                    <Space>
                      <Text style={{ color: '#888', fontSize: 12 }}>{ex.time}</Text>
                      <Tag color="green">{ex.duration}</Tag>
                    </Space>
                  </div>
                ))}
              </Card>

              <Card title={<Text style={{ color: '#fff' }}>播放资源</Text>} size="small"
                style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
                {(detail.resources || []).map((res: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a2a' }}>
                    <Text style={{ color: '#ccc' }}>{res.name}</Text>
                    <Space>
                      <Tag color="purple">{res.terminal}</Tag>
                      <Text style={{ color: '#888', fontSize: 12 }}>{res.time}</Text>
                    </Space>
                  </div>
                ))}
              </Card>

              <Card title={<Text style={{ color: '#fff' }}>执行时间线</Text>} size="small"
                style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
                <Timeline
                  items={(detail.timeline || []).map((t: any) => ({
                    color: timelineColor(t.type),
                    dot: t.type === 'start' || t.type === 'end' ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
                    children: (
                      <Space>
                        <Text style={{ color: '#888', fontSize: 12 }}>{t.time}</Text>
                        <Text style={{ color: '#ccc' }}>{t.event}</Text>
                      </Space>
                    ),
                  }))}
                />
              </Card>
            </Space>
          )}
        </Spin>
      </Modal>
    </Spin>
  )
}
