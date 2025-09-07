import { Text, TouchableOpacity, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useMemo } from 'react';
import { router } from 'expo-router';

import { Icons } from '~/components/ui/icons';
import { useRecordings } from '~/hooks/use-recordings';
import { useCalendarEvents } from '~/hooks/use-calendar-events';

export function StudyStats() {
  const { theme } = useUnistyles();
  const { recordings, isLoading: isLoadingRecordings } = useRecordings();
  const { events, isLoading: isLoadingEvents } = useCalendarEvents();

  const stats = useMemo(() => {
    if (isLoadingRecordings || isLoadingEvents) {
      return {
        totalRecordings: 0,
        totalHours: 0,
        completedSessions: 0,
        upcomingEvents: 0,
      };
    }

    const totalRecordings = recordings.length;
    const totalMinutes = recordings.reduce((sum, recording) => {
      return sum + (recording.duration || 0);
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const completedSessions = recordings.filter(
      (recording) => recording.transcripts.length > 0 && recording.summaries.length > 0
    ).length;

    const upcomingEvents = events.filter((event) => new Date(event.startTime) > new Date()).length;

    return {
      totalRecordings,
      totalHours,
      completedSessions,
      upcomingEvents,
    };
  }, [recordings, events, isLoadingRecordings, isLoadingEvents]);

  const statItems = [
    {
      icon: 'mic-outline',
      label: 'Recordings',
      value: stats.totalRecordings.toString(),
      color: theme.colors.primary,
      onPress: () => router.push('/(tabs)/recordings'),
    },
    {
      icon: 'time-outline',
      label: 'Study Hours',
      value: stats.totalHours.toString(),
      color: '#10B981',
      onPress: () => router.push('/(tabs)/recordings'),
    },
    {
      icon: 'checkmark-circle-outline',
      label: 'Completed',
      value: stats.completedSessions.toString(),
      color: '#8B5CF6',
      onPress: () => router.push('/(tabs)/recordings'),
    },
    {
      icon: 'calendar-outline',
      label: 'Upcoming',
      value: stats.upcomingEvents.toString(),
      color: '#F59E0B',
      onPress: () => router.push('/(tabs)/calendar'),
    },
  ];

  if (isLoadingRecordings || isLoadingEvents) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Study Overview</Text>
        <View style={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={[styles.statCard, styles.loadingCard]}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Icons name="time-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { opacity: 0.5 }]}>--</Text>
              <Text style={[styles.statLabel, { opacity: 0.5 }]}>Loading</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Study Overview</Text>
      <View style={styles.statsGrid}>
        {statItems.map((stat, index) => (
          <TouchableOpacity
            key={index}
            style={styles.statCard}
            onPress={stat.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${stat.label}: ${stat.value}`}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <Icons name={stat.icon as any} size={16} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing(3),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing(2),
    gap: theme.spacing(2),
  },
  loadingCard: {
    opacity: 0.7,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.typography,
    opacity: 0.6,
    textAlign: 'center',
  },
}));
