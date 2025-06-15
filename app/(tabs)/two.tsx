import { Stack } from 'expo-router';

import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ScreenContent } from '~/components/ScreenContent';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Tab Two' }} />
      <View style={styles.container}>
        <ScreenContent path="app/(tabs)/two.tsx" title="Tab Two" />
      </View>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.background,
  },
}));
