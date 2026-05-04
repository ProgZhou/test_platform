import React, { useEffect, useState } from "react";
import { Table, Button, Input, Tag, Space, Modal, message } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  BugOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useAPIStore } from "../../stores/apiStore";
import type { TestAPI } from "../../types";
import ApiForm from "./ApiForm";
import ApiImportOpenAPI from "./ApiImportOpenAPI";

const { Search } = Input;

const ApiList: React.FC = () => {
  const navigate = useNavigate();
  const { apis, total, currentPage, pageSize, loading, loadAPIs, deleteAPI } =
    useAPIStore();
  const [formVisible, setFormVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingApi, setEditingApi] = useState<TestAPI | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    loadAPIs(1, pageSize, "");
  }, []);

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    loadAPIs(1, pageSize, value);
  };

  const handlePageChange = (page: number, size?: number) => {
    loadAPIs(page, size || pageSize, searchKeyword);
  };

  const handleCreate = () => {
    setEditingApi(null);
    setFormVisible(true);
  };

  const handleEdit = (record: TestAPI) => {
    setEditingApi(record);
    setFormVisible(true);
  };

  const handleDebug = (record: TestAPI) => {
    navigate(`/apis/${record.id}/debug`);
  };

  const handleDelete = (record: TestAPI) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除接口 "${record.name}" 吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteAPI(record.id);
          message.success("删除成功");
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingApi(null);
  };

  const handleImportSuccess = () => {
    setImportVisible(false);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "blue",
      POST: "green",
      PUT: "orange",
      DELETE: "red",
      PATCH: "purple",
    };
    return colors[method] || "default";
  };

  const columns: ColumnsType<TestAPI> = [
    {
      title: "接口名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
    },
    {
      title: "请求方法",
      dataIndex: "method",
      key: "method",
      width: 100,
      render: (method: string) => (
        <Tag color={getMethodColor(method)}>{method}</Tag>
      ),
    },
    {
      title: "参数数量",
      key: "params",
      width: 100,
      render: (_, record) => record.params?.length || 0,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            aria-label={`编辑接口 ${record.name}`}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<BugOutlined />}
            onClick={() => handleDebug(record)}
            aria-label={`调试接口 ${record.name}`}
          >
            调试
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            aria-label={`删除接口 ${record.name}`}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            aria-label="新建接口"
          >
            新建接口
          </Button>
          <Button
            onClick={() => setImportVisible(true)}
            aria-label="导入OpenAPI"
          >
            导入OpenAPI
          </Button>
        </Space>
        <Search
          placeholder="搜索接口名称或URL"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          aria-label="搜索接口"
        />
      </div>

      <Table
        columns={columns}
        dataSource={apis}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: handlePageChange,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        aria-label="接口列表"
      />

      <ApiForm
        visible={formVisible}
        api={editingApi}
        onSuccess={handleFormSuccess}
        onCancel={() => setFormVisible(false)}
      />

      <ApiImportOpenAPI
        visible={importVisible}
        onSuccess={handleImportSuccess}
        onCancel={() => setImportVisible(false)}
      />
    </div>
  );
};

export default ApiList;
