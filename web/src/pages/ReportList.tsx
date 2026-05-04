import React, { useEffect } from "react";
import { Card, Table, Button, Space, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExecutionStore } from "../stores/executionStore";
import { downloadReport } from "../api/reports";

const ReportList: React.FC = () => {
  const navigate = useNavigate();
  const { executions, total, currentPage, pageSize, loading, loadExecutions } =
    useExecutionStore();

  useEffect(() => {
    loadExecutions();
  }, []);

  const formatColors: Record<string, string> = {
    html: "blue",
    json: "green",
    xml: "orange",
  };

  const columns: ColumnsType<any> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: "执行ID",
      dataIndex: "execution_id",
      key: "execution_id",
      width: 100,
    },
    {
      title: "格式",
      dataIndex: "format",
      key: "format",
      width: 100,
      render: (format: string) => (
        <Tag color={formatColors[format] || "default"}>
          {format?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "文件大小",
      dataIndex: "file_size",
      key: "file_size",
      width: 120,
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: "文件路径",
      dataIndex: "file_path",
      key: "file_path",
      ellipsis: true,
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/reports/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadReport(record.id)}
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="测试报告">
      <Table
        columns={columns}
        dataSource={executions}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total,
          onChange: (page, size) => loadExecutions(page, size),
        }}
      />
    </Card>
  );
};

export default ReportList;
