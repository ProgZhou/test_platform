import { create } from "zustand";
import type { TestCase } from "../types";
import * as caseApi from "../api/cases";

interface CaseStore {
  cases: TestCase[];
  total: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  selectedFolderId: number | undefined;
  loadCases: (
    folderId?: number,
    page?: number,
    pageSize?: number,
  ) => Promise<void>;
  createCase: (
    data: Omit<TestCase, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateCase: (
    id: number,
    data: Partial<Omit<TestCase, "id" | "created_at" | "updated_at">>,
  ) => Promise<void>;
  deleteCase: (id: number) => Promise<void>;
  importExcel: (folderId: number, file: File) => Promise<number>;
  setSelectedFolderId: (folderId: number | undefined) => void;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  total: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  selectedFolderId: undefined,

  loadCases: async (folderId, page = 1, pageSize = 20) => {
    set({ loading: true, error: null, currentPage: page, pageSize });
    try {
      const response = await caseApi.listCases({
        folder_id: folderId,
        page,
        page_size: pageSize,
      });
      set({ cases: response.items, total: response.total, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createCase: async (data) => {
    try {
      await caseApi.createCase(data);
      await get().loadCases(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateCase: async (id, data) => {
    try {
      await caseApi.updateCase(id, data);
      await get().loadCases(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteCase: async (id) => {
    try {
      await caseApi.deleteCase(id);
      await get().loadCases(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  importExcel: async (folderId, file) => {
    try {
      const result = await caseApi.importExcel(folderId, file);
      await get().loadCases(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
      return result.success_count;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setSelectedFolderId: (folderId) => {
    set({ selectedFolderId: folderId });
  },
}));
