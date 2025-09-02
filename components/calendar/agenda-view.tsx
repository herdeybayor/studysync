import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SectionList } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  isSameDay,
  isToday,
  isPast,
  isFuture,
} from 'date-fns';
import { EnhancedCalendarEvent, AgendaItem } from '~/lib/calendar-types';
import { Icons } from '~/components/ui/icons';

interface AgendaViewProps {
  currentDate: Date;
  events: EnhancedCalendarEvent[];
  onEventPress: (event: EnhancedCalendarEvent) => void;
  timeFormat?: '12h' | '24h';
  daysToShow?: number; // Number of days to show in agenda
}

interface AgendaSection {
  title: string;
  date: Date;
  data: EnhancedCalendarEvent[];
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export default function AgendaView({
  currentDate,
  events,
  onEventPress,
  timeFormat = '12h',
  daysToShow = 30,
}: AgendaViewProps) {
  const { theme } = useUnistyles();

  // Generate agenda sections
  const agendaSections: AgendaSection[] = useMemo(() => {
    const sections: AgendaSection[] = [];
    const today = new Date();

    // Start from current date and go forward
    for (let i = 0; i < daysToShow; i++) {
      const date = addDays(currentDate, i);
      const dayEvents = events
        .filter((event) => isSameDay(event.startTime, date))
        .sort((a, b) => {
          // Sort all-day events first, then by start time
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          return a.startTime.getTime() - b.startTime.getTime();
        });

      // Only include days that have events or are today
      if (dayEvents.length > 0 || isSameDay(date, today)) {
        sections.push({
          title: formatDateHeader(date),
          date,
          data: dayEvents,
          isToday: isToday(date),
          isPast: isPast(endOfDay(date)),
          isFuture: isFuture(startOfDay(date)),
        });
      }
    }

    return sections;
  }, [currentDate, events, daysToShow]);

  function formatDateHeader(date: Date): string {
    if (isToday(date)) {
      return 'Today';
    }

    const now = new Date();
    const tomorrow = addDays(now, 1);
    const yesterday = addDays(now, -1);

    if (isSameDay(date, tomorrow)) {
      return 'Tomorrow';
    }

    if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    }

    // For dates within the current week, show day name
    const daysDiff = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) {
      return format(date, 'EEEE, MMM d');
    }

    // For dates beyond current week, show full date
    return format(date, 'EEEE, MMMM d');
  }

  function formatEventTime(event: EnhancedCalendarEvent): string {
    if (event.isAllDay) {
      return 'All day';
    }

    const startTime = format(event.startTime, timeFormat === '12h' ? 'h:mm a' : 'HH:mm');
    const endTime = format(event.endTime, timeFormat === '12h' ? 'h:mm a' : 'HH:mm');

    return `${startTime} - ${endTime}`;
  }

  function getEventStatusIcon(event: EnhancedCalendarEvent) {
    if (event.isLecture) {
      return <Icons.Feather name="mic" size={16} color={event.displayColor} />;
    }

    if (event.isRecurring) {
      return <Icons.Feather name="repeat" size={16} color={event.displayColor} />;
    }

    if (event.reminders && event.reminders.length > 0) {
      return <Icons.Feather name="bell" size={16} color={event.displayColor} />;
    }

    return null;
  }

  function renderSectionHeader({ section }: { section: AgendaSection }) {
    return (
      <View
        style={[
          styles.sectionHeader,
          section.isToday && styles.todaySectionHeader,
          section.isPast && styles.pastSectionHeader,
        ]}>
        <Text
          style={[
            styles.sectionHeaderText,
            section.isToday && styles.todaySectionHeaderText,
            section.isPast && styles.pastSectionHeaderText,
          ]}>
          {section.title}
        </Text>
        <Text
          style={[
            styles.sectionSubtitle,
            section.isToday && styles.todaySectionSubtitle,
            section.isPast && styles.pastSectionSubtitle,
          ]}>
          {section.data.length === 0
            ? 'No events'
            : section.data.length === 1
              ? '1 event'
              : `${section.data.length} events`}
        </Text>
      </View>
    );
  }

  function renderEventItem({ item: event }: { item: EnhancedCalendarEvent }) {
    const eventTime = formatEventTime(event);
    const statusIcon = getEventStatusIcon(event);
    const isEventPast = isPast(event.endTime);

    return (
      <TouchableOpacity
        style={[styles.eventItem, isEventPast && styles.pastEventItem]}
        onPress={() => onEventPress(event)}>
        {/* Time and status indicators */}
        <View style={styles.eventTimeColumn}>
          <Text style={[styles.eventTime, isEventPast && styles.pastEventTime]}>{eventTime}</Text>
          {statusIcon && <View style={styles.eventStatusIcon}>{statusIcon}</View>}
        </View>

        {/* Event details */}
        <View style={styles.eventDetails}>
          <View style={styles.eventHeader}>
            <View style={[styles.eventColorIndicator, { backgroundColor: event.displayColor }]} />
            <Text
              style={[styles.eventTitle, isEventPast && styles.pastEventTitle]}
              numberOfLines={2}>
              {event.title}
            </Text>
          </View>

          {event.location && (
            <View style={styles.eventLocation}>
              <Icons.Feather name="map-pin" size={14} color={theme.colors.limedSpruce} />
              <Text
                style={[styles.eventLocationText, isEventPast && styles.pastEventLocationText]}
                numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}

          {event.description && (
            <Text
              style={[styles.eventDescription, isEventPast && styles.pastEventDescription]}
              numberOfLines={2}>
              {event.description}
            </Text>
          )}

          {event.category && (
            <View style={styles.eventCategory}>
              <View style={[styles.categoryDot, { backgroundColor: event.category.color }]} />
              <Text style={[styles.categoryText, isEventPast && styles.pastCategoryText]}>
                {event.category.name}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow indicator */}
        <View style={styles.eventArrow}>
          <Icons.Feather
            name="chevron-right"
            size={20}
            color={isEventPast ? theme.colors.limedSpruce : theme.colors.typography}
          />
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmptyDay({ section }: { section: AgendaSection }) {
    if (section.data.length > 0) return null;

    return (
      <View style={styles.emptyDay}>
        <Icons.Feather name="calendar" size={24} color={theme.colors.limedSpruce} />
        <Text style={styles.emptyDayText}>No events scheduled</Text>
        <Text style={styles.emptyDaySubtext}>
          {section.isToday ? 'Enjoy your free day!' : 'This day is available'}
        </Text>
      </View>
    );
  }

  if (agendaSections.length === 0) {
    return (
      <View style={styles.emptyAgenda}>
        <Icons.Feather name="calendar" size={48} color={theme.colors.limedSpruce} />
        <Text style={styles.emptyAgendaTitle}>No upcoming events</Text>
        <Text style={styles.emptyAgendaSubtitle}>
          Your calendar is clear for the next {daysToShow} days
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={agendaSections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item, section }) => {
        // Render empty state for sections with no events
        if (section.data.length === 0) {
          return renderEmptyDay({ section });
        }
        return renderEventItem({ item });
      }}
      renderSectionHeader={renderSectionHeader}
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      stickySectionHeadersEnabled={true}
      ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
      SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing(6),
  },
  sectionHeader: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  todaySectionHeader: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderBottomColor: theme.colors.primary,
  },
  pastSectionHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: 2,
  },
  todaySectionHeaderText: {
    color: theme.colors.primary,
  },
  pastSectionHeaderText: {
    color: theme.colors.limedSpruce,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    fontWeight: '500',
  },
  todaySectionSubtitle: {
    color: 'rgba(59, 130, 246, 0.7)',
  },
  pastSectionSubtitle: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  eventItem: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(4),
    backgroundColor: theme.colors.white,
    alignItems: 'flex-start',
  },
  pastEventItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  eventTimeColumn: {
    width: 80,
    alignItems: 'flex-start',
    marginRight: theme.spacing(3),
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  pastEventTime: {
    color: theme.colors.limedSpruce,
  },
  eventStatusIcon: {
    marginTop: theme.spacing(1),
  },
  eventDetails: {
    flex: 1,
    marginRight: theme.spacing(2),
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2),
  },
  eventColorIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: theme.spacing(3),
    marginTop: 2,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    lineHeight: 22,
  },
  pastEventTitle: {
    color: theme.colors.limedSpruce,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
  },
  eventLocationText: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
  },
  pastEventLocationText: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
    marginBottom: theme.spacing(2),
  },
  pastEventDescription: {
    color: theme.colors.limedSpruce,
  },
  eventCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.limedSpruce,
  },
  pastCategoryText: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  eventArrow: {
    justifyContent: 'center',
  },
  eventSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: theme.spacing(4),
  },
  sectionSeparator: {
    height: theme.spacing(4),
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: theme.spacing(8),
    paddingHorizontal: theme.spacing(4),
    backgroundColor: theme.colors.white,
  },
  emptyDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.limedSpruce,
    marginTop: theme.spacing(3),
  },
  emptyDaySubtext: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginTop: theme.spacing(1),
    textAlign: 'center',
  },
  emptyAgenda: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(6),
  },
  emptyAgendaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.typography,
    marginTop: theme.spacing(4),
    textAlign: 'center',
  },
  emptyAgendaSubtitle: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
    marginTop: theme.spacing(2),
    textAlign: 'center',
    lineHeight: 24,
  },
}));
