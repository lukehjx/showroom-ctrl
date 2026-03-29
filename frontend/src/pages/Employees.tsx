import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, Upload, message,
  Space, Tag, Avatar, Popconfirm, Image
} from 'antd'
import {
  PlusOutlined, UploadOutlined, UserOutlined,
  CameraOutlined, DeleteOutlined
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'

interface Employee {
  id: number
  userid: string
  name: string
  department: string
  face_registered: boolean
  has_photo: boolean
  photo_url: string | null
  created_at: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  // photoUploadId state removed (unused)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (json.code === 0) setEmployees(json.data || [])
    } catch (e) {
      message.error('获取员工列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const handleCreate = async (values: any) => {
    const formData = new FormData()
    formData.append('name', values.name)
    formData.append('department', values.department || '')
    formData.append('userid', values.userid || '')
    if (photoFile) {
      formData.append('photo', photoFile)
    }
    try {
      const res = await fetch('/api/employees', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.code === 0) {
        message.success('员工创建成功')
        setCreateVisible(false)
        form.resetFields()
        setPhotoFile(null)
        setFileList([])
        fetchEmployees()
      } else {
        message.error(json.message || '创建失败')
      }
    } catch (e) {
      message.error('创建失败')
    }
  }

  const handleUploadPhoto = async (empId: number, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch(`/api/employees/${empId}/photo`, { method: 'POST', body: formData })
      const json = await res.json()
      if (json.code === 0) {
        message.success('照片上传成功')
        fetchEmployees()
      } else {
        message.error(json.message || '上传失败')
      }
    } catch (e) {
      message.error('上传失败')
    }
  }

  const handleDelete = async (empId: number) => {
    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.code === 0) {
        message.success('删除成功')
        fetchEmployees()
      } else {
        message.error(json.message || '删除失败')
      }
    } catch (e) {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: '头像',
      key: 'avatar',
      width: 70,
      render: (_: any, record: Employee) =>
        record.has_photo && record.photo_url ? (
          <Image
            src={record.photo_url}
            width={40}
            height={40}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
            placeholder={<Avatar icon={<UserOutlined />} size={40} />}
          />
        ) : (
          <Avatar icon={<UserOutlined />} size={40} />
        ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (v: string) => v || <span style={{ color: 'var(--text-muted)' }}>未设置</span>,
    },
    {
      title: '工号',
      dataIndex: 'userid',
      key: 'userid',
    },
    {
      title: '人脸状态',
      key: 'face',
      render: (_: any, record: Employee) =>
        record.face_registered ? (
          <Tag color="cyan">已注册</Tag>
        ) : (
          <Tag color="default">未注册</Tag>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Space>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUploadPhoto(record.id, file)
              return false
            }}
          >
            <Button size="small" icon={<CameraOutlined />}>
              {record.has_photo ? '换照片' : '上传照片'}
            </Button>
          </Upload>
          <Popconfirm
            title="确定删除该员工？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 20, fontWeight: 600 }}>
          人脸库 / 员工管理
        </h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setCreateVisible(true); setPhotoFile(null); setFileList([]) }}
        >
          新建员工
        </Button>
      </div>

      <Table
        dataSource={employees}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        size="middle"
      />

      <Modal
        title="新建员工"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); form.resetFields(); setPhotoFile(null); setFileList([]) }}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input placeholder="请输入部门（可选）" />
          </Form.Item>
          <Form.Item name="userid" label="工号">
            <Input placeholder="请输入工号（可选，留空自动生成）" />
          </Form.Item>
          <Form.Item label="人脸照片（可选）">
            <Upload
              accept="image/*"
              listType="picture-card"
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                setPhotoFile(file)
                setFileList([{
                  uid: '-1',
                  name: file.name,
                  status: 'done',
                  originFileObj: file,
                  url: URL.createObjectURL(file),
                }])
                return false
              }}
              onRemove={() => {
                setPhotoFile(null)
                setFileList([])
              }}
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>点击上传照片</div>
                </div>
              )}
            </Upload>
            {photoFile && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                已选择：{photoFile.name}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
