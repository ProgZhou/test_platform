import React, { useEffect } from "react";
import { Card, Descriptions, Table, Button, Spin, Tag } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExecutionStore } from "../stores/executionStore";
import type { ExecutionResult } from "../types";

const ExecutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentExecution, loading, loadExecutionById } = useExecutionStore();

  useEffect(() => {
    if (id) {
      loadExecutionById(Number(id));
      const interval = setInterval(() => {
        loadExecutionById(Number(id));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [id]);

  if (loading && !currentExecution) {
    return (
      <Spin size="large" style={{ display: "block", margin: "100px auto" }} />
    );
  }

  if (!currentExecution) return null;

  const statusColors: Record<string, string> = {
    pending: "warning",
    running: "processing",
    completed: "success",
    failed: "error",
  };

  const resultStatusColors: Record<string, string> = {
    passed: "success",
    failed: "error",
    timeout: "warning",
  };

  const columns: ColumnsType<ExecutionResult> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "用例ID", dataIndex: "case_id", key: "case_id", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={resultStatusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      width: 120,
      render: (ms: number) => `${ms} ms`,
    },
    { title: "输出", dataIndex: "output", key: "output", ellipsis: true },
    {
      title: "错误信息",
      dataIndex: "error_message",
      key: "error_message",
      ellipsis: true,
    },
    {
      title: "执行时间",
      dataIndex: "executed_at",
      key: "executed_at",
      ellipsis: true,
    },
  ];

  return (
    <Card
      title={`执行详情 #${currentExecution.id}`}
      extra={<Button onClick={() => navigate("/execution")}>返回列表</Button>}
    >
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="执行ID">
          {currentExecution.id}
        </Descriptions.Item>
        <Descriptions.Item label="脚本ID">
          {currentExecution.script_id}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusColors[currentExecution.status]}>
            {currentExecution.status.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="总用例数">
          {currentExecution.total_cases}
        </Descriptions.Item>
        <Descriptions.Item label="通过">
          <span style={{ color: "#52c41a", fontWeight: "bold" }}>
            {currentExecution.passed_cases}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="失败">
          <span style={{ color: "#ff4d4f", fontWeight: "bold" }}>
            {currentExecution.failed_cases}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="超时">
          <span style={{ color: "#faad14", fontWeight: "bold" }}>
            {currentExecution.timeout_cases}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="通过率">
          {currentExecution.total_cases > 0
            ? `${((currentExecution.passed_cases / currentExecution.total_cases) * 100).toFixed(2)}%`
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="开始时间">
          {currentExecution.started_at || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="结束时间">
          {currentExecution.finished_at || "-"}
        </Descriptions.Item>
      </Descriptions>

      <h3 style={{ marginBottom: 16 }}>执行结果</h3>
      <Table
        columns={columns}
        dataSource={currentExecution.results || []}
        rowKey="id"
        pagination={false}
      />
    </Card>
  );
};

export default ExecutionDetail;
