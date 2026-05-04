import React, { useEffect, useState } from "react";
import { Card, Table, Button, Steps, message, Space, Checkbox } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useCaseStore } from "../../stores/caseStore";
import { useScriptStore } from "../../stores/scriptStore";
import { useExecutionStore } from "../../stores/executionStore";
import type { TestCase, TestScript } from "../../types";

const ExecutionCreate: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<
    number | undefined
  >();
  const [creating, setCreating] = useState(false);

  const {
    cases,
    total: casesTotal,
    currentPage: casesPage,
    pageSize: casesPageSize,
    loading: casesLoading,
    loadCases,
  } = useCaseStore();

  const {
    scripts,
    total: scriptsTotal,
    currentPage: scriptsPage,
    pageSize: scriptsPageSize,
    loading: scriptsLoading,
    loadScripts,
  } = useScriptStore();

  const { createExecution } = useExecutionStore();

  useEffect(() => {
    loadCases(undefined, 1, 20);
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      loadScripts(undefined, 1, 20);
    }
  }, [currentStep]);

  const handleCaseSelection = (caseId: number, checked: boolean) => {
    if (checked) {
      setSelectedCaseIds([...selectedCaseIds, caseId]);
    } else {
      setSelectedCaseIds(selectedCaseIds.filter((id) => id !== caseId));
    }
  };

  const handleSelectAllCases = (checked: boolean) => {
    if (checked) {
      setSelectedCaseIds(cases.map((c) => c.id));
    } else {
      setSelectedCaseIds([]);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      if (selectedCaseIds.length === 0) {
        message.warning("请至少选择一个测试用例");
        return;
      }
      setCurrentStep(1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(0);
  };

  const handleStartExecution = async () => {
    if (!selectedScriptId) {
      message.warning("请选择一个测试脚本");
      return;
    }

    if (selectedCaseIds.length === 0) {
      message.warning("请至少选择一个测试用例");
      return;
    }

    setCreating(true);
    try {
      const executionId = await createExecution(selectedScriptId);
      message.success("执行任务已创建");
      navigate(`/execution/${executionId}`);
    } catch (error) {
      message.error("创建执行任务失败");
    } finally {
      setCreating(false);
    }
  };

  const caseColumns: ColumnsType<TestCase> = [
    {
      title: (
        <Checkbox
          checked={selectedCaseIds.length === cases.length && cases.length > 0}
          indeterminate={
            selectedCaseIds.length > 0 && selectedCaseIds.length < cases.length
          }
          onChange={(e) => handleSelectAllCases(e.target.checked)}
        >
          全选
        </Checkbox>
      ),
      key: "select",
      width: 80,
      render: (_, record) => (
        <Checkbox
          checked={selectedCaseIds.includes(record.id)}
          onChange={(e) => handleCaseSelection(record.id, e.target.checked)}
        />
      ),
    },
    { title: "用例ID", dataIndex: "id", key: "id", width: 100 },
    { title: "用例名称", dataIndex: "name", key: "name", ellipsis: true },
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
  ];

  const scriptColumns: ColumnsType<TestScript> = [
    {
      title: "选择",
      key: "select",
      width: 80,
      render: (_, record) => (
        <Checkbox
          checked={selectedScriptId === record.id}
          onChange={(e) =>
            setSelectedScriptId(e.target.checked ? record.id : undefined)
          }
        />
      ),
    },
    { title: "脚本ID", dataIndex: "id", key: "id", width: 100 },
    { title: "脚本名称", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "语言",
      dataIndex: "language",
      key: "language",
      width: 100,
      render: (lang: string) => lang.toUpperCase(),
    },
    {
      title: "文件路径",
      dataIndex: "file_path",
      key: "file_path",
      ellipsis: true,
    },
    {
      title: "文件大小",
      dataIndex: "file_size",
      key: "file_size",
      width: 120,
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`,
    },
  ];

  return (
    <Card title="创建执行任务">
      <Steps
        current={currentStep}
        style={{ marginBottom: 24 }}
        items={[{ title: "选择测试用例" }, { title: "选择测试脚本" }]}
      />

      {currentStep === 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <span>已选择 {selectedCaseIds.length} 个测试用例</span>
          </div>
          <Table
            columns={caseColumns}
            dataSource={cases}
            rowKey="id"
            loading={casesLoading}
            pagination={{
              current: casesPage,
              pageSize: casesPageSize,
              total: casesTotal,
              onChange: (page, size) => loadCases(undefined, page, size),
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleNextStep}>
              下一步
            </Button>
          </Space>
        </>
      )}

      {currentStep === 1 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <span>
              已选择测试用例: {selectedCaseIds.length} 个 | 已选择脚本:{" "}
              {selectedScriptId ? "1 个" : "未选择"}
            </span>
          </div>
          <Table
            columns={scriptColumns}
            dataSource={scripts}
            rowKey="id"
            loading={scriptsLoading}
            pagination={{
              current: scriptsPage,
              pageSize: scriptsPageSize,
              total: scriptsTotal,
              onChange: (page, size) => loadScripts(undefined, page, size),
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={handlePrevStep}>上一步</Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartExecution}
              loading={creating}
              disabled={!selectedScriptId || selectedCaseIds.length === 0}
            >
              开始执行
            </Button>
          </Space>
        </>
      )}
    </Card>
  );
};

export default ExecutionCreate;
