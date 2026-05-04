import React from "react";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

interface ConfirmModalProps {
  title: string;
  content: string;
  onConfirm: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  content,
  onConfirm,
  okText = "确认",
  cancelText = "取消",
  danger = false,
}) => {
  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    content,
    okText,
    cancelText,
    okType: danger ? "danger" : "primary",
    onOk: onConfirm,
  });

  return null;
};

export const showConfirm = (props: ConfirmModalProps) => {
  Modal.confirm({
    title: props.title,
    icon: <ExclamationCircleOutlined />,
    content: props.content,
    okText: props.okText || "确认",
    cancelText: props.cancelText || "取消",
    okType: props.danger ? "danger" : "primary",
    onOk: props.onConfirm,
  });
};

export default ConfirmModal;
