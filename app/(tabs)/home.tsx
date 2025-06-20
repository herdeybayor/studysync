import { SafeAreaView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import HomeHeader from '~/components/custom/home-header';
import { useAppSettings } from '~/hooks/use-app-settings';

export default function HomeTab() {
  const { data: appSettings } = useAppSettings();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>{appSettings && <HomeHeader appSettings={appSettings} />}</View>
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
