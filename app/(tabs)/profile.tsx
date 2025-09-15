import { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { useAppSettings } from '~/hooks/use-app-settings';
import { useRecordings, useFolders } from '~/hooks/use-recordings';
import { useModelStore, WHISPER_MODELS } from '~/lib/whisper-models';
import { useLlamaModelStore, LLAMA_MODELS } from '~/lib/llama-models';

export default function ProfileTab() {
  const { theme } = useUnistyles();
  const appSettings = useAppSettings();
  const { recordings } = useRecordings();
  const { folders } = useFolders();
  const { installedModels: whisperModels, currentModel: currentWhisperModel } = useModelStore();
  const { installedModels: llamaModels, currentModel: currentLlamaModel } = useLlamaModelStore();

  const [autoTranscription, setAutoTranscription] = useState(true);
  const [highQualityRecording, setHighQualityRecording] = useState(false);

  // Calculate statistics
  const totalRecordings = recordings.length;
  const totalDuration = recordings.reduce((sum, recording) => sum + (recording.duration || 0), 0);
  const totalFolders = folders.length;
  const totalTranscripts = recordings.filter(
    (recording) => recording.transcripts.length > 0
  ).length;

  // Calculate total storage used by models
  const whisperStorageUsed = Object.keys(whisperModels).reduce((sum, key) => {
    const model = WHISPER_MODELS[key as keyof typeof WHISPER_MODELS];
    return sum + (model ? model.size : 0);
  }, 0);

  const llamaStorageUsed = Object.keys(llamaModels).reduce((sum, key) => {
    const model = LLAMA_MODELS[key as keyof typeof LLAMA_MODELS];
    return sum + (model ? model.size : 0);
  }, 0);

  const totalStorageUsed = whisperStorageUsed + llamaStorageUsed;

  // Format duration to hours and minutes
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format storage size
  const formatStorage = (mb: number): string => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}>
        {/* Header Section */}
        <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
          <View style={styles.profileImageContainer}>
            <Icons.Feather name="user" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.userName}>
            {appSettings?.data?.firstName && appSettings?.data?.lastName
              ? `${appSettings.data.firstName} ${appSettings.data.lastName}`
              : 'StudySync User'}
          </Text>
          {appSettings?.data?.username && (
            <Text style={styles.userHandle}>@{appSettings.data.username}</Text>
          )}
        </Animated.View>

        {/* Study Statistics */}
        <Animated.View style={styles.section} entering={FadeIn.duration(800).delay(100)}>
          <Text style={styles.sectionTitle}>Study Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icons.Feather name="mic" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{totalRecordings}</Text>
              <Text style={styles.statLabel}>Recordings</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icons.Feather name="clock" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{formatDuration(totalDuration)}</Text>
              <Text style={styles.statLabel}>Study Time</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icons.Feather name="folder" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{totalFolders}</Text>
              <Text style={styles.statLabel}>Folders</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icons.Feather name="file-text" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{totalTranscripts}</Text>
              <Text style={styles.statLabel}>Transcripts</Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Models Status */}
        <Animated.View style={styles.section} entering={FadeIn.duration(800).delay(200)}>
          <Text style={styles.sectionTitle}>AI Models</Text>

          {/* Whisper Model */}
          <View style={styles.modelCard}>
            <View style={styles.modelHeader}>
              <View style={styles.modelInfo}>
                <View style={styles.modelIcon}>
                  <Icons.Feather name="mic" size={16} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.modelName}>Speech Recognition</Text>
                  <Text style={styles.modelDescription}>
                    {currentWhisperModel
                      ? WHISPER_MODELS[currentWhisperModel]?.name || 'Unknown Model'
                      : 'No model installed'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: currentWhisperModel ? '#10B981' : '#EF4444',
                  },
                ]}>
                <Text style={styles.statusText}>{currentWhisperModel ? 'Ready' : 'Not Ready'}</Text>
              </View>
            </View>
          </View>

          {/* Llama Model */}
          <View style={styles.modelCard}>
            <View style={styles.modelHeader}>
              <View style={styles.modelInfo}>
                <View style={styles.modelIcon}>
                  <Icons.Feather name="zap" size={16} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.modelName}>AI Assistant</Text>
                  <Text style={styles.modelDescription}>
                    {currentLlamaModel
                      ? LLAMA_MODELS[currentLlamaModel]?.name || 'Unknown Model'
                      : 'No model installed'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: currentLlamaModel ? '#10B981' : '#EF4444',
                  },
                ]}>
                <Text style={styles.statusText}>{currentLlamaModel ? 'Ready' : 'Not Ready'}</Text>
              </View>
            </View>
          </View>

          {/* Storage Info */}
          <View style={styles.storageInfo}>
            <View style={styles.storageRow}>
              <Icons.Feather name="hard-drive" size={16} color={theme.colors.limedSpruce} />
              <Text style={styles.storageText}>
                Model Storage: {formatStorage(totalStorageUsed)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Settings */}
        <Animated.View style={styles.section} entering={FadeIn.duration(800).delay(300)}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Auto-Transcription</Text>
              <Text style={styles.settingDescription}>
                Automatically transcribe recordings using speech recognition
              </Text>
            </View>
            <Switch
              value={autoTranscription}
              onValueChange={setAutoTranscription}
              trackColor={{ false: '#E5E7EB', true: theme.colors.primary }}
              thumbColor={autoTranscription ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>High Quality Recording</Text>
              <Text style={styles.settingDescription}>
                Record at higher bitrate for better audio quality
              </Text>
            </View>
            <Switch
              value={highQualityRecording}
              onValueChange={setHighQualityRecording}
              trackColor={{ false: '#E5E7EB', true: theme.colors.primary }}
              thumbColor={highQualityRecording ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </Animated.View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing(6),
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing(6),
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(6),
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  userHandle: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing(6),
    marginBottom: theme.spacing(6),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  statCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
  },
  modelCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing(3),
  },
  modelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  modelDescription: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(2),
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storageInfo: {
    marginTop: theme.spacing(2),
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  storageText: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  settingCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing(3),
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(1),
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    lineHeight: 20,
  },
  footer: {
    height: theme.spacing(4),
  },
}));
