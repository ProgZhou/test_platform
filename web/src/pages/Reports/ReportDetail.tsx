import React, { useEffect, useState } from "react";
import { Card, Descriptions, Button, Spin, Tag, message, Space } from "antd";
import { DownloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById, downloadReport } from "../../api/reports";
import type { Report } from "../../types";

const FORMAT_COLORS: Record<string, string> = {
  html: "blue",
  json: "green",
  xml: "orange",
};

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReportById(Number(id))
      .then(setReport)
      .catch(() => {
        message.error("加载报告失败");
        navigate("/reports");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
    );
  }

  if (!report) return null;

  return (
    <Card
      title={`报告详情 #${report.id}`}
      extra={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/reports")}
          >
            返回列表
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadReport(report.id)}
          >
            下载报告
          </Button>
        </Space>
      }
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="报告ID">{report.id}</Descriptions.Item>
        <Descriptions.Item label="关联执行ID">
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => navigate(`/execution/${report.execution_id}`)}
          >
            #{report.execution_id}
          </Button>
        </Descriptions.Item>
        <Descriptions.Item label="格式">
          <Tag color={FORMAT_COLORS[report.format] || "default"}>
            {report.format?.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="文件大小">
          {(report.file_size / 1024).toFixed(2)} KB
        </Descriptions.Item>
        <Descriptions.Item label="文件路径" span={2}>
          {report.file_path}
        </Descriptions.Item>
        <Descriptions.Item label="生成时间" span={2}>
          {report.created_at}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default ReportDetail;
