import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Switch, Alert, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { eq } from 'drizzle-orm';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { useDrizzleDb } from '~/hooks/use-drizzle';
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
    // Placeholder for future implementation
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

export default function RecordingSettingsScreen() {
  const { theme } = useUnistyles();
  const drizzleDb = useDrizzleDb();
  const [settings, setSettings] = useState<RecordingSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
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
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
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
        recording: settings,
      };

      // Save to database
      await drizzleDb
        .update(schema.appSettings)
        .set({
          preferences: JSON.stringify(newPrefs),
          updatedAt: new Date(),
        })
        .where(eq(schema.appSettings.id, 1));

      Alert.alert('Settings Saved', 'Your recording settings have been saved successfully.');
    } catch (error) {
      console.error('Error saving recording settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateWhisperSetting = <K extends keyof RecordingSettings['whisper']>(
    key: K,
    value: RecordingSettings['whisper'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      whisper: { ...prev.whisper, [key]: value },
    }));
  };

  const updateLlamaSetting = <K extends keyof RecordingSettings['llama']>(
    key: K,
    value: RecordingSettings['llama'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      llama: { ...prev.llama, [key]: value },
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.Feather name="arrow-left" size={24} color={theme.colors.typography} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording Settings</Text>
        <TouchableOpacity onPress={saveSettings} disabled={isSaving} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Whisper Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Whisper Configuration</Text>
          </View>

          {/* Realtime Toggle with Beta Flag */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Enable Realtime</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>
            <Switch
              value={settings.whisper.enableRealtime}
              onValueChange={(value) => updateWhisperSetting('enableRealtime', value)}
              trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
              thumbColor={settings.whisper.enableRealtime ? theme.colors.white : '#f4f3f4'}
            />
          </View>

          {/* Language */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Language</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.language}
              onChangeText={(value: string) => updateWhisperSetting('language', value)}
              placeholder="auto"
              placeholderTextColor="#999"
            />
          </View>

          {/* Max Threads */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Max Threads</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.maxThreads.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('maxThreads', parseInt(value) || 4)
              }
              placeholder="4"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Realtime Audio Duration */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Recording Duration (sec)</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.realtimeAudioSec.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('realtimeAudioSec', parseInt(value) || 300)
              }
              placeholder="300"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Slice Duration */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Slice Duration (sec)</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.realtimeAudioSliceSec.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('realtimeAudioSliceSec', parseInt(value) || 10)
              }
              placeholder="10"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Voice Activity Detection */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Voice Activity Detection</Text>
            <Switch
              value={settings.whisper.useVad}
              onValueChange={(value) => updateWhisperSetting('useVad', value)}
              trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
              thumbColor={settings.whisper.useVad ? theme.colors.white : '#f4f3f4'}
            />
          </View>

          {/* VAD Threshold */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>VAD Threshold</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.vadThold.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('vadThold', parseFloat(value) || 0.6)
              }
              placeholder="0.6"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Temperature */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Temperature</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.temperature.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('temperature', parseFloat(value) || 0.0)
              }
              placeholder="0.0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Beam Size */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Beam Size</Text>
            <TextInput
              style={styles.smallInput}
              value={settings.whisper.beamSize.toString()}
              onChangeText={(value: string) =>
                updateWhisperSetting('beamSize', parseInt(value) || 5)
              }
              placeholder="5"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Translate */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Translate to English</Text>
            <Switch
              value={settings.whisper.translate}
              onValueChange={(value) => updateWhisperSetting('translate', value)}
              trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
              thumbColor={settings.whisper.translate ? theme.colors.white : '#f4f3f4'}
            />
          </View>

          {/* Token Timestamps */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Token Timestamps</Text>
            <Switch
              value={settings.whisper.tokenTimestamps}
              onValueChange={(value) => updateWhisperSetting('tokenTimestamps', value)}
              trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
              thumbColor={settings.whisper.tokenTimestamps ? theme.colors.white : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Llama Configuration (Placeholders) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Llama Configuration</Text>
            <Text style={styles.sectionSubtitle}>Coming Soon</Text>
          </View>

          {/* Model Name */}
          <View style={[styles.settingRow, styles.disabledRow]}>
            <Text style={[styles.settingLabel, styles.disabledText]}>Model Name</Text>
            <TextInput
              style={[styles.smallInput, styles.disabledInput]}
              value={settings.llama.modelName}
              onChangeText={(value: string) => updateLlamaSetting('modelName', value)}
              placeholder="llama-3.2-3b"
              editable={false}
              placeholderTextColor="#999"
            />
          </View>

          {/* Temperature */}
          <View style={[styles.settingRow, styles.disabledRow]}>
            <Text style={[styles.settingLabel, styles.disabledText]}>Temperature</Text>
            <TextInput
              style={[styles.smallInput, styles.disabledInput]}
              value={settings.llama.temperature.toString()}
              onChangeText={(value: string) =>
                updateLlamaSetting('temperature', parseFloat(value) || 0.7)
              }
              placeholder="0.7"
              keyboardType="numeric"
              editable={false}
              placeholderTextColor="#999"
            />
          </View>

          {/* Max Tokens */}
          <View style={[styles.settingRow, styles.disabledRow]}>
            <Text style={[styles.settingLabel, styles.disabledText]}>Max Tokens</Text>
            <TextInput
              style={[styles.smallInput, styles.disabledInput]}
              value={settings.llama.maxTokens.toString()}
              onChangeText={(value: string) =>
                updateLlamaSetting('maxTokens', parseInt(value) || 2048)
              }
              placeholder="2048"
              keyboardType="numeric"
              editable={false}
              placeholderTextColor="#999"
            />
          </View>

          {/* System Prompt */}
          <View style={[styles.settingRow, styles.disabledRow]}>
            <Text style={[styles.settingLabel, styles.disabledText]}>System Prompt</Text>
            <TextInput
              style={[styles.largeInput, styles.disabledInput]}
              value={settings.llama.systemPrompt}
              onChangeText={(value: string) => updateLlamaSetting('systemPrompt', value)}
              placeholder="You are a helpful AI assistant."
              multiline
              numberOfLines={3}
              editable={false}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: theme.spacing(2),
    marginLeft: -theme.spacing(2),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  saveButton: {
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing(2),
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
  },
  section: {
    marginTop: theme.spacing(6),
  },
  sectionHeader: {
    marginBottom: theme.spacing(4),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.typography,
    flex: 1,
  },
  betaBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(1),
    marginLeft: theme.spacing(2),
  },
  betaText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  smallInput: {
    width: 100,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  largeInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledRow: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.limedSpruce,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: theme.colors.limedSpruce,
  },
}));
