import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  message,
} from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useAPIStore } from "../../stores/apiStore";
import { getParamNameError } from "../../utils/validators";
import type { TestAPI } from "../../types";

const { Option } = Select;
const { TextArea } = Input;

interface ApiFormProps {
  visible: boolean;
  api: TestAPI | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PARAM_TYPES = [
  { value: "string", label: "string" },
  { value: "bool", label: "bool" },
  { value: "int", label: "int" },
  { value: "long", label: "long" },
  { value: "float", label: "float" },
  { value: "object", label: "object" },
  { value: "array<string>", label: "array<string>" },
  { value: "array<int>", label: "array<int>" },
  { value: "array<long>", label: "array<long>" },
  { value: "array<float>", label: "array<float>" },
  { value: "array<object>", label: "array<object>" },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const ApiForm: React.FC<ApiFormProps> = ({
  visible,
  api,
  onSuccess,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const { createAPI, updateAPI } = useAPIStore();
  const isEdit = !!api;

  useEffect(() => {
    if (visible) {
      if (api) {
        form.setFieldsValue({
          name: api.name,
          url: api.url,
          method: api.method,
          description: api.description,
          params:
            api.params?.map((p) => ({
              name: p.name,
              type: p.type,
              description: p.description,
              required: p.required,
              position: p.position,
            })) || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ method: "GET", params: [] });
      }
    }
  }, [visible, api]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        url: values.url,
        method: values.method,
        description: values.description || "",
        params: (values.params || []).map((p: any, index: number) => ({
          name: p.name,
          type: p.type,
          description: p.description || "",
          required: !!p.required,
          position: p.position,
          sort_order: index,
        })),
      };

      if (isEdit && api) {
        await updateAPI(api.id, payload);
        message.success("更新成功");
      } else {
        await createAPI(payload as any);
        message.success("创建成功");
      }
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(isEdit ? "更新失败" : "创建失败");
    }
  };

  return (
    <Modal
      title={isEdit ? "编辑接口" : "新建接口"}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText={isEdit ? "更新" : "创建"}
      cancelText="取消"
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        aria-label={isEdit ? "编辑接口表单" : "新建接口表单"}
      >
        <Form.Item
          name="name"
          label="接口名称"
          rules={[{ required: true, message: "请输入接口名称" }]}
        >
          <Input placeholder="请输入接口名称" aria-label="接口名称" />
        </Form.Item>

        <Form.Item
          name="url"
          label="URL"
          rules={[{ required: true, message: "请输入URL" }]}
        >
          <Input placeholder="例如: /api/v1/users" aria-label="URL" />
        </Form.Item>

        <Form.Item
          name="method"
          label="请求方法"
          rules={[{ required: true, message: "请选择请求方法" }]}
        >
          <Select placeholder="请选择请求方法" aria-label="请求方法">
            {HTTP_METHODS.map((m) => (
              <Option key={m} value={m}>
                {m}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="请输入接口描述" aria-label="描述" />
        </Form.Item>

        <Form.List name="params">
          {(fields, { add, remove }) => (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>参数列表</div>
              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  style={{
                    border: "1px solid #f0f0f0",
                    borderRadius: 6,
                    padding: "12px 12px 0",
                    marginBottom: 12,
                    background: "#fafafa",
                  }}
                >
                  <Space
                    align="start"
                    style={{ width: "100%", flexWrap: "wrap" }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "name"]}
                      label="参数名称"
                      style={{ marginBottom: 8, minWidth: 160 }}
                      rules={[
                        { required: true, message: "请输入参数名称" },
                        {
                          validator: (_, value) => {
                            const err = getParamNameError(value);
                            return err
                              ? Promise.reject(err)
                              : Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input placeholder="参数名称" aria-label="参数名称" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      label="参数类型"
                      style={{ marginBottom: 8, minWidth: 160 }}
                      rules={[{ required: true, message: "请选择参数类型" }]}
                    >
                      <Select
                        placeholder="类型"
                        style={{ width: 160 }}
                        aria-label="参数类型"
                      >
                        {PARAM_TYPES.map((t) => (
                          <Option key={t.value} value={t.value}>
                            {t.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "position"]}
                      label="参数位置"
                      style={{ marginBottom: 8, minWidth: 120 }}
                      rules={[{ required: true, message: "请选择参数位置" }]}
                    >
                      <Select
                        placeholder="位置"
                        style={{ width: 120 }}
                        aria-label="参数位置"
                      >
                        <Option value="body">body</Option>
                        <Option value="header">header</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "required"]}
                      label="是否必填"
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Switch aria-label="是否必填" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, "description"]}
                      label="参数说明"
                      style={{ marginBottom: 8, minWidth: 200 }}
                    >
                      <Input placeholder="参数说明" aria-label="参数说明" />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                      style={{ marginTop: 30 }}
                      aria-label="删除参数"
                    />
                  </Space>
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ required: false, position: "body" })}
                icon={<PlusOutlined />}
                style={{ width: "100%" }}
                aria-label="添加参数"
              >
                添加参数
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default ApiForm;
