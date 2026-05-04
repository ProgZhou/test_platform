import { create } from "zustand";
import type { Execution } from "../types";
import * as executionApi from "../api/execution";

interface ExecutionStore {
  executions: Execution[];
  total: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  currentExecution: Execution | null;
  loadExecutions: (
    page?: number,
    pageSize?: number,
    scriptId?: number,
  ) => Promise<void>;
  loadExecutionById: (id: number) => Promise<void>;
  createExecution: (scriptId: number) => Promise<number>;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executions: [],
  total: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  currentExecution: null,

  loadExecutions: async (page = 1, pageSize = 20, scriptId) => {
    set({ loading: true, error: null, currentPage: page, pageSize });
    try {
      const response = await executionApi.listExecutions({
        page,
        page_size: pageSize,
        script_id: scriptId,
      });
      set({
        executions: response.items,
        total: response.total,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadExecutionById: async (id) => {
    set({ loading: true, error: null });
    try {
      const execution = await executionApi.getExecutionById(id);
      set({ currentExecution: execution, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createExecution: async (scriptId) => {
    try {
      const execution = await executionApi.createExecution({
        script_id: scriptId,
      });
      return execution.id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
