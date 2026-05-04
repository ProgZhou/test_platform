import { create } from "zustand";
import type { FolderNode } from "../types";
import * as folderApi from "../api/folders";

interface FolderStore {
  caseFolders: FolderNode[];
  scriptFolders: FolderNode[];
  loading: boolean;
  error: string | null;
  loadCaseFolders: () => Promise<void>;
  loadScriptFolders: () => Promise<void>;
  createFolder: (data: {
    name: string;
    parent_id: number | null;
    module: "case" | "script";
  }) => Promise<void>;
  renameFolder: (
    id: number,
    name: string,
    module: "case" | "script",
  ) => Promise<void>;
  deleteFolder: (id: number, module: "case" | "script") => Promise<void>;
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  caseFolders: [],
  scriptFolders: [],
  loading: false,
  error: null,

  loadCaseFolders: async () => {
    set({ loading: true, error: null });
    try {
      const folders = await folderApi.getTree("case");
      set({ caseFolders: folders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  loadScriptFolders: async () => {
    set({ loading: true, error: null });
    try {
      const folders = await folderApi.getTree("script");
      set({ scriptFolders: folders, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createFolder: async (data) => {
    try {
      await folderApi.createFolder(data);
      if (data.module === "case") {
        await get().loadCaseFolders();
      } else {
        await get().loadScriptFolders();
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  renameFolder: async (id, name, module) => {
    try {
      await folderApi.renameFolder(id, name);
      if (module === "case") {
        await get().loadCaseFolders();
      } else {
        await get().loadScriptFolders();
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteFolder: async (id, module) => {
    try {
      await folderApi.deleteFolder(id);
      if (module === "case") {
        await get().loadCaseFolders();
      } else {
        await get().loadScriptFolders();
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
