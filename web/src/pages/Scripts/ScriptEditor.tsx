import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Space, Spin, Typography, Tag, message } from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useScriptStore } from "../../stores/scriptStore";
import CodeEditor from "../../components/CodeEditor/CodeEditor";
import * as executionApi from "../../api/execution";

const { Text } = Typography;

interface ConsoleOutput {
  exitCode: number | null;
  output: string;
  duration: string;
  error: string | null;
}

const ScriptEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentScript, loading, loadScriptById, updateScript, runScript } =
    useScriptStore();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    loadScriptById(Number(id));
  }, [id]);

  useEffect(() => {
    if (currentScript) {
      setContent(currentScript.content || "");
    }
  }, [currentScript]);

  const handleSave = async () => {
    if (!currentScript) return;
    setSaving(true);
    try {
      await updateScript(currentScript.id, { content });
      message.success("保存成功");
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!currentScript) return;
    setRunning(true);
    setConsoleOutput(null);
    try {
      const executionId = await runScript(currentScript.id);
      // Poll for execution result
      let attempts = 0;
      const poll = async () => {
        try {
          const exec = await executionApi.getExecutionById(executionId);
          if (exec.status === "completed" || exec.status === "failed") {
            const result = exec.results?.[0];
            const startedAt = exec.started_at
              ? new Date(exec.started_at).getTime()
              : 0;
            const finishedAt = exec.finished_at
              ? new Date(exec.finished_at).getTime()
              : 0;
            const durationMs = finishedAt - startedAt;
            setConsoleOutput({
              exitCode: exec.status === "completed" ? 0 : 1,
              output: result?.output || "",
              duration: durationMs > 0 ? `${durationMs} ms` : "-",
              error: result?.error_message || null,
            });
            setRunning(false);
          } else if (attempts < 30) {
            attempts++;
            setTimeout(poll, 1000);
          } else {
            setConsoleOutput({
              exitCode: null,
              output: "",
              duration: "-",
              error: "执行超时，请稍后查看执行记录",
            });
            setRunning(false);
          }
        } catch {
          setConsoleOutput({
            exitCode: 1,
            output: "",
            duration: "-",
            error: "获取执行结果失败",
          });
          setRunning(false);
        }
      };
      setTimeout(poll, 1000);
    } catch {
      message.error("启动执行失败");
      setRunning(false);
    }
  };

  const getLanguage = () => {
    if (!currentScript) return "plaintext";
    return currentScript.language === "go" ? "go" : "python";
  };

  if (loading && !currentScript) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentScript && !loading) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div style={{ marginTop: 24, color: "#ff4d4f" }}>脚本不存在</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            返回
          </Button>
          {currentScript && (
            <>
              <Text strong style={{ fontSize: 16 }}>
                {currentScript.name}
              </Text>
              <Tag color={currentScript.language === "go" ? "cyan" : "blue"}>
                {currentScript.language === "go" ? "Go" : "Python"}
              </Tag>
            </>
          )}
        </Space>
        <Space>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            aria-label="保存脚本"
          >
            保存
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={handleRun}
            aria-label="调试运行"
          >
            调试运行
          </Button>
        </Space>
      </div>

      {/* Editor area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: consoleOutput || running ? "0 0 60%" : 1,
            overflow: "hidden",
          }}
        >
          <CodeEditor
            value={content}
            onChange={(v) => setContent(v || "")}
            language={getLanguage()}
          />
        </div>

        {/* Console panel */}
        {(consoleOutput || running) && (
          <div
            style={{
              flex: "0 0 40%",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 16px",
                background: "#1e1e1e",
                color: "#ccc",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <span>控制台输出</span>
              {consoleOutput && (
                <Space size="middle">
                  <span>
                    退出码:{" "}
                    <Text
                      style={{
                        color:
                          consoleOutput.exitCode === 0 ? "#52c41a" : "#ff4d4f",
                        fontWeight: 600,
                      }}
                    >
                      {consoleOutput.exitCode ?? "-"}
                    </Text>
                  </span>
                  <span style={{ color: "#ccc" }}>
                    耗时: {consoleOutput.duration}
                  </span>
                </Space>
              )}
            </div>
            <div
              style={{
                flex: 1,
                background: "#1e1e1e",
                color: "#d4d4d4",
                padding: 16,
                fontFamily: "monospace",
                fontSize: 13,
                overflow: "auto",
              }}
              aria-label="控制台输出"
              aria-live="polite"
            >
              {running && !consoleOutput && (
                <span style={{ color: "#faad14" }}>正在执行...</span>
              )}
              {consoleOutput?.output && (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {consoleOutput.output}
                </pre>
              )}
              {consoleOutput?.error && (
                <pre
                  style={{
                    margin: 0,
                    color: "#ff4d4f",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {consoleOutput.error}
                </pre>
              )}
              {consoleOutput &&
                !consoleOutput.output &&
                !consoleOutput.error && (
                  <span style={{ color: "#888" }}>（无输出）</span>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptEditor;
