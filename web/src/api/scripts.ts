import request from "./request";
import type { TestScript, PageResponse, ApiResponse } from "../types";

export const listScripts = async (params?: {
  folder_id?: number;
  page?: number;
  page_size?: number;
}): Promise<PageResponse<TestScript>> => {
  const response = await request.get<ApiResponse<PageResponse<TestScript>>>(
    "/scripts",
    { params },
  );
  return response.data.data;
};

export const uploadScript = async (
  folderId: number,
  file: File,
  language: 'go' | 'python',
): Promise<TestScript> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_id", String(folderId));
  formData.append("language", language);
  const response = await request.post<ApiResponse<TestScript>>(
    "/scripts/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data.data;
};

export const getScriptById = async (id: number): Promise<TestScript> => {
  const response = await request.get<ApiResponse<TestScript>>(`/scripts/${id}`);
  return response.data.data;
};

export const updateScript = async (
  id: number,
  data: { content: string },
): Promise<TestScript> => {
  const response = await request.put<ApiResponse<TestScript>>(
    `/scripts/${id}`,
    data,
  );
  return response.data.data;
};

export const deleteScript = async (id: number): Promise<void> => {
  await request.delete(`/scripts/${id}`);
};

export const runScript = async (
  id: number,
): Promise<{ execution_id: number }> => {
  const response = await request.post<ApiResponse<{ execution_id: number }>>(
    `/scripts/${id}/run`,
  );
  return response.data.data;
};
