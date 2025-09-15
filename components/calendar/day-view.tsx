import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { format, isToday, getHours, getMinutes, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { EnhancedCalendarEvent, PositionedEvent, DayData, TimeSlot } from '~/lib/calendar-types';
import { Icons } from '~/components/ui/icons';

interface DayViewProps {
  currentDate: Date;
  events: EnhancedCalendarEvent[];
  onEventPress: (event: EnhancedCalendarEvent) => void;
  onTimeSlotPress: (date: Date, hour: number) => void;
  workingHoursStart?: number; // 24-hour format (e.g., 9 for 9 AM)
  workingHoursEnd?: number; // 24-hour format (e.g., 17 for 5 PM)
  timeFormat?: '12h' | '24h';
  scrollToCurrentTime?: boolean;
}

const HOUR_HEIGHT = 80;
const TIME_COLUMN_WIDTH = 70;
const ALL_DAY_HEIGHT = 40;

export default function DayView({
  currentDate,
  events,
  onEventPress,
  onTimeSlotPress,
  workingHoursStart = 9,
  workingHoursEnd = 17,
  timeFormat = '12h',
  scrollToCurrentTime = false,
}: DayViewProps) {
  const { theme } = useUnistyles();

  // Generate day data
  const dayData: DayData = useMemo(() => {
    const todayEvents = events.filter((event) => isSameDay(event.startTime, currentDate));

    const allDayEvents = todayEvents.filter((event) => event.isAllDay);
    const timedEvents = todayEvents.filter((event) => !event.isAllDay);

    // Generate time slots
    const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, hour) => ({
      time: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        hour,
        0
      ),
      hour,
      minute: 0,
      events: [],
      isWorkingHour: hour >= workingHoursStart && hour < workingHoursEnd,
      isCurrentTime: isToday(currentDate) && new Date().getHours() === hour,
    }));

    return {
      date: currentDate,
      isToday: isToday(currentDate),
      allDayEvents: positionAllDayEvents(allDayEvents),
      timeSlots,
      workingHoursStart,
      workingHoursEnd,
    };
  }, [currentDate, events, workingHoursStart, workingHoursEnd]);

  // Position all-day events
  function positionAllDayEvents(allDayEvents: EnhancedCalendarEvent[]): PositionedEvent[] {
    return allDayEvents.map((event, index) => ({
      ...event,
      top: index * (ALL_DAY_HEIGHT + 4),
      height: ALL_DAY_HEIGHT,
      left: 0,
      width: 100,
      zIndex: 1,
    }));
  }

  // Position timed events to avoid overlaps
  const positionedTimedEvents = useMemo(() => {
    const timedEvents = events.filter(
      (event) => isSameDay(event.startTime, currentDate) && !event.isAllDay
    );

    if (timedEvents.length === 0) return [];

    // Sort events by start time
    const sortedEvents = [...timedEvents].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    const positioned: PositionedEvent[] = [];
    const columns: { events: PositionedEvent[]; endTime: number }[] = [];

    for (const event of sortedEvents) {
      const startHour = getHours(event.startTime);
      const startMinute = getMinutes(event.startTime);
      const endHour = getHours(event.endTime);
      const endMinute = getMinutes(event.endTime);

      const top = startHour * HOUR_HEIGHT + (startMinute * HOUR_HEIGHT) / 60;
      const height = Math.max(
        (endHour - startHour) * HOUR_HEIGHT + ((endMinute - startMinute) * HOUR_HEIGHT) / 60,
        HOUR_HEIGHT / 3 // Minimum height
      );

      // Find column for this event
      let columnIndex = 0;
      const eventStartTime = event.startTime.getTime();

      while (columnIndex < columns.length && columns[columnIndex].endTime > eventStartTime) {
        columnIndex++;
      }

      // Create new column if needed
      if (columnIndex >= columns.length) {
        columns.push({ events: [], endTime: 0 });
      }

      const positionedEvent: PositionedEvent = {
        ...event,
        top,
        height,
        left: 0,
        width: 0,
        zIndex: 1,
        column: columnIndex,
        totalColumns: 0,
      };

      columns[columnIndex].events.push(positionedEvent);
      columns[columnIndex].endTime = event.endTime.getTime();
      positioned.push(positionedEvent);
    }

    // Calculate width and left position for each event
    const totalColumns = columns.length;
    const columnWidth = 100 / totalColumns;

    positioned.forEach((event) => {
      event.totalColumns = totalColumns;
      event.width = columnWidth - 1;
      event.left = (event.column || 0) * columnWidth;
    });

    return positioned;
  }, [currentDate, events]);

  const formatHour = (hour: number): string => {
    if (timeFormat === '24h') {
      return `${hour.toString().padStart(2, '0')}:00`;
    }

    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getCurrentTimePosition = (): number | null => {
    if (!dayData.isToday) return null;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours * HOUR_HEIGHT + (minutes * HOUR_HEIGHT) / 60;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.dayName, dayData.isToday && styles.todayText]}>
          {format(currentDate, 'EEEE')}
        </Text>
        <Text style={[styles.dayNumber, dayData.isToday && styles.todayText]}>
          {format(currentDate, 'MMMM d, yyyy')}
        </Text>
      </View>

      {/* All-day events */}
      {dayData.allDayEvents.length > 0 && (
        <View style={styles.allDaySection}>
          <View style={styles.allDayHeader}>
            <Text style={styles.allDayTitle}>All Day</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.allDayEventsContainer}>
              {dayData.allDayEvents.map((event, index) => (
                <TouchableOpacity
                  key={`allday-${event.id}-${index}`}
                  style={[
                    styles.allDayEvent,
                    {
                      backgroundColor: event.displayColor,
                      top: event.top,
                    },
                  ]}
                  onPress={() => onEventPress(event)}>
                  <View style={styles.allDayEventContent}>
                    <Text style={styles.allDayEventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    {event.location && (
                      <Text style={styles.allDayEventLocation} numberOfLines={1}>
                        {event.location}
                      </Text>
                    )}
                  </View>
                  {event.isLecture && (
                    <Icons.Feather name="mic" size={14} color="rgba(255,255,255,0.9)" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Timed events */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentOffset={
          scrollToCurrentTime && currentTimePosition
            ? { x: 0, y: Math.max(0, currentTimePosition - 200) }
            : undefined
        }>
        <View style={styles.dayContent}>
          {/* Time column */}
          <View style={styles.timeColumn}>
            {dayData.timeSlots.map((timeSlot, index) => (
              <View key={index} style={styles.timeSlot}>
                <Text style={[styles.timeText, timeSlot.isCurrentTime && styles.currentTimeText]}>
                  {formatHour(timeSlot.hour)}
                </Text>
              </View>
            ))}
          </View>

          {/* Events column */}
          <View style={styles.eventsColumn}>
            {/* Background time slots */}
            {dayData.timeSlots.map((timeSlot, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlotBackground,
                  timeSlot.isWorkingHour && styles.workingHourBackground,
                  timeSlot.isCurrentTime && styles.currentTimeBackground,
                ]}
                onPress={() => onTimeSlotPress(dayData.date, timeSlot.hour)}>
                {/* Hour divider line */}
                <View style={styles.hourDivider} />

                {/* Half-hour divider line */}
                <View style={styles.halfHourDivider} />
              </TouchableOpacity>
            ))}

            {/* Timed events */}
            {positionedTimedEvents.map((event, index) => (
              <TouchableOpacity
                key={`timed-${event.id}-${index}`}
                style={[
                  styles.timedEvent,
                  {
                    top: event.top,
                    height: event.height,
                    left: `${event.left}%`,
                    width: `${event.width}%`,
                    backgroundColor: event.displayColor,
                  },
                ]}
                onPress={() => onEventPress(event)}>
                <View style={styles.timedEventContent}>
                  <Text style={styles.timedEventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={styles.timedEventTime}>
                    {format(event.startTime, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')} -{' '}
                    {format(event.endTime, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')}
                  </Text>
                  {event.location && (
                    <View style={styles.timedEventLocation}>
                      <Icons.Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.timedEventLocationText} numberOfLines={1}>
                        {event.location}
                      </Text>
                    </View>
                  )}
                  {event.isLecture && (
                    <View style={styles.lectureIndicator}>
                      <Icons.Feather name="mic" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.lectureIndicatorText}>Lecture</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Current time indicator */}
            {dayData.isToday && currentTimePosition !== null && (
              <View style={[styles.currentTimeLine, { top: currentTimePosition }]}>
                <View style={styles.currentTimeCircle} />
                <View style={styles.currentTimeLineBar} />
                <Text style={styles.currentTimeLabel}>
                  {format(new Date(), timeFormat === '12h' ? 'h:mm a' : 'HH:mm')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(4),
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
    marginTop: 4,
  },
  todayText: {
    color: theme.colors.primary,
  },
  allDaySection: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  allDayHeader: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  allDayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allDayEventsContainer: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    minHeight: 60,
  },
  allDayEvent: {
    position: 'absolute',
    left: theme.spacing(4),
    right: theme.spacing(4),
    height: ALL_DAY_HEIGHT,
    borderRadius: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  allDayEventContent: {
    flex: 1,
  },
  allDayEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  allDayEventLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  dayContent: {
    flexDirection: 'row',
    minHeight: 24 * HOUR_HEIGHT,
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: theme.colors.white,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: theme.spacing(2),
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.limedSpruce,
    fontWeight: '500',
  },
  currentTimeText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.colors.white,
  },
  timeSlotBackground: {
    height: HOUR_HEIGHT,
    position: 'relative',
  },
  workingHourBackground: {
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  currentTimeBackground: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  hourDivider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  halfHourDivider: {
    position: 'absolute',
    top: HOUR_HEIGHT / 2,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  timedEvent: {
    position: 'absolute',
    borderRadius: theme.spacing(2),
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timedEventContent: {
    flex: 1,
    padding: theme.spacing(2),
  },
  timedEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
  },
  timedEventTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  timedEventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  timedEventLocationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  lectureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lectureIndicatorText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginLeft: -5,
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.primary,
  },
  currentTimeLabel: {
    position: 'absolute',
    right: theme.spacing(2),
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(1),
    fontSize: 10,
    color: theme.colors.white,
    fontWeight: '600',
  },
}));
