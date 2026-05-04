import React, { useEffect, useState } from "react";
import { Table, Button, Input, Space, Popconfirm, message, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import FolderTree from "../../components/FolderTree/FolderTree";
import { useCaseStore } from "../../stores/caseStore";
import type { TestCase } from "../../types";
import { downloadTemplate } from "../../api/cases";
import CaseForm from "./CaseForm";
import CaseImport from "./CaseImport";

const { Search } = Input;

const CaseList: React.FC = () => {
  const {
    cases,
    total,
    currentPage,
    pageSize,
    loading,
    selectedFolderId,
    loadCases,
    deleteCase,
    setSelectedFolderId,
  } = useCaseStore();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | undefined>(
    undefined,
  );

  useEffect(() => {
    loadCases(selectedFolderId, currentPage, pageSize);
  }, [selectedFolderId]);

  const handleFolderSelect = (folderId: number | null) => {
    setSelectedFolderId(folderId ?? undefined);
  };

  const handleSearch = (_value: string) => {
    // Search functionality can be implemented here
    // For now, just load cases
    loadCases(selectedFolderId, 1, pageSize);
  };

  const handlePageChange = (page: number, newPageSize?: number) => {
    loadCases(selectedFolderId, page, newPageSize ?? pageSize);
  };

  const handleCreate = () => {
    setEditingCase(undefined);
    setFormVisible(true);
  };

  const handleEdit = (record: TestCase) => {
    setEditingCase(record);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCase(id);
      message.success("删除成功");
    } catch {
      message.error("删除失败");
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要删除的用例");
      return;
    }

    Modal.confirm({
      title: "批量删除",
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用例吗？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map((key) => deleteCase(Number(key))),
          );
          message.success("批量删除成功");
          setSelectedRowKeys([]);
        } catch {
          message.error("批量删除失败");
        }
      },
    });
  };

  const handleImport = () => {
    if (!selectedFolderId) {
      message.warning("请先选择文件夹");
      return;
    }
    setImportVisible(true);
  };

  const handleDownloadTemplate = () => {
    try {
      downloadTemplate();
      message.success("模板下载中");
    } catch {
      message.error("模板下载失败");
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    loadCases(selectedFolderId, currentPage, pageSize);
  };

  const handleImportSuccess = () => {
    setImportVisible(false);
    loadCases(selectedFolderId, currentPage, pageSize);
  };

  const columns: ColumnsType<TestCase> = [
    {
      title: "用例名称",
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
    },
    {
      title: "前置条件",
      dataIndex: "precondition",
      key: "precondition",
      width: 200,
      ellipsis: true,
    },
    {
      title: "操作步骤",
      dataIndex: "steps",
      key: "steps",
      width: 250,
      ellipsis: true,
    },
    {
      title: "预期结果",
      dataIndex: "expected_result",
      key: "expected_result",
      width: 200,
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            aria-label={`编辑用例 ${record.name}`}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用例吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`删除用例 ${record.name}`}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: "16px" }}>
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #f0f0f0",
          padding: "16px",
          overflowY: "auto",
        }}
      >
        <FolderTree module="case" onSelect={handleFolderSelect} />
      </div>

      <div
        style={{
          flex: 1,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Space style={{ marginBottom: 16 }} wrap size="middle">
          <Search
            placeholder="搜索用例"
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
            aria-label="搜索用例"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            disabled={!selectedFolderId}
          >
            新建用例
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={handleImport}
            disabled={!selectedFolderId}
          >
            导入Excel
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button danger onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={cases}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: 1000 }}
        />

        <CaseForm
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          onSuccess={handleFormSuccess}
          editingCase={editingCase}
        />

        <CaseImport
          visible={importVisible}
          onClose={() => setImportVisible(false)}
          onSuccess={handleImportSuccess}
          folderId={selectedFolderId}
        />
      </div>
    </div>
  );
};

export default CaseList;
