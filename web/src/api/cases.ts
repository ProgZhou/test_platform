import request from "./request";
import type { TestCase, PageResponse, ApiResponse } from "../types";

export const listCases = async (params: {
  folder_id?: number;
  page?: number;
  page_size?: number;
}): Promise<PageResponse<TestCase>> => {
  const response = await request.get<ApiResponse<PageResponse<TestCase>>>(
    "/cases",
    { params },
  );
  return response.data.data;
};

export const createCase = async (
  data: Omit<TestCase, "id" | "created_at" | "updated_at">,
): Promise<TestCase> => {
  const response = await request.post<ApiResponse<TestCase>>("/cases", data);
  return response.data.data;
};

export const updateCase = async (
  id: number,
  data: Partial<Omit<TestCase, "id" | "created_at" | "updated_at">>,
): Promise<TestCase> => {
  const response = await request.put<ApiResponse<TestCase>>(
    `/cases/${id}`,
    data,
  );
  return response.data.data;
};

export const deleteCase = async (id: number): Promise<void> => {
  await request.delete(`/cases/${id}`);
};

export const importExcel = async (
  folderId: number,
  file: File,
): Promise<{ success_count: number; failed_count: number; errors: Array<{row: number; message: string}> }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_id", String(folderId));
  const response = await request.post<ApiResponse<{ success_count: number; failed_count: number; errors: Array<{row: number; message: string}> }>>(
    "/cases/import",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data.data;
};

export const downloadTemplate = (): void => {
  window.open("/api/v1/cases/template", "_blank");
};
