import React, { useState } from "react";
import { Modal, Upload, Table, message, Alert } from "antd";
import type { UploadFile, UploadProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { InboxOutlined } from "@ant-design/icons";
import { useCaseStore } from "../../stores/caseStore";

const { Dragger } = Upload;

interface CaseImportProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folderId?: number;
}

interface ImportError {
  row: number;
  error: string;
}

const CaseImport: React.FC<CaseImportProps> = ({
  visible,
  onClose,
  onSuccess,
  folderId,
}) => {
  const { importExcel } = useCaseStore();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    fail: number;
    errors: ImportError[];
  } | null>(null);

  const handleClose = () => {
    setFileList([]);
    setImportResult(null);
    onClose();
  };

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning("请先选择文件");
      return;
    }

    if (!folderId) {
      message.error("文件夹ID不存在");
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) {
      message.error("文件不存在");
      return;
    }

    setImporting(true);
    try {
      const imported = await importExcel(folderId, file);
      setImportResult({
        success: imported,
        fail: 0,
        errors: [],
      });
      message.success(`成功导入 ${imported} 条用例`);

      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.message || "导入失败";

      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors as ImportError[];
        setImportResult({
          success: error.response.data.success || 0,
          fail: errors.length,
          errors: errors,
        });
      } else {
        message.error(errorMessage);
      }
    } finally {
      setImporting(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    fileList: fileList,
    accept: ".xlsx,.xls",
    beforeUpload: (file) => {
      const isExcel =
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      if (!isExcel) {
        message.error("只能上传 Excel 文件");
        return Upload.LIST_IGNORE;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("文件大小不能超过 10MB");
        return Upload.LIST_IGNORE;
      }

      setFileList([file as any]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  const errorColumns: ColumnsType<ImportError> = [
    {
      title: "行号",
      dataIndex: "row",
      key: "row",
      width: 100,
    },
    {
      title: "错误信息",
      dataIndex: "error",
      key: "error",
    },
  ];

  return (
    <Modal
      title="导入Excel"
      open={visible}
      onCancel={handleClose}
      onOk={handleImport}
      okText="导入"
      cancelText="取消"
      width={700}
      confirmLoading={importing}
      okButtonProps={{ disabled: fileList.length === 0 || importing }}
    >
      <div style={{ marginBottom: 16 }}>
        <Dragger {...uploadProps} aria-label="上传Excel文件">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
          </p>
        </Dragger>
      </div>

      {importResult && (
        <div style={{ marginTop: 16 }}>
          <Alert
            message="导入结果"
            description={
              <div>
                <p>成功导入: {importResult.success} 条</p>
                <p>导入失败: {importResult.fail} 条</p>
              </div>
            }
            type={importResult.fail > 0 ? "warning" : "success"}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {importResult.errors.length > 0 && (
            <div>
              <h4>失败详情:</h4>
              <Table
                columns={errorColumns}
                dataSource={importResult.errors}
                rowKey="row"
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CaseImport;
