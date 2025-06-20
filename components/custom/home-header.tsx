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
          <Text style={styles.headerLeftGreeting}>Welcome back</Text>
          <Text style={styles.headerLeftName}>{appSettings.firstName ?? 'N/A'} 👋🏾</Text>
        </View>
        <View style={styles.headerRight}>
          {[
            {
              icon: <Icons name="scan-outline" size={16} color={theme.colors.primary} />,
              label: 'Scan',
              onPress: () => {},
            },
            {
              icon: <Icons name="notifications-outline" size={16} color={theme.colors.primary} />,
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

      <TouchableOpacity>
        <View style={styles.headerSearch}>
          <Icons name="search-outline" size={20} color="#667185" />
          <Text style={styles.headerSearchText}>Search for recording</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerContainer: {
    paddingHorizontal: theme.spacing(3.5),
    paddingVertical: theme.spacing(8),
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: theme.spacing(0.5),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  headerRightItem: {
    backgroundColor: '#E9F2FD',
    width: theme.spacing(10),
    height: theme.spacing(10),
    borderRadius: theme.spacing(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeftGreeting: {
    fontSize: 16,
    fontWeight: 400,
    color: '#F9FAFB99',
  },
  headerLeftName: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.colors.white,
  },
  headerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    backgroundColor: theme.colors.white,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(10),
    marginTop: theme.spacing(7),
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  headerSearchText: {
    fontSize: 14,
    fontWeight: 400,
    color: '#667185',
  },
}));
