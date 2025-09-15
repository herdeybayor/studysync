import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useMemo } from 'react';

import { Icons } from '~/components/ui/icons';
import { Image } from '~/components/ui/image';
import { useRecordings } from '~/hooks/use-recordings';
import { useCalendarEvents } from '~/hooks/use-calendar-events';

export function QuickActions() {
  const { theme } = useUnistyles();
  const { recordings } = useRecordings();
  const { events } = useCalendarEvents();

  const contextualActions = useMemo(() => {
    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 17;

    const pendingTranscripts = recordings.filter((r) => r.transcripts.length === 0);
    const upcomingEvents = events.filter((e) => new Date(e.startTime) > new Date()).slice(0, 1);

    const baseActions = [
      {
        title: 'Start Recording',
        icon: require('~/assets/images/voice-button.png'),
        backgroundColor: theme.colors.primary,
        onPress: () => router.navigate('/record'),
      },
      {
        title: 'Models',
        icon: require('~/assets/images/transcript-button.png'),
        backgroundColor: theme.colors.accent,
        onPress: () => router.navigate('/download-resources'),
      },
    ];

    // Add contextual actions based on user state and time
    const additionalActions = [];

    if (pendingTranscripts.length > 0) {
      additionalActions.push({
        title: `Transcribe (${pendingTranscripts.length})`,
        icon: require('~/assets/images/transcript-button.png'),
        backgroundColor: '#F59E0B',
        onPress: () => router.push(`/recording/${pendingTranscripts[0].id}`),
      });
    }

    if (isEvening && recordings.length > 0) {
      additionalActions.push({
        title: 'Review Today',
        icon: require('~/assets/images/transcript-button.png'),
        backgroundColor: '#8B5CF6',
        onPress: () => router.push('/(tabs)/recordings'),
      });
    }

    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const eventTime = new Date(nextEvent.startTime);
      const timeUntilEvent = eventTime.getTime() - new Date().getTime();
      const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

      if (hoursUntilEvent <= 2 && hoursUntilEvent > 0) {
        additionalActions.push({
          title: 'Prep for Class',
          icon: require('~/assets/images/voice-button.png'),
          backgroundColor: '#10B981',
          onPress: () => router.push('/(tabs)/calendar'),
        });
      }
    }

    // Return up to 3 actions (2 base + 1 contextual)
    return [...baseActions, ...additionalActions].slice(0, 3);
  }, [recordings, events, theme]);

  return (
    <View style={styles.container}>
      {contextualActions.map((item) => (
        <TouchableOpacity
          key={item.title}
          onPress={item.onPress}
          style={[styles.card, { backgroundColor: item.backgroundColor }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>{item.title}</Text>
            <View style={styles.cardArrow}>
              <Icons.Feather name="arrow-up-right" size={14} color={theme.colors.white} />
            </View>
          </View>
          <Image source={item.icon} style={styles.icon} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    gap: theme.spacing(4), // Increased from 3 to 4 (12px to 16px)
  },
  card: {
    flex: 1,
    minHeight: 140, // Fixed minimum height for consistency
    paddingHorizontal: theme.spacing(4), // Increased from 3 to 4 (12px to 16px)
    paddingTop: theme.spacing(4), // Keep top padding
    paddingBottom: theme.spacing(4), // Reduced from 7 to 4 (28px to 16px)
    borderRadius: theme.spacing(5), // Reduced from 8 to 5 (32px to 20px) for less aggressive rounding
    justifyContent: 'space-between', // Better content distribution
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from center to flex-start for better text alignment
    gap: theme.spacing(2),
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2), // Add explicit spacing below header
  },
  cardHeaderText: {
    fontSize: 15, // Reduced from 16 to 15 for better proportions
    color: theme.colors.white,
    fontWeight: '600', // Reduced from 700 to 600 for less aggressive weight
    lineHeight: 20, // Explicit line height for better text spacing
    flex: 1, // Allow text to wrap if needed
  },
  cardArrow: {
    width: theme.spacing(5), // Reduced from 6 to 5 (24px to 20px)
    height: theme.spacing(5), // Reduced from 6 to 5 (24px to 20px)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // More semantic rgba instead of hex
    borderRadius: theme.spacing(5), // Match the requested border radius
  },
  icon: {
    width: 48, // Fixed size instead of screen-dependent (was ~80px, now 48px)
    height: 48, // Fixed size instead of screen-dependent
    alignSelf: 'center',
    marginTop: 'auto', // Use auto instead of fixed spacing for better flexibility
    marginBottom: theme.spacing(1), // Small bottom margin to lift icon slightly
  },
}));
