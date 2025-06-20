import { SafeAreaView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Header } from '~/components/custom/home/header';
import { QuickActions } from '~/components/custom/home/quick-actions';
import { Spacer } from '~/components/ui/spacer';

import { useAppSettings } from '~/hooks/use-app-settings';

export default function HomeTab() {
  const { data: appSettings } = useAppSettings();

  if (!appSettings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <Header appSettings={appSettings} />
        <Spacer size={16} />
        <QuickActions />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
}));
