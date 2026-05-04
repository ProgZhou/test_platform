import request from "./request";
import type { TestAPI, PageResponse, ApiResponse } from "../types";

export const listAPIs = async (params?: {
  page?: number;
  page_size?: number;
  keyword?: string;
}): Promise<PageResponse<TestAPI>> => {
  const response = await request.get<ApiResponse<PageResponse<TestAPI>>>(
    "/apis",
    { params },
  );
  return response.data.data;
};

export const createAPI = async (
  data: Omit<TestAPI, "id" | "created_at" | "updated_at">,
): Promise<TestAPI> => {
  const response = await request.post<ApiResponse<TestAPI>>("/apis", data);
  return response.data.data;
};

export const updateAPI = async (
  id: number,
  data: Partial<Omit<TestAPI, "id" | "created_at" | "updated_at">>,
): Promise<TestAPI> => {
  const response = await request.put<ApiResponse<TestAPI>>(`/apis/${id}`, data);
  return response.data.data;
};

export const deleteAPI = async (id: number): Promise<void> => {
  await request.delete(`/apis/${id}`);
};

export const importOpenAPI = async (
  content: string,
  format: 'json' | 'yaml',
): Promise<{ imported_count: number; apis: TestAPI[] }> => {
  const response = await request.post<ApiResponse<{ imported_count: number; apis: TestAPI[] }>>(
    "/apis/import",
    { content, format },
  );
  return response.data.data;
};

export const debugAPI = async (
  id: number,
  params: Record<string, any>,
): Promise<any> => {
  const response = await request.post<ApiResponse<any>>(
    `/apis/${id}/debug`,
    params,
  );
  return response.data.data;
};
