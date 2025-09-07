import { View, ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Header } from '~/components/custom/home/header';
import { QuickActions } from '~/components/custom/home/quick-actions';
import { StudyStats } from '~/components/custom/home/study-stats';
import { RecentActivity } from '~/components/custom/home/recent-activity';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Spacer } from '~/components/ui/spacer';

import { useAppSettings } from '~/hooks/use-app-settings';

export default function HomeTab() {
  const { data: appSettings } = useAppSettings();

  if (!appSettings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.wrapper}>
          <Header appSettings={appSettings} />
          <Spacer size={16} />
          <QuickActions />
          <Spacer size={24} />
          <StudyStats />
          <Spacer size={24} />
          <RecentActivity />
          <Spacer size={24} />
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
  scrollView: {
    flex: 1,
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
}));
