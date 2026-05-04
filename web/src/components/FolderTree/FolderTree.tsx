import React, { useEffect, useState } from "react";
import { Tree, Input, Modal, message, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { useFolderStore } from "../../stores/folderStore";
import type { FolderNode } from "../../types";

const { DirectoryTree } = Tree;

interface FolderTreeProps {
  module: "case" | "script";
  onSelect: (folderId: number | null) => void;
}

const convertToTreeData = (nodes: FolderNode[]): DataNode[] => {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    children: node.children ? convertToTreeData(node.children) : [],
    isLeaf: !node.children || node.children.length === 0,
  }));
};

const FolderTree: React.FC<FolderTreeProps> = ({ module, onSelect }) => {
  const {
    caseFolders,
    scriptFolders,
    loading,
    loadCaseFolders,
    loadScriptFolders,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useFolderStore();
  const [contextMenuNode, setContextMenuNode] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);

  const folders = module === "case" ? caseFolders : scriptFolders;
  const loadFolders = module === "case" ? loadCaseFolders : loadScriptFolders;

  useEffect(() => {
    loadFolders();
  }, [module]);

  const treeData = convertToTreeData(folders);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      onSelect(Number(selectedKeys[0]));
    } else {
      onSelect(null);
    }
  };

  const handleRightClick = ({
    event,
    node,
  }: {
    event: React.MouseEvent;
    node: any;
  }) => {
    event.preventDefault();
    setContextMenuNode({ id: Number(node.key), name: String(node.title) });
  };

  const handleCreate = () => {
    setParentId(contextMenuNode?.id ?? null);
    setInputValue("");
    setCreateModalVisible(true);
  };

  const handleRename = () => {
    setInputValue(contextMenuNode?.name ?? "");
    setRenameModalVisible(true);
  };

  const handleDelete = () => {
    if (!contextMenuNode) return;
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除文件夹 "${contextMenuNode.name}" 吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteFolder(contextMenuNode.id, module);
          message.success("删除成功");
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const contextMenuItems: MenuProps["items"] = [
    {
      key: "create",
      label: "新建子文件夹",
      icon: <PlusOutlined />,
      onClick: handleCreate,
    },
    {
      key: "rename",
      label: "重命名",
      icon: <EditOutlined />,
      onClick: handleRename,
    },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  const handleCreateConfirm = async () => {
    if (!inputValue.trim()) {
      message.error("文件夹名称不能为空");
      return;
    }
    try {
      await createFolder({
        name: inputValue.trim(),
        parent_id: parentId,
        module,
      });
      message.success("创建成功");
      setCreateModalVisible(false);
    } catch {
      message.error("创建失败");
    }
  };

  const handleRenameConfirm = async () => {
    if (!inputValue.trim() || !contextMenuNode) return;
    try {
      await renameFolder(contextMenuNode.id, inputValue.trim(), module);
      message.success("重命名成功");
      setRenameModalVisible(false);
    } catch {
      message.error("重命名失败");
    }
  };

  return (
    <div>
      {loading ? <div>Loading...</div> : null}
      <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
        <div>
          <DirectoryTree
            treeData={treeData}
            onSelect={handleSelect}
            onRightClick={handleRightClick}
            icon={({ expanded }) =>
              expanded ? <FolderOpenOutlined /> : <FolderOutlined />
            }
            aria-label={`${module === "case" ? "用例" : "脚本"}文件夹树`}
          />
        </div>
      </Dropdown>

      <Modal
        title="新建文件夹"
        open={createModalVisible}
        onOk={handleCreateConfirm}
        onCancel={() => setCreateModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入文件夹名称"
          onPressEnter={handleCreateConfirm}
          aria-label="文件夹名称"
        />
      </Modal>

      <Modal
        title="重命名文件夹"
        open={renameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={() => setRenameModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入新名称"
          onPressEnter={handleRenameConfirm}
          aria-label="新文件夹名称"
        />
      </Modal>
    </div>
  );
};

export default FolderTree;
