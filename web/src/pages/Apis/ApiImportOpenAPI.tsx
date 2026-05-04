import React, { useState } from "react";
import { Modal, Select, Input, Button, Alert, Table, Tag, message } from "antd";
import { useAPIStore } from "../../stores/apiStore";

const { TextArea } = Input;
const { Option } = Select;

interface ParsedEndpoint {
  name: string;
  url: string;
  method: string;
  description: string;
  paramCount: number;
}

interface ApiImportOpenAPIProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

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

const parseOpenAPISpec = (
  content: string,
  format: "json" | "yaml",
): ParsedEndpoint[] => {
  let spec: any;
  if (format === "json") {
    spec = JSON.parse(content);
  } else {
    // Basic YAML parser for OpenAPI - handles simple key: value and nested structures
    const lines = content.split("\n");
    const parseYaml = (lines: string[], baseIndent = 0): any => {
      const result: any = {};
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trimStart();
        if (!trimmed || trimmed.startsWith("#")) {
          i++;
          continue;
        }
        const indent = line.length - trimmed.length;
        if (indent < baseIndent) break;
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx === -1) {
          i++;
          continue;
        }
        const key = trimmed.slice(0, colonIdx).trim();
        const rest = trimmed.slice(colonIdx + 1).trim();
        if (rest) {
          result[key] = rest.replace(/^['"]|['"]$/g, "");
          i++;
        } else {
          const childLines: string[] = [];
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            const nextTrimmed = nextLine.trimStart();
            if (!nextTrimmed || nextTrimmed.startsWith("#")) {
              childLines.push(nextLine);
              i++;
              continue;
            }
            const nextIndent = nextLine.length - nextTrimmed.length;
            if (nextIndent <= indent) break;
            childLines.push(nextLine);
            i++;
          }
          result[key] = parseYaml(childLines, indent + 1);
        }
      }
      return result;
    };
    spec = parseYaml(lines);
  }

  const endpoints: ParsedEndpoint[] = [];
  const paths = spec.paths || {};
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (!["get", "post", "put", "delete", "patch"].includes(method)) continue;
      const op = operation as any;
      const paramCount =
        (op.parameters?.length || 0) +
        (op.requestBody?.content?.["application/json"]?.schema?.properties
          ? Object.keys(
              op.requestBody.content["application/json"].schema.properties,
            ).length
          : 0);
      endpoints.push({
        name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
        url: path,
        method: method.toUpperCase(),
        description: op.description || "",
        paramCount,
      });
    }
  }
  return endpoints;
};

const ApiImportOpenAPI: React.FC<ApiImportOpenAPIProps> = ({
  visible,
  onSuccess,
  onCancel,
}) => {
  const [format, setFormat] = useState<"json" | "yaml">("yaml");
  const [content, setContent] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedEndpoints, setParsedEndpoints] = useState<
    ParsedEndpoint[] | null
  >(null);
  const [importing, setImporting] = useState(false);
  const { importOpenAPI } = useAPIStore();

  const handleParse = () => {
    setParseError(null);
    setParsedEndpoints(null);
    if (!content.trim()) {
      setParseError("请输入 OpenAPI 规范内容");
      return;
    }
    try {
      const endpoints = parseOpenAPISpec(content, format);
      if (endpoints.length === 0) {
        setParseError("未解析到任何接口，请检查规范格式");
        return;
      }
      setParsedEndpoints(endpoints);
    } catch (err: any) {
      setParseError(`解析失败: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) return;
    setImporting(true);
    try {
      const result = await importOpenAPI(content, format);
      message.success(`成功导入 ${result} 个接口`);
      setContent("");
      setParsedEndpoints(null);
      setParseError(null);
      onSuccess();
    } catch {
      message.error("导入失败，请检查规范格式");
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    setContent("");
    setParsedEndpoints(null);
    setParseError(null);
    onCancel();
  };

  const columns = [
    { title: "接口名称", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
    },
    {
      title: "方法",
      dataIndex: "method",
      key: "method",
      width: 90,
      render: (m: string) => <Tag color={getMethodColor(m)}>{m}</Tag>,
    },
    {
      title: "参数数量",
      dataIndex: "paramCount",
      key: "paramCount",
      width: 90,
    },
  ];

  return (
    <Modal
      title="导入 OpenAPI 规范"
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="parse" onClick={handleParse}>
          解析预览
        </Button>,
        <Button
          key="import"
          type="primary"
          loading={importing}
          disabled={!parsedEndpoints || parsedEndpoints.length === 0}
          onClick={handleImport}
        >
          确认导入
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ marginBottom: 12 }}>
        <span style={{ marginRight: 8 }}>格式:</span>
        <Select
          value={format}
          onChange={(v) => {
            setFormat(v);
            setParsedEndpoints(null);
            setParseError(null);
          }}
          style={{ width: 100 }}
          aria-label="选择格式"
        >
          <Option value="yaml">YAML</Option>
          <Option value="json">JSON</Option>
        </Select>
      </div>

      <TextArea
        rows={10}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setParsedEndpoints(null);
          setParseError(null);
        }}
        placeholder={
          format === "yaml"
            ? "粘贴 OpenAPI YAML 内容..."
            : "粘贴 OpenAPI JSON 内容..."
        }
        style={{ fontFamily: "monospace", fontSize: 13 }}
        aria-label="OpenAPI 规范内容"
      />

      {parseError && (
        <Alert
          type="error"
          message={parseError}
          style={{ marginTop: 12 }}
          showIcon
        />
      )}

      {parsedEndpoints && parsedEndpoints.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, color: "#52c41a" }}>
            解析成功，共发现 {parsedEndpoints.length} 个接口:
          </div>
          <Table
            columns={columns}
            dataSource={parsedEndpoints}
            rowKey={(r) => `${r.method}-${r.url}`}
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
            aria-label="解析到的接口列表"
          />
        </div>
      )}
    </Modal>
  );
};

export default ApiImportOpenAPI;
