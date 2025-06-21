import { formatDistance } from 'date-fns';
import * as Network from 'expo-network';
import * as Progress from 'react-native-progress';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icons } from '~/components/ui/icons';
import { ModelKey, useModelStore, WHISPER_MODELS } from '~/lib/whisper-models';

export default function ModelsScreen() {
  const { theme } = useUnistyles();
  const [modelList, setModelList] = useState<ModelKey[]>([]);
  const {
    installedModels,
    currentModel,
    downloads,
    initializeStore,
    downloadModel,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteModel,
    setCurrentModel,
  } = useModelStore();

  // Initialize store when component mounts
  useFocusEffect(
    useCallback(() => {
      initializeStore();
    }, [initializeStore])
  );

  // Prepare model list for UI
  useEffect(() => {
    // Sort models by size (smallest to largest)
    const sortedModels = Object.keys(WHISPER_MODELS).sort(
      (a, b) => WHISPER_MODELS[a as ModelKey].size - WHISPER_MODELS[b as ModelKey].size
    ) as ModelKey[];
    setModelList(sortedModels);
  }, []);

  // Function to handle model download
  const handleDownload = async (modelKey: ModelKey) => {
    try {
      // Check if model is large and network isn't WiFi
      const model = WHISPER_MODELS[modelKey];
      if (model.size > 100) {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected || networkState.type !== Network.NetworkStateType.WIFI) {
          Alert.alert(
            'Mobile Data Warning',
            `This model is ${model.size}MB and you're not on WiFi. Downloading large files may use significant mobile data. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Download Anyway',
                onPress: () => downloadModel(modelKey, true),
              },
            ]
          );
          return;
        }
      }

      downloadModel(modelKey);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Download Failed',
        'There was a problem starting the download. Please try again later.'
      );
    }
  };

  // Function to handle model deletion
  const handleDelete = (modelKey: ModelKey) => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete the ${WHISPER_MODELS[modelKey].name} model?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteModel(modelKey),
        },
      ]
    );
  };

  // Render individual model item
  const renderModelItem = ({ item: modelKey }: { item: ModelKey }) => {
    const model = WHISPER_MODELS[modelKey];
    const isInstalled = !!installedModels[modelKey];
    const isDownloading = downloads[modelKey]?.isDownloading;
    const downloadProgress = downloads[modelKey]?.progress || 0;
    const downloadError = downloads[modelKey]?.error;
    const isDownloadResumable = downloads[modelKey]?.resumable;
    const isCurrentModel = currentModel === modelKey;

    return (
      <View style={styles.modelCard}>
        <View style={styles.modelInfoContainer}>
          <Text style={styles.modelName}>{model.name}</Text>
          <Text style={styles.modelDescription}>{model.description}</Text>
          <Text style={styles.modelMeta}>
            Size: {model.size}MB • Languages: {model.languages.join(', ')}
          </Text>

          {isInstalled && (
            <View style={styles.installedBadge}>
              <Icons name="checkmark" size={14} color={theme.colors.primary} />
              <Text style={styles.installedText}>
                {isCurrentModel ? 'Active' : 'Installed'} •{' '}
                {formatDistance(installedModels[modelKey].installedAt, new Date(), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.modelActions}>
          {isDownloading ? (
            <>
              <View style={styles.progressContainer}>
                <Progress.Bar
                  progress={downloadProgress}
                  color={theme.colors.primary}
                  width={null}
                  height={8}
                  borderWidth={0}
                  unfilledColor="#F3F4F6"
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>
                  {Math.round(downloadProgress * 100)}% •{' '}
                  {Math.round(model.size * downloadProgress)} / {model.size}MB
                </Text>
              </View>

              <View style={styles.downloadActionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => pauseDownload(modelKey)}>
                  <Icons name="pause" size={18} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => cancelDownload(modelKey)}>
                  <Icons name="close-circle" size={18} color={theme.colors.primary} />
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : isDownloadResumable ? (
            <>
              {downloadError && (
                <Text style={styles.errorText}>Download paused: {downloadError}</Text>
              )}
              <View style={styles.downloadActionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => resumeDownload(modelKey)}>
                  <Icons name="play" size={18} color={theme.colors.primary} />
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => cancelDownload(modelKey)}>
                  <Icons name="close-circle" size={18} color={theme.colors.primary} />
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : isInstalled ? (
            <View style={styles.downloadActionButtons}>
              {!isCurrentModel && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => setCurrentModel(modelKey)}>
                  <Text style={styles.buttonText}>Use Model</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => handleDelete(modelKey)}>
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {downloadError && downloadError !== 'not-wifi' && (
                <Text style={styles.errorText}>Error: {downloadError}</Text>
              )}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => handleDownload(modelKey)}>
                <Icons name="download" size={14} color="#FFFFFF" />
                <Text style={styles.buttonText}>Download</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Speech Recognition Models',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Icons name="close-circle" size={24} color={theme.colors.typography} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={styles.headerText}>
          Download speech recognition models to improve transcription quality and add support for
          more languages.
        </Text>

        <FlatList
          data={modelList}
          keyExtractor={(item) => item}
          renderItem={renderModelItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.infoCard}>
          <Icons name="information-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Larger models provide better accuracy and language support, but require more storage
            space and may be slower on older devices.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  headerText: {
    fontSize: 16,
    color: theme.colors.typography,
    marginBottom: 16,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 16,
  },
  modelCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modelInfoContainer: {
    marginBottom: 16,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 14,
    color: theme.colors.typography,
    marginBottom: 8,
    lineHeight: 20,
  },
  modelMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  installedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  installedText: {
    fontSize: 13,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  modelActions: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
  },
  downloadActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 12,
  },
  closeButton: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
}));
