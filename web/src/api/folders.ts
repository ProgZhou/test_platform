import request from "./request";
import type { FolderNode, ApiResponse } from "../types";

export const getTree = async (
  module: "case" | "script",
): Promise<FolderNode[]> => {
  const response = await request.get<ApiResponse<FolderNode[]>>(
    `/folders/tree`,
    {
      params: { module },
    },
  );
  return response.data.data;
};

export const createFolder = async (data: {
  name: string;
  parent_id: number | null;
  module: "case" | "script";
}): Promise<FolderNode> => {
  const response = await request.post<ApiResponse<FolderNode>>(
    "/folders",
    data,
  );
  return response.data.data;
};

export const renameFolder = async (
  id: number,
  name: string,
): Promise<FolderNode> => {
  const response = await request.put<ApiResponse<FolderNode>>(
    `/folders/${id}`,
    { name },
  );
  return response.data.data;
};

export const deleteFolder = async (id: number): Promise<void> => {
  await request.delete(`/folders/${id}`);
};
