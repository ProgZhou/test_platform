import React, { useEffect, useState } from "react";
import { Table, Button, Tag, Space, Modal, message, Layout } from "antd";
import {
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useScriptStore } from "../../stores/scriptStore";
import FolderTree from "../../components/FolderTree/FolderTree";
import type { TestScript } from "../../types";
import ScriptUpload from "./ScriptUpload";

const { Sider, Content } = Layout;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ScriptList: React.FC = () => {
  const navigate = useNavigate();
  const {
    scripts,
    total,
    currentPage,
    pageSize,
    loading,
    loadScripts,
    deleteScript,
    setSelectedFolderId,
    selectedFolderId,
  } = useScriptStore();
  const [uploadVisible, setUploadVisible] = useState(false);

  useEffect(() => {
    loadScripts(undefined, 1, pageSize);
  }, []);

  const handleFolderSelect = (folderId: number | null) => {
    const id = folderId ?? undefined;
    setSelectedFolderId(id);
    loadScripts(id, 1, pageSize);
  };

  const handlePageChange = (page: number, size?: number) => {
    loadScripts(selectedFolderId, page, size || pageSize);
  };

  const handleEdit = (record: TestScript) => {
    navigate(`/scripts/${record.id}/edit`);
  };

  const handleDelete = (record: TestScript) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除脚本 "${record.name}" 吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteScript(record.id);
          message.success("删除成功");
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleUploadSuccess = () => {
    setUploadVisible(false);
  };

  const columns: ColumnsType<TestScript> = [
    {
      title: "脚本名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "语言",
      dataIndex: "language",
      key: "language",
      width: 100,
      render: (lang: string) => (
        <Tag color={lang === "go" ? "cyan" : "blue"}>
          {lang === "go" ? "Go" : "Python"}
        </Tag>
      ),
    },
    {
      title: "文件大小",
      dataIndex: "file_size",
      key: "file_size",
      width: 120,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (t: string) => new Date(t).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            aria-label={`编辑脚本 ${record.name}`}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            aria-label={`删除脚本 ${record.name}`}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ height: "100%", background: "#fff" }}>
      <Sider
        width={240}
        style={{
          background: "#fafafa",
          borderRight: "1px solid #f0f0f0",
          padding: "16px 8px",
          overflow: "auto",
        }}
        aria-label="脚本文件夹树"
      >
        <div style={{ fontWeight: 600, marginBottom: 12, paddingLeft: 8 }}>
          文件夹
        </div>
        <FolderTree module="script" onSelect={handleFolderSelect} />
      </Sider>

      <Content style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadVisible(true)}
            aria-label="上传脚本"
          >
            上传脚本
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={scripts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          aria-label="脚本列表"
        />

        <ScriptUpload
          visible={uploadVisible}
          onSuccess={handleUploadSuccess}
          onCancel={() => setUploadVisible(false)}
        />
      </Content>
    </Layout>
  );
};

export default ScriptList;
