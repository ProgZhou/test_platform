import React, { useEffect, useState } from "react";
import { Card, Table, Button, Space, Tag, message } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { listReports, downloadReport } from "../../api/reports";
import type { Report } from "../../types";

const FORMAT_COLORS: Record<string, string> = {
  html: "blue",
  json: "green",
  xml: "orange",
};

const ReportList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const fetchReports = async (page = 1, size = 20) => {
    setLoading(true);
    try {
      const res = await listReports({ page, page_size: size });
      setReports(res.items);
      setTotal(res.total);
      setCurrentPage(page);
      setPageSize(size);
    } catch {
      message.error("加载报告列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const columns: ColumnsType<Report> = [
    { title: "报告ID", dataIndex: "id", key: "id", width: 100 },
    {
      title: "关联执行ID",
      dataIndex: "execution_id",
      key: "execution_id",
      width: 120,
      render: (execId: number) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => navigate(`/execution/${execId}`)}
        >
          #{execId}
        </Button>
      ),
    },
    {
      title: "格式",
      dataIndex: "format",
      key: "format",
      width: 100,
      render: (format: string) => (
        <Tag color={FORMAT_COLORS[format] || "default"}>
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
      title: "生成时间",
      dataIndex: "created_at",
      key: "created_at",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
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
        dataSource={reports}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total,
          onChange: (page, size) => fetchReports(page, size),
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
        locale={{ emptyText: "暂无报告" }}
      />
    </Card>
  );
};

export default ReportList;
