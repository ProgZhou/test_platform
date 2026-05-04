import React, { useEffect, useState } from "react";
import { Card, Table, Button, Select, message, Space } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExecutionStore } from "../stores/executionStore";
import { useScriptStore } from "../stores/scriptStore";
import type { TestScript } from "../types";

const ExecutionCreate: React.FC = () => {
  const navigate = useNavigate();
  const {
    executions,
    total,
    currentPage,
    pageSize,
    loading,
    loadExecutions,
    createExecution,
  } = useExecutionStore();
  const { scripts, loadScripts } = useScriptStore();
  const [selectedScript, setSelectedScript] = useState<number | undefined>();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadExecutions();
    loadScripts(undefined, 1, 100);
  }, []);

  const handleRun = async () => {
    if (!selectedScript) {
      message.warning("请先选择脚本");
      return;
    }
    setRunning(true);
    try {
      const executionId = await createExecution(selectedScript);
      message.success("执行已启动");
      navigate(`/execution/${executionId}`);
    } catch {
      message.error("启动执行失败");
    } finally {
      setRunning(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "#faad14",
    running: "#1890ff",
    completed: "#52c41a",
    failed: "#ff4d4f",
  };

  const statusLabels: Record<string, string> = {
    pending: "等待中",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
  };

  const columns: ColumnsType<any> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "脚本ID", dataIndex: "script_id", key: "script_id", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <span style={{ color: statusColors[status] || "#000" }}>
          {statusLabels[status] || status}
        </span>
      ),
    },
    {
      title: "总用例",
      dataIndex: "total_cases",
      key: "total_cases",
      width: 100,
    },
    {
      title: "通过",
      dataIndex: "passed_cases",
      key: "passed_cases",
      width: 80,
    },
    {
      title: "失败",
      dataIndex: "failed_cases",
      key: "failed_cases",
      width: 80,
    },
    {
      title: "超时",
      dataIndex: "timeout_cases",
      key: "timeout_cases",
      width: 80,
    },
    {
      title: "开始时间",
      dataIndex: "started_at",
      key: "started_at",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/execution/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <Card title="自动化执行">
      <Space style={{ marginBottom: 24 }}>
        <Select
          placeholder="选择脚本"
          style={{ width: 300 }}
          value={selectedScript}
          onChange={setSelectedScript}
          options={scripts.map((s: TestScript) => ({
            label: s.name,
            value: s.id,
          }))}
          aria-label="选择执行脚本"
        />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleRun}
          loading={running}
        >
          开始执行
        </Button>
      </Space>

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

export default ExecutionCreate;
