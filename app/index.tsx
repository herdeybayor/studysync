import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button } from '~/components/ui/button';
import { Icons } from '~/components/ui/icons';
import { Image } from '~/components/ui/image';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import * as schema from '~/db/schema';

import type { AppSettings } from '~/db/schema';
import { useDrizzleDb } from '~/hooks/use-drizzle';
import { useModelStore } from '~/lib/whisper-models';

export default function RootRoute() {
  const drizzleDb = useDrizzleDb();
  const { initializeStore, installedModels } = useModelStore();
  const { theme } = useUnistyles();

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appSettings) return;

    (async () => {
      // Initialize model store
      await initializeStore();

      // Check if app settings exist
      const settings = await drizzleDb.select().from(schema.appSettings);

      console.log('settings', settings);

      if (settings.length === 0) {
        // Create default app settings entry if none exists
        const newSettings = {
          id: 1,
          firstName: null,
          lastName: null,
          username: null,
          preferences: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await drizzleDb.insert(schema.appSettings).values(newSettings);
        setAppSettings(newSettings as AppSettings);
      } else {
        setAppSettings(settings[0]);
      }

      setLoading(false);
    })();
  }, [drizzleDb, appSettings, initializeStore]);

  // Navigate based on app state
  useEffect(() => {
    if (!loading && appSettings) {
      // Check if resources are downloaded (stored in preferences)
      let preferences: any = {};
      if (appSettings.preferences && typeof appSettings.preferences === 'string') {
        try {
          preferences = JSON.parse(appSettings.preferences);
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      }

      // Check if base model is actually installed
      const isModelInstalled = !!installedModels.base;

      // If resources aren't downloaded or model isn't installed, go to download page
      if (!preferences.resourcesDownloaded || !isModelInstalled) {
        router.replace('/download-resources');
        return;
      }

      // If user hasn't completed setup, go to setup
      if (!appSettings.firstName || !appSettings.lastName) {
        router.replace('/setup');
        return;
      }

      // Otherwise, go to home
      router.replace('/home');
    }
  }, [appSettings, loading, installedModels]);

  // Don't render the onboarding if we're going to redirect
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Icons name="flash" size={20} color={theme.colors.typography} />
        </View>

        <Image
          source={require('~/assets/images/onboarding-banner1.png')}
          style={styles.image}
          contentFit="contain"
        />

        <View style={styles.content}>
          <Text style={styles.title}>
            All your recordings in{' '}
            <View style={styles.highlight}>
              <Text style={styles.highlightText}>one place</Text>
            </View>
          </Text>

          <View style={styles.waveContainer}>
            <Image source={require('~/assets/images/wave-left.png')} style={styles.waveImage} />
            <Image
              source={require('~/assets/images/voice-button.png')}
              style={styles.voiceButton}
            />
            <Image source={require('~/assets/images/wave-right.png')} style={styles.waveImage} />
          </View>
        </View>

        <Button
          title="Get Started"
          style={styles.button}
          onPress={() => router.replace('/setup')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme, { screen }) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: theme.margins.screen,
    paddingTop: theme.spacing(4),
    paddingBottom: theme.margins.screen,
  },
  header: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing(4.5),
    paddingVertical: theme.spacing(5),
    borderRadius: 999,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    marginTop: theme.spacing(3),
  },
  content: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(4),
    borderRadius: 30,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.typography,
  },
  highlight: {
    backgroundColor: '#D9F1FA',
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: 100,
    transform: [{ translateY: 8 }, { rotate: '-1.2deg' }],
  },
  highlightText: {
    fontSize: 36,
    fontWeight: 700,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing(7),
  },
  waveImage: {
    width: 100,
    height: 100,
    contentFit: 'contain',
  },
  voiceButton: {
    width: 100,
    height: 100,
  },
  button: {
    marginTop: 'auto',
  },
}));
