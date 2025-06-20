import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { Suspense } from 'react';

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DATABASE_NAME } from '~/db/constant';

import migrations from '~/drizzle/migrations';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
const db = drizzle(expoDb);

console.log('db', expoDb.databasePath);

const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingTitle}>StudySync</Text>
        <Text style={styles.loadingText}>Loading your study environment...</Text>
      </View>
    </View>
  );
};

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Migration Error</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingTitle}>StudySync</Text>
          <Text style={styles.loadingText}>Setting up database...</Text>
        </View>
      </View>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLite.SQLiteProvider
        databaseName={DATABASE_NAME}
        options={{ enableChangeListener: true }}
        useSuspense>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ headerShown: false }} />
          <Stack.Screen
            name="record"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              gestureDirection: 'vertical',
              animation: 'slide_from_bottom',
              sheetGrabberVisible: true,
              sheetInitialDetentIndex: 0,
              sheetAllowedDetents: [0.5],
              sheetCornerRadius: 24,
              sheetElevation: 10,
            }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SQLite.SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 250,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    color: '#111827',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#7F1D1D',
    textAlign: 'center',
  },
});
