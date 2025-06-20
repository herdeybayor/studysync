import { Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Icons } from '~/components/ui/icons';
import { AppSettings } from '~/db/schema';
import { Image } from '~/components/ui/image';

export default function HomeHeader({ appSettings }: { appSettings: AppSettings }) {
  const { theme } = useUnistyles();

  return (
    <LinearGradient
      colors={['#2F80ED', '#004299']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0.15, 1]}
      style={styles.headerContainer}>
      <Image source={require('~/assets/images/card-pattern.png')} style={styles.headerPattern} />
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

      <BlurView intensity={10} tint="dark" style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHeaderText}>Calendar</Text>
          <TouchableOpacity style={styles.calendarArrowWrapper}>
            <Icons
              name="arrow-up"
              size={16}
              color={theme.colors.white}
              style={styles.calendarArrow}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarItems}>
          {[
            {
              id: 1,
              title: 'Attend PSY 101 Class',
              timestamp: 1718851200,
              onPress: () => {},
            },
            {
              id: 2,
              title: 'Attend PSY 101 Class',
              timestamp: 1718851200,
              onPress: () => {},
            },
          ].map((item) => (
            <TouchableOpacity key={item.id} onPress={item.onPress}>
              <View style={styles.calendarItem}>
                <View style={styles.calendarItemContent}>
                  <Text style={styles.calendarItemDate}>
                    {format(item.timestamp, 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.calendarItemTitle}>{item.title}</Text>
                </View>
                <View style={styles.calendarItemTime}>
                  <Text style={styles.calendarItemTimeText}>
                    {format(item.timestamp, 'h:mm a')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerContainer: {
    paddingHorizontal: theme.spacing(3.5),
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(4),
    borderRadius: 36,
    position: 'relative',
  },
  headerPattern: {
    position: 'absolute',
    width: 365,
    height: 455,
    bottom: -32,
    right: -150,
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
  calendarContainer: {
    marginTop: theme.spacing(2.5),
    borderRadius: theme.spacing(8),
    padding: theme.spacing(4.5),
    backgroundColor: '#91BDF733',
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
  },
  calendarHeaderText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: 700,
  },
  calendarArrowWrapper: {
    width: theme.spacing(6),
    height: theme.spacing(6),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF4A',
    borderRadius: theme.spacing(6),
  },
  calendarArrow: {
    transform: [{ rotate: '45deg' }],
  },
  calendarItems: {
    marginTop: theme.spacing(3),
    gap: theme.spacing(2),
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    padding: theme.spacing(2),
    borderRadius: theme.spacing(2),
    borderLeftWidth: 4,
    borderLeftColor: '#56CCF2',
  },
  calendarItemContent: {
    gap: theme.spacing(1),
  },
  calendarItemDate: {
    fontSize: 12,
    fontWeight: 400,
    color: '#444444',
    opacity: 0.5,
  },
  calendarItemTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: theme.colors.typography,
  },
  calendarItemTime: {
    backgroundColor: '#E9F2FD',
    borderRadius: theme.spacing(1),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
  },
  calendarItemTimeText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
}));
