import request from "./request";
import type { Execution, PageResponse, ApiResponse } from "../types";

export const createExecution = async (data: {
  script_id: number;
}): Promise<Execution> => {
  const response = await request.post<ApiResponse<Execution>>(
    "/executions",
    data,
  );
  return response.data.data;
};

export const listExecutions = async (params?: {
  page?: number;
  page_size?: number;
  script_id?: number;
}): Promise<PageResponse<Execution>> => {
  const response = await request.get<ApiResponse<PageResponse<Execution>>>(
    "/executions",
    { params },
  );
  return response.data.data;
};

export const getExecutionById = async (id: number): Promise<Execution> => {
  const response = await request.get<ApiResponse<Execution>>(
    `/executions/${id}`,
  );
  return response.data.data;
};
