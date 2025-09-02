import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initWhisper, WhisperContext } from 'whisper.rn';
import { create } from 'zustand';

// Define model information
export const WHISPER_MODELS = {
  tiny: {
    name: 'Tiny (English)',
    filename: 'ggml-tiny.en.bin',
    size: 75, // Size in MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    languages: ['English'],
    description: 'Fast but less accurate. Good for short commands and phrases.',
  },
  base: {
    name: 'Base (English)',
    filename: 'ggml-base.en.bin',
    size: 142, // Size in MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    languages: ['English'],
    description: 'Better accuracy than tiny, still relatively fast.',
  },
  medium: {
    name: 'Medium (Multilingual)',
    filename: 'ggml-medium.bin',
    size: 1500, // Size in MB
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    languages: ['Multiple languages including Arabic, Yoruba, etc.'],
    description: 'High accuracy with multiple language support.',
  },
};

export type ModelKey = keyof typeof WHISPER_MODELS;

// Model download and management states
export interface ModelDownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
  resumable: boolean;
  downloadTask: FileSystem.DownloadResumable | null;
}

export interface ModelState {
  installedModels: Record<string, { path: string; installedAt: number }>;
  currentModel: ModelKey | null;
  downloads: Record<ModelKey, ModelDownloadState>;

  // Actions
  initializeStore: () => Promise<void>;
  downloadModel: (modelKey: ModelKey, bypassNetworkCheck?: boolean) => Promise<void>;
  pauseDownload: (modelKey: ModelKey) => Promise<void>;
  resumeDownload: (modelKey: ModelKey) => Promise<void>;
  cancelDownload: (modelKey: ModelKey) => Promise<void>;
  deleteModel: (modelKey: ModelKey) => Promise<void>;
  setCurrentModel: (modelKey: ModelKey) => void;
}

// Create Zustand store for model state
export const useModelStore = create<ModelState>((set, get) => ({
  installedModels: {},
  currentModel: null,
  downloads: Object.keys(WHISPER_MODELS).reduce(
    (acc, key) => {
      acc[key as ModelKey] = {
        isDownloading: false,
        progress: 0,
        error: null,
        resumable: false,
        downloadTask: null,
      };
      return acc;
    },
    {} as Record<ModelKey, ModelDownloadState>
  ),

  initializeStore: async () => {
    try {
      // Create models directory if it doesn't exist
      const modelsDir = `${FileSystem.documentDirectory}models`;
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelsDir);
      }

      // Read persisted data about installed models
      const persistedData = await FileSystem.readAsStringAsync(
        `${FileSystem.documentDirectory}models_metadata.json`
      ).catch(() => '{}');

      const parsed = JSON.parse(persistedData);
      const installedModels =
        (parsed.installedModels as Record<string, { path: string; installedAt: number }>) || {};
      const currentModel = (parsed.currentModel as ModelKey | null) || null;

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
      console.error('Failed to initialize model store:', error);
      // Reset to defaults on error
      set({
        installedModels: {},
        currentModel: null,
      });
    }
  },

  downloadModel: async (modelKey: ModelKey, bypassNetworkCheck = false) => {
    try {
      console.log(`[WhisperModel] Starting download for ${modelKey} model`);
      const { downloads } = get();

      // Check if download is already in progress
      if (downloads[modelKey]?.isDownloading) {
        console.log(`[WhisperModel] Download already in progress for ${modelKey}`);
        return;
      }

      // Check if we're connected to internet
      const networkState = await Network.getNetworkStateAsync();
      console.log(`[WhisperModel] Network state:`, networkState);

      if (!networkState.isInternetReachable) {
        console.log(`[WhisperModel] No internet connection available`);
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
        if (WHISPER_MODELS[modelKey].size > 100) {
          console.log(
            `[WhisperModel] Not on WiFi for large model ${modelKey}, showing warning in UI`
          );
          // This is handled in the UI with an alert dialog
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
      const modelInfo = WHISPER_MODELS[modelKey];
      const modelDir = `${FileSystem.documentDirectory}models`;
      const modelPath = `${modelDir}/${modelInfo.filename}`;

      console.log(`[WhisperModel] Setting up download for ${modelKey}`);
      console.log(`[WhisperModel] URL: ${modelInfo.url}`);
      console.log(`[WhisperModel] Target path: ${modelPath}`);

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
      console.log(`[WhisperModel] Creating download resumable for ${modelKey}`);
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
              `[WhisperModel] Download progress for ${modelKey}: ${Math.round(progress * 100)}%`
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
      console.log(`[WhisperModel] Starting download for ${modelKey}`);
      const downloadResult = await downloadResumable.downloadAsync();
      console.log(`[WhisperModel] Download result for ${modelKey}:`, downloadResult);

      if (downloadResult?.uri) {
        console.log(`[WhisperModel] Download complete for ${modelKey}`);
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
          `${FileSystem.documentDirectory}models_metadata.json`,
          JSON.stringify({
            installedModels,
            currentModel: get().currentModel || modelKey,
          })
        );
        console.log(`[WhisperModel] Saved metadata for ${modelKey}`);

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
        console.log(`[WhisperModel] Updated state for completed ${modelKey} download`);
      }
    } catch (error: any) {
      console.error(`[WhisperModel] Failed to download model ${modelKey}:`, error);
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

  pauseDownload: async (modelKey: ModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[WhisperModel] Pausing download for ${modelKey}`);
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
        console.log(`[WhisperModel] Successfully paused download for ${modelKey}`);
      } catch (error) {
        console.error(`[WhisperModel] Failed to pause download for ${modelKey}:`, error);
      }
    }
  },

  resumeDownload: async (modelKey: ModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[WhisperModel] Resuming download for ${modelKey}`);
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
        console.log(`[WhisperModel] Resume result for ${modelKey}:`, resumedDownload);

        if (resumedDownload?.uri) {
          console.log(`[WhisperModel] Download completed after resume for ${modelKey}`);
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
            `${FileSystem.documentDirectory}models_metadata.json`,
            JSON.stringify({
              installedModels,
              currentModel: get().currentModel || modelKey,
            })
          );
          console.log(`[WhisperModel] Saved metadata after resume for ${modelKey}`);

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
            `[WhisperModel] Updated state after resumed download completed for ${modelKey}`
          );
        }
      } catch (error: any) {
        console.error(`[WhisperModel] Failed to resume download for ${modelKey}:`, error);
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

  cancelDownload: async (modelKey: ModelKey) => {
    const { downloads } = get();
    const downloadTask = downloads[modelKey]?.downloadTask;

    if (downloadTask) {
      try {
        console.log(`[WhisperModel] Cancelling download for ${modelKey}`);
        // Cancel download
        await downloadTask.cancelAsync();

        // Try to clean up partial download
        const modelInfo = WHISPER_MODELS[modelKey];
        const modelPath = `${FileSystem.documentDirectory}models/${modelInfo.filename}`;
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        console.log(`[WhisperModel] Cleaned up partial download file for ${modelKey}`);

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
        console.log(`[WhisperModel] Download cancelled for ${modelKey}`);
      } catch (error) {
        console.error(`[WhisperModel] Failed to cancel download for ${modelKey}:`, error);
      }
    }
  },

  deleteModel: async (modelKey: ModelKey) => {
    try {
      console.log(`[WhisperModel] Deleting model ${modelKey}`);
      const { installedModels, currentModel } = get();
      const modelData = installedModels[modelKey];

      if (modelData) {
        // Delete model file
        await FileSystem.deleteAsync(modelData.path, { idempotent: true });
        console.log(`[WhisperModel] Deleted model file for ${modelKey}`);

        // Update state
        const updatedModels = { ...installedModels };
        delete updatedModels[modelKey];

        // Update current model if needed
        let newCurrentModel = currentModel;
        if (currentModel === modelKey) {
          // Find another model to use, or set to null
          newCurrentModel = (Object.keys(updatedModels)[0] as ModelKey) || null;
          console.log(
            `[WhisperModel] Current model was deleted, switching to ${newCurrentModel || 'none'}`
          );
        }

        // Save metadata
        await FileSystem.writeAsStringAsync(
          `${FileSystem.documentDirectory}models_metadata.json`,
          JSON.stringify({
            installedModels: updatedModels,
            currentModel: newCurrentModel,
          })
        );
        console.log(`[WhisperModel] Updated metadata after deleting ${modelKey}`);

        set({
          installedModels: updatedModels,
          currentModel: newCurrentModel,
        });
      }
    } catch (error) {
      console.error(`[WhisperModel] Failed to delete model ${modelKey}:`, error);
    }
  },

  setCurrentModel: (modelKey: ModelKey) => {
    const { installedModels } = get();

    if (installedModels[modelKey]) {
      console.log(`[WhisperModel] Setting current model to ${modelKey}`);
      set({ currentModel: modelKey });

      // Persist current model choice
      FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}models_metadata.json`,
        JSON.stringify({
          installedModels: get().installedModels,
          currentModel: modelKey,
        })
      ).catch((error) => {
        console.error('[WhisperModel] Failed to persist current model choice:', error);
      });
    }
  },
}));

// Hook to initialize Whisper with the current model
export function useWhisperModel() {
  const { installedModels, currentModel } = useModelStore();
  const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('[WhisperModel] useEffect triggered. Current model:', currentModel);

    async function loadModel() {
      if (!currentModel) {
        console.log('[WhisperModel] No current model selected. Aborting load.');
        return;
      }

      const modelData = installedModels[currentModel];
      if (!modelData) {
        console.log('[WhisperModel] Model data not found for', currentModel, '. Aborting load.');
        return;
      }

      console.log(`[WhisperModel] Preparing to load model: ${currentModel}`);
      setIsLoading(true);
      setError(null);

      try {
        const filePath =
          Platform.OS === 'ios' ? modelData.path.replace('file://', '') : modelData.path;

        console.log(`[WhisperModel] Initializing Whisper with model path: ${filePath}`);
        console.time(`[WhisperModel] ${currentModel} initialization`);

        const context = await initWhisper({ filePath });

        console.timeEnd(`[WhisperModel] ${currentModel} initialization`);

        if (isMounted) {
          console.log(
            `[WhisperModel] Successfully loaded model ${currentModel}. Context ID:`,
            context.id
          );
          setWhisperContext(context);
          setIsLoading(false);
        } else {
          console.log(
            '[WhisperModel] Component unmounted after model load, releasing new context.'
          );
          context.release();
        }
      } catch (err: any) {
        console.error('[WhisperModel] Failed to initialize Whisper model:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load speech recognition model');
          setIsLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
      console.log('[WhisperModel] useEffect cleanup. Releasing context if it exists.');
      if (whisperContext) {
        console.log(`[WhisperModel] Releasing context ID: ${whisperContext.id}`);
        whisperContext.release().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModel, JSON.stringify(installedModels)]);

  return {
    whisperContext,
    isLoading,
    error,
    modelKey: currentModel,
    modelInfo: currentModel ? WHISPER_MODELS[currentModel] : null,
  };
}
