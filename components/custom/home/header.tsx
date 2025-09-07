import { Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

import { Icons } from '~/components/ui/icons';
import { AppSettings } from '~/db/schema';
import { Image } from '~/components/ui/image';
import { useCalendarEvents } from '~/hooks/use-calendar-events';

export function Header({ appSettings }: { appSettings: AppSettings }) {
  const { theme } = useUnistyles();
  const { events, isLoading: isLoadingEvents } = useCalendarEvents();

  const upcomingEvents = events
    .filter((event) => new Date(event.startTime) > new Date())
    .slice(0, 2);

  const handleSearch = () => {
    router.push('/recordings?search=true');
  };

  const handleCalendarNavigation = () => {
    router.push('/(tabs)/calendar');
  };

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

      <TouchableOpacity
        onPress={handleSearch}
        accessibilityRole="button"
        accessibilityLabel="Search recordings">
        <View style={styles.headerSearch}>
          <Icons name="search-outline" size={20} color="#667185" />
          <Text style={styles.headerSearchText}>Search for recording</Text>
        </View>
      </TouchableOpacity>

      <BlurView intensity={10} tint="dark" style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHeaderText}>Calendar</Text>
          <TouchableOpacity
            style={styles.calendarArrow}
            onPress={handleCalendarNavigation}
            accessibilityRole="button"
            accessibilityLabel="View full calendar">
            <Icons.Feather name="arrow-up-right" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarItems}>
          {isLoadingEvents ? (
            // Loading state
            <View style={styles.calendarItem}>
              <View style={styles.calendarItemContent}>
                <Text style={[styles.calendarItemDate, { opacity: 0.5 }]}>Loading...</Text>
                <Text style={[styles.calendarItemTitle, { opacity: 0.5 }]}>Loading events</Text>
              </View>
            </View>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => router.push(`/(tabs)/calendar?eventId=${event.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`View event: ${event.title}`}>
                <View style={styles.calendarItem}>
                  <View style={styles.calendarItemContent}>
                    <Text style={styles.calendarItemDate}>
                      {format(new Date(event.startTime), 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.calendarItemTitle}>{event.title}</Text>
                  </View>
                  <View style={styles.calendarItemTime}>
                    <Text style={styles.calendarItemTimeText}>
                      {format(new Date(event.startTime), 'h:mm a')} -{' '}
                      {format(new Date(event.endTime), 'h:mm a')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            // Empty state
            <TouchableOpacity
              onPress={handleCalendarNavigation}
              accessibilityRole="button"
              accessibilityLabel="Add first calendar event">
              <View style={[styles.calendarItem, { opacity: 0.7 }]}>
                <View style={styles.calendarItemContent}>
                  <Text style={styles.calendarItemDate}>No upcoming events</Text>
                  <Text style={styles.calendarItemTitle}>Tap to add events</Text>
                </View>
                <View style={styles.calendarItemTime}>
                  <Icons.Feather name="plus" size={14} color={theme.colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
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
  calendarArrow: {
    width: theme.spacing(6),
    height: theme.spacing(6),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF4A',
    borderRadius: theme.spacing(6),
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
    fontSize: 8,
    color: theme.colors.primary,
  },
}));
