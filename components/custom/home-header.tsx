import { Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icons } from '~/components/ui/icons';
import { AppSettings } from '~/db/schema';

export default function HomeHeader({ appSettings }: { appSettings: AppSettings }) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text>Welcome back</Text>
          <Text>{appSettings.firstName} 👋</Text>
        </View>
        <View style={styles.headerRight}>
          {[
            {
              icon: <Icons name="scan-outline" size={20} color={theme.colors.primary} />,
              label: 'Scan',
              onPress: () => {},
            },
            {
              icon: <Icons name="notifications-outline" size={20} color={theme.colors.primary} />,
              label: 'Notifications',
              onPress: () => {},
            },
          ].map((item) => (
            <TouchableOpacity key={item.label} onPress={item.onPress}>
              <View style={styles.headerRightItem}>{item.icon}</View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightItem: {
    marginLeft: 16,
  },
}));
