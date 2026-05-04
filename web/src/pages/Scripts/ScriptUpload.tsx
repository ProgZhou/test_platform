import React, { useState, useEffect } from "react";
import { Modal, Upload, Select, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useScriptStore } from "../../stores/scriptStore";
import { useFolderStore } from "../../stores/folderStore";
import type { FolderNode } from "../../types";

const { Dragger } = Upload;
const { Option } = Select;

interface ScriptUploadProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const flattenFolders = (folders: FolderNode[]): FolderNode[] => {
  const result: FolderNode[] = [];
  const traverse = (nodes: FolderNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children) traverse(node.children);
    }
  };
  traverse(folders);
  return result;
};

const ScriptUpload: React.FC<ScriptUploadProps> = ({
  visible,
  onSuccess,
  onCancel,
}) => {
  const { uploadScript, selectedFolderId } = useScriptStore();
  const { scriptFolders, loadScriptFolders } = useFolderStore();
  const [folderId, setFolderId] = useState<number | undefined>(
    selectedFolderId,
  );
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadScriptFolders();
      setFolderId(selectedFolderId);
      setFileList([]);
    }
  }, [visible]);

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: ".go,.py",
    fileList,
    beforeUpload: (file) => {
      const isValidType =
        file.name.endsWith(".go") || file.name.endsWith(".py");
      if (!isValidType) {
        message.error("只能上传 .go 或 .py 文件");
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("文件大小不能超过 10MB");
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error("请选择文件");
      return;
    }
    if (!folderId) {
      message.error("请选择目标文件夹");
      return;
    }

    setUploading(true);
    try {
      await uploadScript(folderId, fileList[0]);
      message.success("上传成功");
      setFileList([]);
      onSuccess();
    } catch {
      message.error("上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFileList([]);
    onCancel();
  };

  const allFolders = flattenFolders(scriptFolders);

  return (
    <Modal
      title="上传脚本"
      open={visible}
      onOk={handleUpload}
      onCancel={handleCancel}
      okText="上传"
      cancelText="取消"
      confirmLoading={uploading}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>目标文件夹</div>
        <Select
          value={folderId}
          onChange={setFolderId}
          placeholder="请选择文件夹"
          style={{ width: "100%" }}
          aria-label="目标文件夹"
        >
          {allFolders.map((folder) => (
            <Option key={folder.id} value={folder.id}>
              {folder.name}
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择文件</div>
        <Dragger {...uploadProps} aria-label="上传脚本文件">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .go 和 .py 文件，单个文件不超过 10MB
          </p>
        </Dragger>
      </div>
    </Modal>
  );
};

export default ScriptUpload;
