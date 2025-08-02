import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View, Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { eq } from 'drizzle-orm';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Button } from '~/components/ui/button';
import { useDrizzleDb } from '~/hooks/use-drizzle';
import * as schema from '~/db/schema';
import { useModelStore, WHISPER_MODELS } from '~/lib/whisper-models';

export default function DownloadResourcesScreen() {
  const { theme } = useUnistyles();
  const drizzleDb = useDrizzleDb();
  const { initializeStore, downloadModel, installedModels, downloads, setCurrentModel } =
    useModelStore();

  // We'll use the base model for students - good balance of size and accuracy
  const MODEL_KEY = 'base';
  const modelInfo = WHISPER_MODELS[MODEL_KEY];
  const downloadState = downloads[MODEL_KEY];
  const isModelInstalled = !!installedModels[MODEL_KEY];

  // Initialize the model store when component mounts
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Check if we should auto-navigate if model is already installed
  useEffect(() => {
    if (isModelInstalled) {
      console.log('Model already installed, checking if we should navigate...');
      markResourcesAsDownloaded();
    }
  }, [isModelInstalled]);

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
      console.log('Starting download of base Whisper model...');

      // Download the base model using the model store
      await downloadModel(MODEL_KEY, true); // true = bypass network check for now

      // Set this model as the current model
      setCurrentModel(MODEL_KEY);

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

  // If model is already installed, show success state
  if (isModelInstalled) {
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

  const isDownloading = downloadState?.isDownloading || false;
  const downloadProgress = Math.round((downloadState?.progress || 0) * 100);
  const downloadError = downloadState?.error;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
          <View style={styles.iconContainer}>
            <Icons.Feather name="download" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Download Additional Resources</Text>
          <Text style={styles.subtitle}>
            StudySync needs to download the speech recognition model to transcribe your lectures.
            This is a one-time download of about {modelInfo.size}MB.
          </Text>
        </Animated.View>

        <Animated.View style={styles.features} entering={FadeIn.duration(800).delay(200)}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="mic" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>High-quality speech recognition</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="zap" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>Real-time transcription</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icons.Feather name="shield" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureText}>Works offline - your data stays private</Text>
          </View>
        </Animated.View>

        {isDownloading && (
          <Animated.View style={styles.progressContainer} entering={FadeIn.duration(300)}>
            <Text style={styles.progressText}>Downloading... {downloadProgress}%</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing(6),
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
  features: {
    gap: theme.spacing(4),
    marginVertical: theme.spacing(8),
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
