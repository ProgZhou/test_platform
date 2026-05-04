import request from "./request";
import type { Report, PageResponse, ApiResponse } from "../types";

export const listReports = async (params?: {
  page?: number;
  page_size?: number;
  execution_id?: number;
}): Promise<PageResponse<Report>> => {
  const response = await request.get<ApiResponse<PageResponse<Report>>>(
    "/reports",
    { params },
  );
  return response.data.data;
};

export const getReportById = async (id: number): Promise<Report> => {
  const response = await request.get<ApiResponse<Report>>(`/reports/${id}`);
  return response.data.data;
};

export const downloadReport = (id: number): void => {
  window.open(`/api/v1/reports/${id}/download`, "_blank");
};
