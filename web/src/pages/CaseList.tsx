import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Upload,
  Space,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import FolderTree from "../components/FolderTree/FolderTree";
import { useCaseStore } from "../stores/caseStore";
import { downloadTemplate } from "../api/cases";
import type { TestCase } from "../types";

const { TextArea } = Input;

const CaseList: React.FC = () => {
  const {
    cases,
    total,
    currentPage,
    pageSize,
    loading,
    loadCases,
    createCase,
    updateCase,
    deleteCase,
    importExcel,
    setSelectedFolderId,
  } = useCaseStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [form] = Form.useForm();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const handleFolderSelect = (folderId: number | null) => {
    setSelectedFolder(folderId);
    setSelectedFolderId(folderId || undefined);
    loadCases(folderId || undefined, 1, pageSize);
  };

  const handleCreate = () => {
    if (!selectedFolder) {
      message.warning("请先选择文件夹");
      return;
    }
    setEditingCase(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: TestCase) => {
    setEditingCase(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除此用例吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteCase(id);
          message.success("删除成功");
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingCase) {
        await updateCase(editingCase.id, values);
        message.success("更新成功");
      } else {
        await createCase({ ...values, folder_id: selectedFolder! });
        message.success("创建成功");
      }
      setModalVisible(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleImport = async (file: File) => {
    if (!selectedFolder) {
      message.warning("请先选择文件夹");
      return false;
    }
    try {
      const count = await importExcel(selectedFolder, file);
      message.success(`成功导入 ${count} 条用例`);
    } catch {
      message.error("导入失败");
    }
    return false;
  };

  const columns: ColumnsType<TestCase> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "用例名称", dataIndex: "name", key: "name" },
    {
      title: "前置条件",
      dataIndex: "precondition",
      key: "precondition",
      ellipsis: true,
    },
    { title: "测试步骤", dataIndex: "steps", key: "steps", ellipsis: true },
    {
      title: "预期结果",
      dataIndex: "expected_result",
      key: "expected_result",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={16} style={{ height: "100%" }}>
      <Col span={6}>
        <Card title="文件夹" style={{ height: "100%" }}>
          <FolderTree module="case" onSelect={handleFolderSelect} />
        </Card>
      </Col>
      <Col span={18}>
        <Card
          title="测试用例"
          extra={
            <Space>
              <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                下载模板
              </Button>
              <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                accept=".xlsx,.xls"
              >
                <Button icon={<UploadOutlined />}>导入Excel</Button>
              </Upload>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建用例
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={cases}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              onChange: (page, size) =>
                loadCases(selectedFolder || undefined, page, size),
            }}
          />
        </Card>
      </Col>

      <Modal
        title={editingCase ? "编辑用例" : "新建用例"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="用例名称"
            rules={[{ required: true, message: "请输入用例名称" }]}
          >
            <Input placeholder="请输入用例名称" />
          </Form.Item>
          <Form.Item name="precondition" label="前置条件">
            <TextArea rows={3} placeholder="请输入前置条件" />
          </Form.Item>
          <Form.Item
            name="steps"
            label="测试步骤"
            rules={[{ required: true, message: "请输入测试步骤" }]}
          >
            <TextArea rows={4} placeholder="请输入测试步骤" />
          </Form.Item>
          <Form.Item
            name="expected_result"
            label="预期结果"
            rules={[{ required: true, message: "请输入预期结果" }]}
          >
            <TextArea rows={3} placeholder="请输入预期结果" />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  );
};

export default CaseList;
