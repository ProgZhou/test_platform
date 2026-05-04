import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Tag,
  Spin,
  Divider,
  Typography,
  Space,
  message,
} from "antd";
import { ArrowLeftOutlined, SendOutlined } from "@ant-design/icons";
import * as apiApi from "../../api/apis";
import type { TestAPI, APIParam } from "../../types";

const { Title, Text } = Typography;

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

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return "#52c41a";
  if (status >= 300 && status < 400) return "#faad14";
  if (status >= 400) return "#ff4d4f";
  return "#1890ff";
};

interface DebugResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  duration_ms: number;
}

const renderParamInput = (param: APIParam, fieldName: string) => {
  const type = param.type;
  if (type === "bool") {
    return (
      <Form.Item
        key={param.id}
        name={fieldName}
        label={
          <span>
            {param.name}
            {param.required && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
              ({type})
            </Text>
          </span>
        }
        valuePropName="checked"
        tooltip={param.description}
      >
        <Switch aria-label={param.name} />
      </Form.Item>
    );
  }
  if (type === "int" || type === "long" || type === "float") {
    return (
      <Form.Item
        key={param.id}
        name={fieldName}
        label={
          <span>
            {param.name}
            {param.required && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
              ({type})
            </Text>
          </span>
        }
        rules={
          param.required
            ? [{ required: true, message: `请输入 ${param.name}` }]
            : []
        }
        tooltip={param.description}
      >
        <InputNumber style={{ width: "100%" }} aria-label={param.name} />
      </Form.Item>
    );
  }
  if (type === "object" || type.startsWith("array")) {
    return (
      <Form.Item
        key={param.id}
        name={fieldName}
        label={
          <span>
            {param.name}
            {param.required && (
              <span style={{ color: "red", marginLeft: 4 }}>*</span>
            )}
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
              ({type}, JSON)
            </Text>
          </span>
        }
        rules={[
          ...(param.required
            ? [{ required: true, message: `请输入 ${param.name}` }]
            : []),
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              try {
                JSON.parse(value);
                return Promise.resolve();
              } catch {
                return Promise.reject("请输入有效的 JSON 格式");
              }
            },
          },
        ]}
        tooltip={param.description}
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入 JSON 格式"
          aria-label={param.name}
        />
      </Form.Item>
    );
  }
  return (
    <Form.Item
      key={param.id}
      name={fieldName}
      label={
        <span>
          {param.name}
          {param.required && (
            <span style={{ color: "red", marginLeft: 4 }}>*</span>
          )}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
            ({type})
          </Text>
        </span>
      }
      rules={
        param.required
          ? [{ required: true, message: `请输入 ${param.name}` }]
          : []
      }
      tooltip={param.description}
    >
      <Input
        placeholder={param.description || param.name}
        aria-label={param.name}
      />
    </Form.Item>
  );
};

const ApiDebug: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [api, setApi] = useState<TestAPI | null>(null);
  const [loadingApi, setLoadingApi] = useState(true);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<DebugResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoadingApi(true);
      try {
        const data = await apiApi.listAPIs({ keyword: "" });
        const found = data.items.find((a) => a.id === Number(id));
        if (found) {
          setApi(found);
        } else {
          message.error("接口不存在");
        }
      } catch {
        message.error("加载接口失败");
      } finally {
        setLoadingApi(false);
      }
    };
    load();
  }, [id]);

  const handleSend = async () => {
    if (!api) return;
    try {
      const values = await form.validateFields();
      setSending(true);
      setResponse(null);

      const params: Record<string, any> = {};
      for (const [key, value] of Object.entries(values)) {
        if (value === undefined || value === "") continue;
        const param = api.params.find((p) => p.name === key);
        if (
          param &&
          (param.type === "object" || param.type.startsWith("array"))
        ) {
          try {
            params[key] = JSON.parse(value as string);
          } catch {
            params[key] = value;
          }
        } else {
          params[key] = value;
        }
      }

      const result = await apiApi.debugAPI(api.id, params);
      setResponse(result);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("请求失败");
    } finally {
      setSending(false);
    }
  };

  const bodyParams = api?.params.filter((p) => p.position === "body") || [];
  const headerParams = api?.params.filter((p) => p.position === "header") || [];

  if (loadingApi) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!api) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div style={{ marginTop: 24, color: "#ff4d4f" }}>接口不存在</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          接口调试
        </Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Tag
            color={getMethodColor(api.method)}
            style={{ fontSize: 14, padding: "2px 10px" }}
          >
            {api.method}
          </Tag>
          <Text strong style={{ fontSize: 16 }}>
            {api.name}
          </Text>
          <Text type="secondary" style={{ fontFamily: "monospace" }}>
            {api.url}
          </Text>
        </Space>
        {api.description && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{api.description}</Text>
          </div>
        )}
      </Card>

      <Card
        title="请求参数"
        extra={
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            onClick={handleSend}
            aria-label="发送请求"
          >
            发送请求
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={form} layout="vertical">
          {headerParams.length > 0 && (
            <>
              <Divider plain>
                Header 参数
              </Divider>
              {headerParams.map((p) => renderParamInput(p, p.name))}
            </>
          )}
          {bodyParams.length > 0 && (
            <>
              <Divider  plain>
                Body 参数
              </Divider>
              {bodyParams.map((p) => renderParamInput(p, p.name))}
            </>
          )}
          {api.params.length === 0 && (
            <Text type="secondary">该接口无参数</Text>
          )}
        </Form>
      </Card>

      {response && (
        <Card title="响应结果">
          <Space style={{ marginBottom: 12 }} wrap>
            <span>
              状态码:{" "}
              <Text
                strong
                style={{ color: getStatusColor(response.status), fontSize: 16 }}
              >
                {response.status}
              </Text>
            </span>
            <span>
              耗时: <Text strong>{response.duration_ms} ms</Text>
            </span>
          </Space>

          {response.headers && Object.keys(response.headers).length > 0 && (
            <>
              <Divider  plain>
                响应头
              </Divider>
              <div
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 4,
                  fontFamily: "monospace",
                  fontSize: 13,
                  marginBottom: 12,
                  maxHeight: 150,
                  overflow: "auto",
                }}
                aria-label="响应头"
              >
                {Object.entries(response.headers).map(([k, v]) => (
                  <div key={k}>
                    <Text type="secondary">{k}:</Text> {v}
                  </div>
                ))}
              </div>
            </>
          )}

          <Divider  plain>
            响应体
          </Divider>
          <pre
            style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: 16,
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 13,
              overflow: "auto",
              maxHeight: 400,
              margin: 0,
            }}
            aria-label="响应体"
          >
            {typeof response.body === "string"
              ? response.body
              : JSON.stringify(response.body, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default ApiDebug;
