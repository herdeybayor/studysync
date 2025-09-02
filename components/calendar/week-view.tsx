import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
} from 'date-fns';
import { EnhancedCalendarEvent, PositionedEvent, WeekData, TimeSlot } from '~/lib/calendar-types';
import { Icons } from '~/components/ui/icons';

interface WeekViewProps {
  currentDate: Date;
  events: EnhancedCalendarEvent[];
  onEventPress: (event: EnhancedCalendarEvent) => void;
  onTimeSlotPress: (date: Date, hour: number) => void;
  workingHoursStart?: number; // 24-hour format (e.g., 9 for 9 AM)
  workingHoursEnd?: number; // 24-hour format (e.g., 17 for 5 PM)
  timeFormat?: '12h' | '24h';
  weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday
}

const HOUR_HEIGHT = 60;
const HEADER_HEIGHT = 70;
const TIME_COLUMN_WIDTH = 60;

export default function WeekView({
  currentDate,
  events,
  onEventPress,
  onTimeSlotPress,
  workingHoursStart = 9,
  workingHoursEnd = 17,
  timeFormat = '12h',
  weekStartsOn = 0,
}: WeekViewProps) {
  const { theme } = useUnistyles();

  // Generate week data
  const weekData: WeekData = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn });

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const dayEvents = events.filter(
        (event) => isSameDay(event.startTime, date) && !event.isAllDay
      );

      // Generate time slots for this day
      const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, hour) => ({
        time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0),
        hour,
        minute: 0,
        events: [],
        isWorkingHour: hour >= workingHoursStart && hour < workingHoursEnd,
        isCurrentTime: isToday(date) && new Date().getHours() === hour,
      }));

      return {
        date,
        isToday: isToday(date),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        events: positionEvents(dayEvents),
        timeSlots,
      };
    });

    return {
      weekStart,
      weekEnd,
      days,
    };
  }, [currentDate, events, workingHoursStart, workingHoursEnd, weekStartsOn]);

  // Position events to avoid overlaps
  function positionEvents(dayEvents: EnhancedCalendarEvent[]): PositionedEvent[] {
    if (dayEvents.length === 0) return [];

    // Sort events by start time
    const sortedEvents = [...dayEvents].sort(
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
        HOUR_HEIGHT / 2 // Minimum height
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
        left: 0, // Will be calculated based on column
        width: 0, // Will be calculated based on total columns
        zIndex: 1,
        column: columnIndex,
        totalColumns: 0, // Will be set later
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
      event.width = columnWidth - 1; // Leave small gap between columns
      event.left = (event.column || 0) * columnWidth;
    });

    return positioned;
  }

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
    const now = new Date();
    const todayData = weekData.days.find((day) => isToday(day.date));

    if (!todayData) return null;

    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours * HOUR_HEIGHT + (minutes * HOUR_HEIGHT) / 60;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <View style={styles.container}>
      {/* Header with days */}
      <View style={styles.header}>
        <View style={[styles.timeColumn, styles.headerTimeColumn]} />
        {weekData.days.map((day, index) => (
          <View key={index} style={styles.dayHeader}>
            <Text style={[styles.dayName, day.isToday && styles.todayText]}>
              {format(day.date, 'EEE')}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                day.isToday && styles.todayText,
                !day.isCurrentMonth && styles.otherMonthText,
              ]}>
              {format(day.date, 'd')}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.weekContent}>
          {/* Time column */}
          <View style={styles.timeColumn}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeText}>{formatHour(hour)}</Text>
              </View>
            ))}
          </View>

          {/* Days columns */}
          {weekData.days.map((day, dayIndex) => (
            <View key={dayIndex} style={styles.dayColumn}>
              {/* Background time slots */}
              {day.timeSlots.map((timeSlot, hourIndex) => (
                <TouchableOpacity
                  key={hourIndex}
                  style={[
                    styles.timeSlotBackground,
                    timeSlot.isWorkingHour && styles.workingHourBackground,
                    timeSlot.isCurrentTime && styles.currentTimeBackground,
                  ]}
                  onPress={() => onTimeSlotPress(day.date, timeSlot.hour)}
                />
              ))}

              {/* All-day events area */}
              <View style={styles.allDayArea}>
                {events
                  .filter((event) => isSameDay(event.startTime, day.date) && event.isAllDay)
                  .map((event, eventIndex) => (
                    <TouchableOpacity
                      key={`allday-${event.id}-${eventIndex}`}
                      style={[styles.allDayEvent, { backgroundColor: event.displayColor }]}
                      onPress={() => onEventPress(event)}>
                      <Text style={styles.allDayEventText} numberOfLines={1}>
                        {event.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              {/* Timed events */}
              {day.events.map((event, eventIndex) => (
                <TouchableOpacity
                  key={`timed-${event.id}-${eventIndex}`}
                  style={[
                    styles.event,
                    {
                      top: event.top,
                      height: event.height,
                      left: `${event.left}%`,
                      width: `${event.width}%`,
                      backgroundColor: event.displayColor,
                      zIndex: event.zIndex,
                    },
                  ]}
                  onPress={() => onEventPress(event)}>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {format(event.startTime, timeFormat === '12h' ? 'h:mm a' : 'HH:mm')}
                    </Text>
                    {event.location && (
                      <View style={styles.eventLocation}>
                        <Icons.Feather name="map-pin" size={10} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.eventLocationText} numberOfLines={1}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Current time indicator */}
              {day.isToday && currentTimePosition !== null && (
                <View style={[styles.currentTimeLine, { top: currentTimePosition }]}>
                  <View style={styles.currentTimeCircle} />
                  <View style={styles.currentTimeLineBar} />
                </View>
              )}
            </View>
          ))}
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
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTimeColumn: {
    borderBottomWidth: 0,
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing(2),
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
    marginTop: 2,
  },
  todayText: {
    color: theme.colors.primary,
  },
  otherMonthText: {
    color: theme.colors.limedSpruce,
  },
  scrollView: {
    flex: 1,
  },
  weekContent: {
    flexDirection: 'row',
    minHeight: 24 * HOUR_HEIGHT,
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: theme.spacing(1),
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.limedSpruce,
    fontWeight: '500',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  timeSlotBackground: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  workingHourBackground: {
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
  },
  currentTimeBackground: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  allDayArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 2,
  },
  allDayEvent: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(1),
    marginBottom: 2,
  },
  allDayEventText: {
    fontSize: 12,
    color: theme.colors.white,
    fontWeight: '500',
  },
  event: {
    position: 'absolute',
    borderRadius: theme.spacing(1),
    marginHorizontal: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  eventContent: {
    flex: 1,
    padding: theme.spacing(1),
    justifyContent: 'flex-start',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  eventLocationText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: -4,
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.primary,
  },
}));
