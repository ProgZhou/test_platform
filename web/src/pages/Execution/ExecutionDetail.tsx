import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
  Button,
  Spin,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExecutionStore } from "../../stores/executionStore";
import { listReports } from "../../api/reports";
import type { ExecutionResult } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  pending: "warning",
  running: "processing",
  completed: "success",
  failed: "error",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "等待中",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

const RESULT_STATUS_COLORS: Record<string, string> = {
  passed: "success",
  failed: "error",
  timeout: "warning",
};

const RESULT_STATUS_LABELS: Record<string, string> = {
  passed: "通过",
  failed: "失败",
  timeout: "超时",
};

const formatDuration = (
  startedAt: string | null,
  finishedAt: string | null,
): string => {
  if (!startedAt || !finishedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diffMs = end - start;
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const ExecutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentExecution, loading, loadExecutionById } = useExecutionStore();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportId, setReportId] = useState<number | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    loadExecutionById(numId);

    intervalRef.current = setInterval(() => {
      loadExecutionById(numId);
    }, 3000);

    return () => stopPolling();
  }, [id]);

  useEffect(() => {
    if (
      currentExecution &&
      currentExecution.status !== "running" &&
      currentExecution.status !== "pending"
    ) {
      stopPolling();
    }
  }, [currentExecution?.status]);

  useEffect(() => {
    if (!id) return;
    listReports({ execution_id: Number(id) })
      .then((res) => {
        if (res.items.length > 0) {
          setReportId(res.items[0].id);
        }
      })
      .catch(() => {});
  }, [id, currentExecution?.status]);

  const handleGenerateReport = async () => {
    if (!id) return;
    setGeneratingReport(true);
    try {
      const res = await listReports({ execution_id: Number(id) });
      if (res.items.length > 0) {
        setReportId(res.items[0].id);
        message.success("报告已生成");
      } else {
        message.info("暂无报告，请稍后重试");
      }
    } catch {
      message.error("生成报告失败");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading && !currentExecution) {
    return (
      <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
    );
  }

  if (!currentExecution) return null;

  const isCompleted =
    currentExecution.status === "completed" ||
    currentExecution.status === "failed";

  const columns: ColumnsType<ExecutionResult> = [
    { title: "用例ID", dataIndex: "case_id", key: "case_id", width: 100 },
    {
      title: "用例名称",
      dataIndex: "case_id",
      key: "case_name",
      width: 160,
      render: (caseId: number) => `用例 #${caseId}`,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={RESULT_STATUS_COLORS[status]}>
          {RESULT_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      width: 120,
      render: (ms: number) => `${ms} ms`,
    },
    {
      title: "错误信息",
      dataIndex: "error_message",
      key: "error_message",
      ellipsis: true,
      render: (msg: string) => msg || "-",
    },
  ];

  return (
    <Card
      title={`执行详情 #${currentExecution.id}`}
      extra={
        <Space>
          {isCompleted && (
            <Button
              icon={<FileTextOutlined />}
              onClick={handleGenerateReport}
              loading={generatingReport}
            >
              生成报告
            </Button>
          )}
          {reportId && (
            <Button
              type="link"
              onClick={() => navigate(`/reports/${reportId}`)}
            >
              查看报告
            </Button>
          )}
          <Button onClick={() => navigate("/execution")}>返回列表</Button>
        </Space>
      }
    >
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="执行ID">
          {currentExecution.id}
        </Descriptions.Item>
        <Descriptions.Item label="脚本ID">
          {currentExecution.script_id}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={STATUS_COLORS[currentExecution.status]}>
            {STATUS_LABELS[currentExecution.status] || currentExecution.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="执行时长">
          {formatDuration(
            currentExecution.started_at,
            currentExecution.finished_at,
          )}
        </Descriptions.Item>
        <Descriptions.Item label="开始时间">
          {currentExecution.started_at || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="结束时间">
          {currentExecution.finished_at || "-"}
        </Descriptions.Item>
      </Descriptions>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用例数"
              value={currentExecution.total_cases}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="通过"
              value={currentExecution.passed_cases}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败"
              value={currentExecution.failed_cases}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="超时"
              value={currentExecution.timeout_cases}
              valueStyle={{ color: "#fa8c16" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginBottom: 16 }}>执行结果</h3>
      <Table
        columns={columns}
        dataSource={currentExecution.results || []}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: "暂无执行结果" }}
      />
    </Card>
  );
};

export default ExecutionDetail;
