import { create } from "zustand";
import type { TestScript } from "../types";
import * as scriptApi from "../api/scripts";

interface ScriptStore {
  scripts: TestScript[];
  total: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  selectedFolderId: number | undefined;
  currentScript: TestScript | null;
  loadScripts: (
    folderId?: number,
    page?: number,
    pageSize?: number,
  ) => Promise<void>;
  loadScriptById: (id: number) => Promise<void>;
  uploadScript: (folderId: number, file: File) => Promise<void>;
  updateScript: (
    id: number,
    data: { name?: string; content?: string },
  ) => Promise<void>;
  deleteScript: (id: number) => Promise<void>;
  runScript: (id: number) => Promise<number>;
  setSelectedFolderId: (folderId: number | undefined) => void;
}

export const useScriptStore = create<ScriptStore>((set, get) => ({
  scripts: [],
  total: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  selectedFolderId: undefined,
  currentScript: null,

  loadScripts: async (folderId, page = 1, pageSize = 20) => {
    set({ loading: true, error: null, currentPage: page, pageSize });
    try {
      const response = await scriptApi.listScripts({
        folder_id: folderId,
        page,
        page_size: pageSize,
      });
      set({ scripts: response.items, total: response.total, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadScriptById: async (id) => {
    set({ loading: true, error: null });
    try {
      const script = await scriptApi.getScriptById(id);
      set({ currentScript: script, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  uploadScript: async (folderId, file) => {
    try {
      const language = file.name.endsWith('.go') ? 'go' : 'python';
      await scriptApi.uploadScript(folderId, file, language);
      await get().loadScripts(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateScript: async (id, data) => {
    try {
      const updated = await scriptApi.updateScript(id, { content: data.content || '' });
      set({ currentScript: updated });
      await get().loadScripts(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteScript: async (id) => {
    try {
      await scriptApi.deleteScript(id);
      await get().loadScripts(
        get().selectedFolderId,
        get().currentPage,
        get().pageSize,
      );
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  runScript: async (id) => {
    try {
      const result = await scriptApi.runScript(id);
      return result.execution_id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setSelectedFolderId: (folderId) => {
    set({ selectedFolderId: folderId });
  },
}));
