import { useState, useEffect } from 'react';
import { eq } from 'drizzle-orm';
import { useDrizzleDb } from './use-drizzle';
import * as schema from '~/db/schema';

export interface RecordingSettings {
  whisper: {
    enableRealtime: boolean;
    language: string;
    maxThreads: number;
    realtimeAudioSec: number;
    realtimeAudioSliceSec: number;
    useVad: boolean;
    vadThold: number;
    temperature: number;
    beamSize: number;
    translate: boolean;
    tokenTimestamps: boolean;
  };
  llama: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
}

const defaultSettings: RecordingSettings = {
  whisper: {
    enableRealtime: true,
    language: 'auto',
    maxThreads: 4,
    realtimeAudioSec: 300,
    realtimeAudioSliceSec: 10,
    useVad: true,
    vadThold: 0.6,
    temperature: 0.0,
    beamSize: 5,
    translate: false,
    tokenTimestamps: false,
  },
  llama: {
    modelName: 'llama-3.2-3b',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant.',
  },
};

export const useRecordingSettings = () => {
  const drizzleDb = useDrizzleDb();
  const [settings, setSettings] = useState<RecordingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const appSettings = await drizzleDb.query.appSettings.findFirst({
        where: eq(schema.appSettings.id, 1),
      });

      if (appSettings?.preferences && typeof appSettings.preferences === 'string') {
        const prefs = JSON.parse(appSettings.preferences);
        if (prefs.recording) {
          setSettings({ ...defaultSettings, ...prefs.recording });
        }
      }
    } catch (error) {
      console.error('Error loading recording settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: RecordingSettings) => {
    try {
      // Get current app settings
      const currentSettings = await drizzleDb.query.appSettings.findFirst({
        where: eq(schema.appSettings.id, 1),
      });

      let currentPrefs: any = {};
      if (currentSettings?.preferences && typeof currentSettings.preferences === 'string') {
        currentPrefs = JSON.parse(currentSettings.preferences);
      }

      // Update recording preferences
      const newPrefs = {
        ...currentPrefs,
        recording: newSettings,
      };

      console.log('newPrefs', newPrefs);

      // Save to database
      await drizzleDb
        .update(schema.appSettings)
        .set({
          preferences: JSON.stringify(newPrefs),
          updatedAt: new Date(),
        })
        .where(eq(schema.appSettings.id, 1));

      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating recording settings:', error);
      throw error;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refreshSettings: loadSettings,
  };
};
