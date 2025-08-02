import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initLlama, LlamaContext } from 'llama.rn';
import { create } from 'zustand';

// Define Llama model information - lightweight models suitable for mobile
export const LLAMA_MODELS = {
  'llama-3.2-1b': {
    name: 'Llama 3.2 1B (Instruct)',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    size: 700, // Size in MB
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    description:
      'Lightweight Llama model for text generation and analysis. Perfect for naming and summarization.',
    contextSize: 8192,
  },
  'qwen2.5-0.5b': {
    name: 'Qwen2.5 0.5B (Instruct)',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: 400, // Size in MB
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    description: 'Ultra-lightweight model for quick AI tasks. Fast and efficient for mobile use.',
    contextSize: 32768,
  },
} as const;

export type LlamaModelKey = keyof typeof LLAMA_MODELS;

// Model download and management states
export interface LlamaModelDownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
  resumable: boolean;
  downloadTask: FileSystem.DownloadResumable | null;
}

export interface LlamaModelState {
  installedModels: Record<string, { path: string; installedAt: number }>;
  currentModel: LlamaModelKey | null;
  downloads: Record<LlamaModelKey, LlamaModelDownloadState>;

  // Actions
  initializeStore: () => Promise<void>;
  downloadModel: (modelKey: LlamaModelKey, bypassNetworkCheck?: boolean) => Promise<void>;
  pauseDownload: (modelKey: LlamaModelKey) => Promise<void>;
  resumeDownload: (modelKey: LlamaModelKey) => Promise<void>;
  cancelDownload: (modelKey: LlamaModelKey) => Promise<void>;
  deleteModel: (modelKey: LlamaModelKey) => Promise<void>;
  setCurrentModel: (modelKey: LlamaModelKey) => void;
}

// Create Zustand store for Llama model state
export const useLlamaModelStore = create<LlamaModelState>((set, get) => ({
  installedModels: {},
  currentModel: null,
  downloads: Object.keys(LLAMA_MODELS).reduce(
    (acc, key) => {
      acc[key as LlamaModelKey] = {
        isDownloading: false,
        progress: 0,
        error: null,
        resumable: false,
        downloadTask: null,
      };
      return acc;
    },
    {} as Record<LlamaModelKey, LlamaModelDownloadState>
  ),

  initializeStore: async () => {
    try {
      // Create llama models directory if it doesn't exist
      const modelsDir = `${FileSystem.documentDirectory}llama_models`;
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelsDir);
      }

      // Read persisted data about installed models
      const persistedData = await FileSystem.readAsStringAsync(
        `${FileSystem.documentDirectory}llama_models_metadata.json`
      ).catch(() => '{}');

      const parsed = JSON.parse(persistedData);
      const installedModels =
        (parsed.installedModels as Record<string, { path: string; installedAt: number }>) || {};
      const currentModel = (parsed.currentModel as LlamaModelKey | null) || null;

      // Verify that all models actually exist
      const verified: Record<string, { path: string; installedAt: number }> = {};
      for (const [key, data] of Object.entries(installedModels)) {
        const modelInfo = await FileSystem.getInfoAsync(data.path);
        if (modelInfo.exists) {
          verified[key] = data;
        }
      }

      set({
        installedModels: verified,
        currentModel: verified[currentModel as string] ? currentModel : null,
      });
    } catch (error) {
      console.error('Failed to initialize Llama model store:', error);
      // Reset to defaults on error
      set({
        installedModels: {},
        currentModel: null,
      });
    }
  },

  downloadModel: async (modelKey: LlamaModelKey, bypassNetworkCheck = false) => {
    try {
      console.log(`[LlamaModel] Starting download for ${modelKey} model`);
      const { downloads } = get();

      // Check if download is already in progress
      if (downloads[modelKey]?.isDownloading) {
        console.log(`[LlamaModel] Download already in progress for ${modelKey}`);
        return;
      }

      // Check if we're connected to internet
      const networkState = await Network.getNetworkStateAsync();
      console.log(`[LlamaModel] Network state:`, networkState);

      if (!networkState.isInternetReachable) {
        console.log(`[LlamaModel] No internet connection available`);
        set((state) => ({
          downloads: {
            ...state.downloads,
            [modelKey]: {
              ...state.downloads[modelKey],
              error: 'No internet connection available',
            },
          },
        }));
        return;
      }

      // Warn if not on WiFi for large models
      if (
        !bypassNetworkCheck &&
        (!networkState.isConnected || networkState.type !== Network.NetworkStateType.WIFI)
      ) {
        if (LLAMA_MODELS[modelKey].size > 300) {
          console.log(
            `[LlamaModel] Not on WiFi for large model ${modelKey}, showing warning in UI`
          );
          set((state) => ({
            downloads: {
              ...state.downloads,
              [modelKey]: {
                ...state.downloads[modelKey],
                error: 'not-wifi',
              },
            },
          }));
          return;
        }
      }

      // Set up download
      const modelInfo = LLAMA_MODELS[modelKey];
      const modelDir = `${FileSystem.documentDirectory}llama_models`;
      const modelPath = `${modelDir}/${modelInfo.filename}`;

      console.log(`[LlamaModel] Setting up download for ${modelKey}`);
      console.log(`[LlamaModel] URL: ${modelInfo.url}`);
      console.log(`[LlamaModel] Target path: ${modelPath}`);

      // Start download
      set((state) => ({
        downloads: {
          ...state.downloads,
          [modelKey]: {
            ...state.downloads[modelKey],
            isDownloading: true,
            progress: 0,
            error: null,
          },
        },
      }));

      // Create downloadResumable
      console.log(`[LlamaModel] Creating download resumable for ${modelKey}`);
      const downloadResumable = FileSystem.createDownloadResumable(
        modelInfo.url,
        modelPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;

          // Log progress every 10%
          if (Math.floor(progress * 10) > Math.floor(get().downloads[modelKey].progress * 10)) {
            console.log(
              `[LlamaModel] Download progress for ${modelKey}: ${Math.round(progress * 100)}%`
            );
          }

          set((state) => ({
            downloads: {
              ...state.downloads,
              [modelKey]: {
                ...state.downloads[modelKey],
                progress,
              },
            },
          }));
        }
      );

      // Store the download task
      set((state) => ({
        downloads: {
          ...state.downloads,
          [modelKey]: {
            ...state.downloads[modelKey],
            downloadTask: downloadResumable,
            resumable: true,
          },
        },
      }));

      // Begin download
      console.log(`[LlamaModel] Starting download for ${modelKey}`);
      const downloadResult = await downloadResumable.downloadAsync();
      console.log(`[LlamaModel] Download result for ${modelKey}:`, downloadResult);

      if (downloadResult?.uri) {
        console.log(`[LlamaModel] Download complete for ${modelKey}`);
        // Update installed models
        const installedModels = {
          ...get().installedModels,
          [modelKey]: {
            path: downloadResult.uri,
            installedAt: Date.now(),
          },
        };

        // Save metadata
        await FileSystem.writeAsStringAsync(
          `${FileSystem.documentDirectory}llama_models_metadata.json`,
          JSON.stringify({
            installedModels,
            currentModel: get().currentModel || modelKey,
          })
        );
        console.log(`[LlamaModel] Saved metadata for ${modelKey}`);

        // Update state
        set((state) => ({
          installedModels,
          currentModel: state.currentModel || modelKey,
          downloads: {
            ...state.downloads,
            [modelKey]: {
              isDownloading: false,
              progress: 1,
              error: null,
              resumable: false,
              downloadTask: null,
            },
          },
        }));
        console.log(`[LlamaModel] Updated state for completed ${modelKey} download`);
      }
    } catch (error: any) {
      console.error(`[LlamaModel] Failed to download model ${modelKey}:`, error);
      set((state) => ({
        downloads: {
          ...state.downloads,
          [modelKey]: {
            ...state.downloads[modelKey],
            isDownloading: false,
            error: error.message || 'Download failed',
            resumable: !!state.downloads[modelKey].downloadTask,
          },
        },
      }));
    }
  },

  pauseDownload: async (modelKey: LlamaModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[LlamaModel] Pausing download for ${modelKey}`);
        const pausedDownload = await downloadTask.pauseAsync();

        set((state) => ({
          downloads: {
            ...state.downloads,
            [modelKey]: {
              ...state.downloads[modelKey],
              isDownloading: false,
              resumable: !!pausedDownload,
              downloadTask: pausedDownload,
            },
          },
        }));
        console.log(`[LlamaModel] Successfully paused download for ${modelKey}`);
      } catch (error) {
        console.error(`[LlamaModel] Failed to pause download for ${modelKey}:`, error);
      }
    }
  },

  resumeDownload: async (modelKey: LlamaModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[LlamaModel] Resuming download for ${modelKey}`);
        set((state) => ({
          downloads: {
            ...state.downloads,
            [modelKey]: {
              ...state.downloads[modelKey],
              isDownloading: true,
              error: null,
            },
          },
        }));

        const resumedDownload = await downloadTask.resumeAsync();
        console.log(`[LlamaModel] Resume result for ${modelKey}:`, resumedDownload);

        if (resumedDownload?.uri) {
          console.log(`[LlamaModel] Download completed after resume for ${modelKey}`);
          // Update installed models
          const installedModels = {
            ...get().installedModels,
            [modelKey]: {
              path: resumedDownload.uri,
              installedAt: Date.now(),
            },
          };

          // Save metadata
          await FileSystem.writeAsStringAsync(
            `${FileSystem.documentDirectory}llama_models_metadata.json`,
            JSON.stringify({
              installedModels,
              currentModel: get().currentModel || modelKey,
            })
          );
          console.log(`[LlamaModel] Saved metadata after resume for ${modelKey}`);

          set((state) => ({
            installedModels,
            currentModel: state.currentModel || modelKey,
            downloads: {
              ...state.downloads,
              [modelKey]: {
                isDownloading: false,
                progress: 1,
                error: null,
                resumable: false,
                downloadTask: null,
              },
            },
          }));
          console.log(
            `[LlamaModel] Updated state after resumed download completed for ${modelKey}`
          );
        }
      } catch (error: any) {
        console.error(`[LlamaModel] Failed to resume download for ${modelKey}:`, error);
        set((state) => ({
          downloads: {
            ...state.downloads,
            [modelKey]: {
              ...state.downloads[modelKey],
              isDownloading: false,
              error: error.message || 'Resume failed',
            },
          },
        }));
      }
    }
  },

  cancelDownload: async (modelKey: LlamaModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[LlamaModel] Cancelling download for ${modelKey}`);
        // Cancel download
        await downloadTask.cancelAsync();

        // Try to clean up partial download
        const modelInfo = LLAMA_MODELS[modelKey];
        const modelPath = `${FileSystem.documentDirectory}llama_models/${modelInfo.filename}`;
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        console.log(`[LlamaModel] Cleaned up partial download file for ${modelKey}`);

        set((state) => ({
          downloads: {
            ...state.downloads,
            [modelKey]: {
              isDownloading: false,
              progress: 0,
              error: null,
              resumable: false,
              downloadTask: null,
            },
          },
        }));
        console.log(`[LlamaModel] Download cancelled for ${modelKey}`);
      } catch (error) {
        console.error(`[LlamaModel] Failed to cancel download for ${modelKey}:`, error);
      }
    }
  },

  deleteModel: async (modelKey: LlamaModelKey) => {
    try {
      console.log(`[LlamaModel] Deleting model ${modelKey}`);
      const { installedModels, currentModel } = get();
      const modelData = installedModels[modelKey];

      if (modelData) {
        // Delete model file
        await FileSystem.deleteAsync(modelData.path, { idempotent: true });
        console.log(`[LlamaModel] Deleted model file for ${modelKey}`);

        // Update state
        const updatedModels = { ...installedModels };
        delete updatedModels[modelKey];

        // Update current model if needed
        let newCurrentModel = currentModel;
        if (currentModel === modelKey) {
          // Find another model to use, or set to null
          newCurrentModel = (Object.keys(updatedModels)[0] as LlamaModelKey) || null;
          console.log(
            `[LlamaModel] Current model was deleted, switching to ${newCurrentModel || 'none'}`
          );
        }

        // Save metadata
        await FileSystem.writeAsStringAsync(
          `${FileSystem.documentDirectory}llama_models_metadata.json`,
          JSON.stringify({
            installedModels: updatedModels,
            currentModel: newCurrentModel,
          })
        );
        console.log(`[LlamaModel] Updated metadata after deleting ${modelKey}`);

        set({
          installedModels: updatedModels,
          currentModel: newCurrentModel,
        });
      }
    } catch (error) {
      console.error(`[LlamaModel] Failed to delete model ${modelKey}:`, error);
    }
  },

  setCurrentModel: (modelKey: LlamaModelKey) => {
    const { installedModels } = get();

    if (installedModels[modelKey]) {
      console.log(`[LlamaModel] Setting current model to ${modelKey}`);
      set({ currentModel: modelKey });

      // Persist current model choice
      FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}llama_models_metadata.json`,
        JSON.stringify({
          installedModels: get().installedModels,
          currentModel: modelKey,
        })
      ).catch((error) => {
        console.error('[LlamaModel] Failed to persist current model choice:', error);
      });
    }
  },
}));

// Hook to initialize Llama with the current model
export function useLlamaModel() {
  const { installedModels, currentModel } = useLlamaModelStore();
  const [llamaContext, setLlamaContext] = useState<LlamaContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      if (!currentModel) return;

      const modelData = installedModels[currentModel];
      if (!modelData) return;

      setIsLoading(true);
      setError(null);
      console.log(`[LlamaModel] Loading model ${currentModel}`);

      try {
        // Release previous context if any
        if (llamaContext) {
          await llamaContext.release();
          console.log(`[LlamaModel] Released previous llama context`);
        }

        // Initialize with the selected model
        const filePath =
          Platform.OS === 'ios' ? modelData.path.replace('file://', '') : modelData.path;

        console.log(`[LlamaModel] Initializing llama with model path: ${filePath}`);

        const modelInfo = LLAMA_MODELS[currentModel];
        const context = await initLlama({
          model: filePath,
          n_ctx: Math.min(modelInfo.contextSize, 4096), // Limit context for mobile
          n_threads: 4, // Optimize for mobile
          use_mlock: false,
          use_mmap: true,
        });

        if (isMounted) {
          setLlamaContext(context);
          setIsLoading(false);
          console.log(`[LlamaModel] Successfully loaded model ${currentModel}`);
        }
      } catch (err: any) {
        console.error('[LlamaModel] Failed to initialize Llama model:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load AI model');
          setIsLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
      if (llamaContext) {
        llamaContext.release().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModel, installedModels]);

  return {
    llamaContext,
    isLoading,
    error,
    modelKey: currentModel,
    modelInfo: currentModel ? LLAMA_MODELS[currentModel] : null,
  };
}
