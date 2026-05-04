import { create } from "zustand";
import type { TestAPI } from "../types";
import * as apiApi from "../api/apis";

interface APIStore {
  apis: TestAPI[];
  total: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  keyword: string;
  loadAPIs: (
    page?: number,
    pageSize?: number,
    keyword?: string,
  ) => Promise<void>;
  createAPI: (
    data: Omit<TestAPI, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateAPI: (
    id: number,
    data: Partial<Omit<TestAPI, "id" | "created_at" | "updated_at">>,
  ) => Promise<void>;
  deleteAPI: (id: number) => Promise<void>;
  importOpenAPI: (
    content: string,
    format: "json" | "yaml",
  ) => Promise<{ imported_count: number; apis: TestAPI[] }>;
  setKeyword: (keyword: string) => void;
}

export const useAPIStore = create<APIStore>((set, get) => ({
  apis: [],
  total: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  keyword: "",

  loadAPIs: async (page = 1, pageSize = 20, keyword = "") => {
    set({ loading: true, error: null, currentPage: page, pageSize, keyword });
    try {
      const response = await apiApi.listAPIs({
        page,
        page_size: pageSize,
        keyword: keyword || undefined,
      });
      set({ apis: response.items, total: response.total, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createAPI: async (data) => {
    try {
      await apiApi.createAPI(data);
      await get().loadAPIs(get().currentPage, get().pageSize, get().keyword);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateAPI: async (id, data) => {
    try {
      await apiApi.updateAPI(id, data);
      await get().loadAPIs(get().currentPage, get().pageSize, get().keyword);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteAPI: async (id) => {
    try {
      await apiApi.deleteAPI(id);
      await get().loadAPIs(get().currentPage, get().pageSize, get().keyword);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  importOpenAPI: async (content, format) => {
    try {
      const result = await apiApi.importOpenAPI(content, format);
      await get().loadAPIs(get().currentPage, get().pageSize, get().keyword);
      return result;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setKeyword: (keyword) => {
    set({ keyword });
  },
}));
