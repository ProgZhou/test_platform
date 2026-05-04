import React, { useEffect } from "react";
import { Modal, Form, Input, message } from "antd";
import { useCaseStore } from "../../stores/caseStore";
import type { TestCase } from "../../types";

const { TextArea } = Input;

interface CaseFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCase?: TestCase;
}

const CaseForm: React.FC<CaseFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editingCase,
}) => {
  const [form] = Form.useForm();
  const { createCase, updateCase, selectedFolderId } = useCaseStore();
  const isEdit = !!editingCase;

  useEffect(() => {
    if (visible) {
      if (editingCase) {
        form.setFieldsValue({
          name: editingCase.name,
          precondition: editingCase.precondition,
          steps: editingCase.steps,
          expected_result: editingCase.expected_result,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingCase, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (isEdit && editingCase) {
        await updateCase(editingCase.id, values);
        message.success("用例更新成功");
      } else {
        if (!selectedFolderId) {
          message.error("请先选择文件夹");
          return;
        }
        await createCase({ ...values, folder_id: selectedFolderId });
        message.success("用例创建成功");
      }

      onSuccess();
    } catch (error) {
      if ((error as any)?.errorFields) {
        // form validation error, do nothing
        return;
      }
      message.error(isEdit ? "更新失败" : "创建失败");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? "编辑用例" : "新建用例"}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={isEdit ? "保存" : "创建"}
      cancelText="取消"
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        aria-label={isEdit ? "编辑用例表单" : "新建用例表单"}
      >
        <Form.Item
          name="name"
          label="用例名称"
          rules={[{ required: true, message: "请输入用例名称" }]}
        >
          <Input
            placeholder="请输入用例名称"
            maxLength={200}
            aria-label="用例名称"
          />
        </Form.Item>

        <Form.Item name="precondition" label="前置条件">
          <TextArea
            placeholder="请输入前置条件"
            rows={3}
            maxLength={1000}
            showCount
            aria-label="前置条件"
          />
        </Form.Item>

        <Form.Item name="steps" label="操作步骤">
          <TextArea
            placeholder="请输入操作步骤"
            rows={5}
            maxLength={2000}
            showCount
            aria-label="操作步骤"
          />
        </Form.Item>

        <Form.Item name="expected_result" label="预期结果">
          <TextArea
            placeholder="请输入预期结果"
            rows={4}
            maxLength={2000}
            showCount
            aria-label="预期结果"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CaseForm;
