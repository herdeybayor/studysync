import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { useCalendarEvents } from '~/hooks/use-calendar-events';

export default function CalendarTab() {
  const { theme } = useUnistyles();
  const { events, createEvent, updateEvent, deleteEvent, refreshEvents } = useCalendarEvents();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isLecture, setIsLecture] = useState(false);
  const [eventStartTime, setEventStartTime] = useState(new Date());
  const [eventEndTime, setEventEndTime] = useState(new Date());

  useEffect(() => {
    refreshEvents();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const openEventModal = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setEventTitle(event.title);
      setEventDescription(event.description || '');
      setEventLocation(event.location || '');
      setIsLecture(event.isLecture);
      setEventStartTime(new Date(event.startTime));
      setEventEndTime(new Date(event.endTime));
    } else {
      setEditingEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setIsLecture(false);
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(10, 0, 0, 0);
      setEventStartTime(start);
      setEventEndTime(end);
    }
    setIsEventModalVisible(true);
  };

  const closeEventModal = () => {
    setIsEventModalVisible(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      const eventData = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        location: eventLocation.trim(),
        isLecture,
        startTime: eventStartTime,
        endTime: eventEndTime,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }

      closeEventModal();
      refreshEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handleDeleteEvent = (event: any) => {
    Alert.alert('Delete Event', `Are you sure you want to delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEvent(event.id),
      },
    ]);
  };

  const handleStartRecording = (event: any) => {
    Alert.alert('Start Recording', `Start recording for "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Recording',
        onPress: () => {
          router.navigate({
            pathname: '/record',
            params: { eventId: event.id.toString() },
          });
        },
      },
    ]);
  };

  const todaysEvents = getEventsForDate(new Date());
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openEventModal()}>
          <Icons.Feather name="plus" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Schedule */}
        {todaysEvents.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600)}>
            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
            {todaysEvents.map((event) => (
              <View key={event.id} style={styles.todayEventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {formatTime(new Date(event.startTime))} -{' '}
                      {formatTime(new Date(event.endTime))}
                    </Text>
                    {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
                  </View>
                  {event.isLecture && (
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={() => handleStartRecording(event)}>
                      <Icons.Feather name="mic" size={16} color={theme.colors.white} />
                      <Text style={styles.recordButtonText}>Record</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Calendar Navigation */}
        <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(200)}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => navigateMonth('prev')}>
              <Icons.Feather name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formatDate(currentDate)}</Text>
            <TouchableOpacity onPress={() => navigateMonth('next')}>
              <Icons.Feather name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendar}>
            {/* Week days header */}
            <View style={styles.weekHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar days */}
            <View style={styles.daysGrid}>
              {getDaysInMonth(currentDate).map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.emptyDay} />;
                }

                const dayEvents = getEventsForDate(day);
                const isToday =
                  day.getDate() === new Date().getDate() &&
                  day.getMonth() === new Date().getMonth() &&
                  day.getFullYear() === new Date().getFullYear();
                const isSelected =
                  day.getDate() === selectedDate.getDate() &&
                  day.getMonth() === selectedDate.getMonth() &&
                  day.getFullYear() === selectedDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      isToday && styles.todayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => setSelectedDate(day)}>
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.todayText,
                        isSelected && styles.selectedText,
                      ]}>
                      {day.getDate()}
                    </Text>
                    {dayEvents.length > 0 && (
                      <View style={styles.eventDots}>
                        {dayEvents.slice(0, 3).map((_, eventIndex) => (
                          <View key={eventIndex} style={styles.eventDot} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Selected Date Events */}
        {selectedDateEvents.length > 0 && (
          <Animated.View style={styles.section} entering={FadeInUp.duration(600).delay(400)}>
            <Text style={styles.sectionTitle}>Events on {selectedDate.toLocaleDateString()}</Text>
            {selectedDateEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <View style={styles.eventTitleRow}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {event.isLecture && (
                        <View style={styles.lectureTag}>
                          <Text style={styles.lectureTagText}>Lecture</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventTime}>
                      {formatTime(new Date(event.startTime))} -{' '}
                      {formatTime(new Date(event.endTime))}
                    </Text>
                    {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                  <View style={styles.eventActions}>
                    {event.isLecture && (
                      <TouchableOpacity
                        style={styles.recordButton}
                        onPress={() => handleStartRecording(event)}>
                        <Icons.Feather name="mic" size={16} color={theme.colors.white} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEventModal(event)}>
                      <Icons.Feather name="edit-2" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(event)}>
                      <Icons.Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Event Modal */}
      <Modal visible={isEventModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEventModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>
            <TouchableOpacity onPress={handleSaveEvent}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="Event title"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder="Event description (optional)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location</Text>
              <TextInput
                style={styles.formInput}
                value={eventLocation}
                onChangeText={setEventLocation}
                placeholder="Event location (optional)"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>This is a lecture/class</Text>
                <Switch
                  value={isLecture}
                  onValueChange={setIsLecture}
                  trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
                />
              </View>
              {isLecture && (
                <Text style={styles.switchHelp}>
                  Lectures can be recorded directly from the calendar
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(2),
    borderRadius: theme.spacing(4),
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
  },
  section: {
    marginTop: theme.spacing(6),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.typography,
    marginBottom: theme.spacing(4),
  },
  todayEventCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    marginRight: theme.spacing(3),
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  lectureTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.spacing(3),
  },
  lectureTagText: {
    fontSize: 12,
    color: theme.colors.white,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: theme.spacing(1),
  },
  eventLocation: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginBottom: theme.spacing(1),
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.typography,
    lineHeight: 20,
  },
  eventActions: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.spacing(2),
    gap: theme.spacing(1),
  },
  recordButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: theme.spacing(2),
  },
  deleteButton: {
    padding: theme.spacing(2),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  calendar: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing(2),
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.limedSpruce,
    paddingVertical: theme.spacing(2),
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayText: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  todayCell: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing(4),
  },
  todayText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  selectedCell: {
    backgroundColor: 'rgba(47, 128, 237, 0.1)',
    borderRadius: theme.spacing(4),
  },
  selectedText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  eventDots: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  eventCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  modalSaveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
  },
  formGroup: {
    marginBottom: theme.spacing(5),
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.typography,
    marginBottom: theme.spacing(2),
  },
  formInput: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    fontSize: 16,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchHelp: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginTop: theme.spacing(2),
  },
}));
