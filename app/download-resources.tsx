import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View, Alert, ScrollView } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { eq } from 'drizzle-orm';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Button } from '~/components/ui/button';
import { useDrizzleDb } from '~/hooks/use-drizzle';
import * as schema from '~/db/schema';
import { useModelStore, WHISPER_MODELS } from '~/lib/whisper-models';
import { useLlamaModelStore, LLAMA_MODELS } from '~/lib/llama-models';

export default function DownloadResourcesScreen() {
  const { theme } = useUnistyles();
  const drizzleDb = useDrizzleDb();
  const { initializeStore, downloadModel, installedModels, downloads, setCurrentModel } =
    useModelStore();

  const {
    initializeStore: initializeLlamaStore,
    downloadModel: downloadLlamaModel,
    installedModels: llamaInstalledModels,
    downloads: llamaDownloads,
    setCurrentModel: setCurrentLlamaModel,
  } = useLlamaModelStore();

  // We'll use the base Whisper model for students
  const WHISPER_MODEL_KEY = 'tiny';
  const whisperModelInfo = WHISPER_MODELS[WHISPER_MODEL_KEY];
  const whisperDownloadState = downloads[WHISPER_MODEL_KEY];
  const isWhisperInstalled = !!installedModels[WHISPER_MODEL_KEY];

  // We'll use the smaller Qwen model for AI features - faster on mobile
  const LLAMA_MODEL_KEY = 'qwen2.5-0.5b';
  const llamaModelInfo = LLAMA_MODELS[LLAMA_MODEL_KEY];
  const llamaDownloadState = llamaDownloads[LLAMA_MODEL_KEY];
  const isLlamaInstalled = !!llamaInstalledModels[LLAMA_MODEL_KEY];

  // Both models need to be installed
  const areAllModelsInstalled = isWhisperInstalled && isLlamaInstalled;

  // Initialize both model stores when component mounts
  useEffect(() => {
    initializeStore();
    initializeLlamaStore();
  }, [initializeStore, initializeLlamaStore]);

  // Check if we should auto-navigate if models are already installed
  useEffect(() => {
    if (areAllModelsInstalled) {
      console.log('All models already installed, checking if we should navigate...');
      markResourcesAsDownloaded();
    }
  }, [areAllModelsInstalled]);

  const markResourcesAsDownloaded = async () => {
    try {
      // Mark resources as downloaded in the database
      const currentSettings = await drizzleDb.query.appSettings.findFirst({
        where: eq(schema.appSettings.id, 1),
      });

      let currentPrefs: any = {};
      if (currentSettings?.preferences && typeof currentSettings.preferences === 'string') {
        currentPrefs = JSON.parse(currentSettings.preferences);
      }

      const newPrefs = {
        ...currentPrefs,
        resourcesDownloaded: true,
      };

      await drizzleDb
        .update(schema.appSettings)
        .set({
          preferences: JSON.stringify(newPrefs),
          updatedAt: new Date(),
        })
        .where(eq(schema.appSettings.id, 1));

      // Navigate to appropriate screen
      if (currentSettings?.firstName && currentSettings?.lastName) {
        router.replace('/home');
      } else {
        router.replace('/setup');
      }
    } catch (error) {
      console.error('Error marking resources as downloaded:', error);
    }
  };

  const handleDownload = async () => {
    try {
      console.log('Starting download of AI models...');

      // Download both Whisper and Llama models
      await Promise.all([
        downloadModel(WHISPER_MODEL_KEY, true),
        downloadLlamaModel(LLAMA_MODEL_KEY, true),
      ]);

      // Set models as current
      setCurrentModel(WHISPER_MODEL_KEY);
      setCurrentLlamaModel(LLAMA_MODEL_KEY);

      console.log('Model download completed successfully');

      Alert.alert(
        'Download Complete!',
        'StudySync is ready to help you transcribe your lectures.',
        [
          {
            text: 'Continue',
            onPress: markResourcesAsDownloaded,
          },
        ]
      );
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(
        'Download Failed',
        'Failed to download required resources. Please check your internet connection and try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              // Clear any error state
              console.log('User chose to retry download');
            },
          },
        ]
      );
    }
  };

  // If models are already installed, show success state
  if (areAllModelsInstalled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
            <View style={styles.iconContainer}>
              <Icons.Feather name="check-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.title}>Resources Ready!</Text>
            <Text style={styles.subtitle}>
              StudySync is ready to help you transcribe your lectures.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const isDownloading =
    whisperDownloadState?.isDownloading || llamaDownloadState?.isDownloading || false;

  // Calculate combined progress (average of both models)
  const whisperProgress = whisperDownloadState?.progress || 0;
  const llamaProgress = llamaDownloadState?.progress || 0;
  const downloadProgress = Math.round(((whisperProgress + llamaProgress) / 2) * 100);

  const downloadError = whisperDownloadState?.error || llamaDownloadState?.error;
  const totalSize = whisperModelInfo.size + llamaModelInfo.size;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
          <View style={styles.iconContainer}>
            <Icons.Feather name="download" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Download AI Resources</Text>
          <Text style={styles.subtitle}>
            StudySync needs to download two AI models to power your study sessions. This is a
            one-time download of about {totalSize}MB.
          </Text>
        </Animated.View>

        {/* What's being downloaded */}
        <Animated.View style={styles.modelsSection} entering={FadeIn.duration(800).delay(200)}>
          <Text style={styles.modelsTitle}>What&apos;s included:</Text>

          <View style={styles.modelCard}>
            <View style={styles.modelIcon}>
              <Icons.Feather name="mic" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>Speech Recognition Model</Text>
              <Text style={styles.modelDescription}>
                Whisper Base ({whisperModelInfo.size}MB) - Converts your voice to text in real-time
              </Text>
            </View>
          </View>

          <View style={styles.modelCard}>
            <View style={styles.modelIcon}>
              <Icons.Feather name="zap" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>AI Assistant Model</Text>
              <Text style={styles.modelDescription}>
                Qwen 2.5 ({llamaModelInfo.size}MB) - Generates summaries and smart titles
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={styles.features} entering={FadeIn.duration(800).delay(300)}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="shield" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>
              100% offline - your data never leaves your device
            </Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="clock" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Real-time transcription during lectures</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="edit-3" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>AI-powered summaries and smart organization</Text>
          </View>
        </Animated.View>

        {isDownloading && (
          <Animated.View style={styles.progressContainer} entering={FadeIn.duration(300)}>
            <Text style={styles.progressText}>Downloading AI models... {downloadProgress}%</Text>
            <View style={styles.progressDetailsContainer}>
              <View style={styles.progressDetail}>
                <Text style={styles.progressDetailText}>
                  Speech Recognition: {Math.round(whisperProgress * 100)}%
                </Text>
                <View style={styles.progressBarSmall}>
                  <View
                    style={[
                      styles.progressFillSmall,
                      { width: `${Math.round(whisperProgress * 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.progressDetail}>
                <Text style={styles.progressDetailText}>
                  AI Assistant: {Math.round(llamaProgress * 100)}%
                </Text>
                <View style={styles.progressBarSmall}>
                  <View
                    style={[
                      styles.progressFillSmall,
                      { width: `${Math.round(llamaProgress * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>
          </Animated.View>
        )}

        {downloadError && downloadError !== 'not-wifi' && (
          <Animated.View style={styles.errorContainer} entering={FadeIn.duration(300)}>
            <Text style={styles.errorText}>Error: {downloadError}</Text>
          </Animated.View>
        )}

        <Animated.View style={styles.actions} entering={FadeInUp.duration(600).delay(400)}>
          {!isDownloading ? (
            <Button
              title="Download Resources"
              onPress={handleDownload}
              style={styles.downloadButton}
            />
          ) : (
            <Text style={styles.downloadingText}>
              Please wait while we download the resources...
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    // flex: 1,
    paddingHorizontal: theme.spacing(6),
    paddingBottom: theme.spacing(6),
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing(8),
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(6),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.typography,
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  modelsSection: {
    marginVertical: theme.spacing(6),
  },
  modelsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: theme.spacing(3),
  },
  modelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelInfo: {
    flex: 1,
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
    lineHeight: 20,
  },
  features: {
    gap: theme.spacing(4),
    marginVertical: theme.spacing(6),
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.typography,
    flex: 1,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing(6),
  },
  progressText: {
    fontSize: 16,
    color: theme.colors.typography,
    marginBottom: theme.spacing(3),
    fontWeight: '600',
  },
  progressDetailsContainer: {
    width: '100%',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  progressDetail: {
    width: '100%',
  },
  progressDetailText: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(1),
  },
  progressBarSmall: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: 'rgba(47, 128, 237, 0.7)',
    borderRadius: 2,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing(3),
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
  },
  downloadButton: {
    width: '100%',
    paddingVertical: theme.spacing(4),
  },
  downloadingText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    textAlign: 'center',
  },
}));
