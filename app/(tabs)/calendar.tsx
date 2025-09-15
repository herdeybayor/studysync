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
  Platform,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { addDays, subDays, format, addMonths } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

import { Icons } from '~/components/ui/icons';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { useCalendarEvents } from '~/hooks/use-calendar-events';
import { CalendarViewType, EventFormData, EnhancedCalendarEvent } from '~/lib/calendar-types';
import { RecurrenceRule } from '~/lib/recurrence';
import WeekView from '~/components/calendar/week-view';
import DayView from '~/components/calendar/day-view';
import AgendaView from '~/components/calendar/agenda-view';
import RecurrenceSelector from '~/components/calendar/recurrence-selector';
import CategorySelector from '~/components/calendar/category-selector';

export default function CalendarTab() {
  const { theme } = useUnistyles();
  const {
    events,
    categories,
    createEvent,
    updateEvent,
    deleteEvent,
    createCategory,
    refreshEvents,
  } = useCalendarEvents();

  const [currentView, setCurrentView] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EnhancedCalendarEvent | null>(null);

  // Enhanced event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isLecture, setIsLecture] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [eventStartTime, setEventStartTime] = useState(new Date());
  const [eventEndTime, setEventEndTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || null);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [reminders, setReminders] = useState<
    { time: number; type: 'notification' | 'email' | 'popup' }[]
  >([]);

  // Modal states
  const [isRecurrenceModalVisible, setIsRecurrenceModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isQuickAddMode, setIsQuickAddMode] = useState(true);

  useEffect(() => {
    refreshEvents();
  }, [currentDate, currentView]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories.find((c) => c.isDefault) || categories[0]);
    }
  }, [categories]);

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

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev: Date) => addMonths(prev, direction));
  };

  // Gesture handler for swipe navigation
  const handleGesture = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent;

    // Only trigger if swipe is significant enough
    if (Math.abs(translationX) > 100 && Math.abs(velocityX) > 500) {
      if (translationX > 0) {
        navigateMonth(-1); // Swipe right = previous month
      } else {
        navigateMonth(1); // Swipe left = next month
      }
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = subDays(currentDate, currentDate.getDay());
        const weekEnd = addDays(weekStart, 6);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, 'MMMM yyyy');
        }
        return `${format(weekStart, 'MMM')} - ${format(weekEnd, 'MMM yyyy')}`;
      case 'agenda':
        return 'Agenda';
      default:
        return formatDate(currentDate);
    }
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

  const todaysEvents = getEventsForDate(new Date());
  const selectedDateEvents = getEventsForDate(selectedDate);

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate = new Date(currentDate);

    switch (currentView) {
      case 'day':
        newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1);
        break;
      case 'week':
        newDate = direction === 'prev' ? subDays(currentDate, 7) : addDays(currentDate, 7);
        break;
      case 'agenda':
        newDate = direction === 'prev' ? subDays(currentDate, 30) : addDays(currentDate, 30);
        break;
      default: // month
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
        break;
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openEventModal = (event?: EnhancedCalendarEvent, date?: Date, hour?: number) => {
    if (event) {
      setEditingEvent(event);
      setEventTitle(event.title as string);
      setEventDescription((event.description as string) || '');
      setEventLocation((event.location as string) || '');
      setIsLecture(event.isLecture as boolean);
      setIsAllDay(event.isAllDay as boolean);
      setEventStartTime(new Date(event.startTime as Date));
      setEventEndTime(new Date(event.endTime as Date));
      setSelectedCategory((event.category as any) || null);
      setRecurrenceRule(event.parsedRecurrenceRule || null);
      setReminders(
        event.reminders.map((r) => ({ time: r.reminderTime, type: r.reminderType as any }))
      );
      setIsQuickAddMode(false); // Always show full form for editing
    } else {
      setEditingEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setIsLecture(false);
      setIsAllDay(false);
      setRecurrenceRule(null);
      setReminders([]);
      setIsQuickAddMode(true); // Start with quick add for new events

      const baseDate = date || selectedDate;
      const start = new Date(baseDate);
      const end = new Date(baseDate);

      if (hour !== undefined) {
        start.setHours(hour, 0, 0, 0);
        end.setHours(hour + 1, 0, 0, 0);
      } else {
        start.setHours(9, 0, 0, 0);
        end.setHours(10, 0, 0, 0);
      }

      setEventStartTime(start);
      setEventEndTime(end);
      setSelectedCategory(categories.find((c) => c.isDefault) || categories[0] || null);
    }
    setIsEventModalVisible(true);
  };

  const closeEventModal = () => {
    setIsEventModalVisible(false);
    setEditingEvent(null);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setIsQuickAddMode(true);
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEventStartTime(selectedTime);
      // Auto-adjust end time to be 1 hour later
      const newEndTime = new Date(selectedTime);
      newEndTime.setHours(selectedTime.getHours() + 1);
      setEventEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEventEndTime(selectedTime);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      const eventData: EventFormData = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        location: eventLocation.trim(),
        isLecture,
        isAllDay,
        startTime: eventStartTime,
        endTime: eventEndTime,
        categoryId: selectedCategory?.id,
        timezone: 'UTC', // Could be made configurable
        recurrenceRule: recurrenceRule || undefined,
        reminders,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id as number, eventData);
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

  const handleDeleteEvent = (event: EnhancedCalendarEvent) => {
    const deleteOptions = [];

    if (event.isRecurring) {
      deleteOptions.push(
        { text: 'This event only', onPress: () => deleteEvent(event.id as number | string) },
        {
          text: 'All recurring events',
          onPress: () => deleteEvent(event.recurrenceParentId || event.id),
        }
      );
    } else {
      deleteOptions.push({
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => deleteEvent(event.id as number | string),
      });
    }

    deleteOptions.push({ text: 'Cancel', style: 'cancel' as const });

    Alert.alert('Delete Event', `Are you sure you want to delete "${event.title}"?`, deleteOptions);
  };

  const handleStartRecording = (event: EnhancedCalendarEvent) => {
    Alert.alert('Start Recording', `Start recording for "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Recording',
        onPress: () => {
          const eventId =
            typeof event.id === 'string' && (event.id as string).includes('_')
              ? (event.id as string).split('_')[0]
              : (event.id as number).toString();
          router.navigate({
            pathname: '/record',
            params: { eventId },
          });
        },
      },
    ]);
  };

  const handleTimeSlotPress = (date: Date, hour: number) => {
    openEventModal(undefined, date, hour);
  };

  const renderViewSelector = () => {
    const views: { key: CalendarViewType; label: string; icon: string }[] = [
      { key: 'month', label: 'Month', icon: 'calendar' },
      { key: 'week', label: 'Week', icon: 'grid' },
      { key: 'day', label: 'Day', icon: 'clock' },
      { key: 'agenda', label: 'List', icon: 'list' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewSelector}>
        {views.map((view) => (
          <TouchableOpacity
            key={view.key}
            style={[styles.viewOption, currentView === view.key && styles.viewOptionSelected]}
            onPress={() => setCurrentView(view.key)}>
            <Icons.Feather
              name={view.icon as any}
              size={16}
              color={currentView === view.key ? theme.colors.white : theme.colors.typography}
            />
            <Text
              style={[
                styles.viewOptionText,
                currentView === view.key && styles.viewOptionTextSelected,
              ]}>
              {view.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventPress={openEventModal}
            onTimeSlotPress={handleTimeSlotPress}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventPress={openEventModal}
            onTimeSlotPress={handleTimeSlotPress}
            scrollToCurrentTime={true}
          />
        );
      case 'agenda':
        return (
          <AgendaView currentDate={currentDate} events={events} onEventPress={openEventModal} />
        );
      default:
        return renderMonthView();
    }
  };

  const renderMonthView = () => {
    return (
      <ScrollView style={styles.monthContent} showsVerticalScrollIndicator={false}>
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
            <TouchableOpacity onPress={() => navigateDate('prev')}>
              <Icons.Feather name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.monthTitle}>{getViewTitle()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateDate('next')}>
              <Icons.Feather name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid with Gesture Support */}
          <PanGestureHandler onHandlerStateChange={handleGesture}>
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
                      onPress={() => setSelectedDate(day)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                          {dayEvents.slice(0, 3).map((event, eventIndex) => (
                            <View
                              key={eventIndex}
                              style={[
                                styles.eventDot,
                                { backgroundColor: event.displayColor || theme.colors.primary },
                              ]}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <View style={[styles.eventDot, styles.moreEventsDot]}>
                              <Text style={styles.moreEventsText}>+</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </PanGestureHandler>
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
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Calendar</Text>
            <Text style={styles.headerSubtitle}>{getViewTitle()}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => openEventModal()}>
              <Icons.Feather name="plus" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          {/* View Selector */}
          {renderViewSelector()}
        </View>

        {/* Navigation for non-month views */}
        {currentView !== 'month' && (
          <View style={styles.navigationBar}>
            <TouchableOpacity onPress={() => navigateDate('prev')}>
              <Icons.Feather name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.navigationTitle}>{getViewTitle()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateDate('next')}>
              <Icons.Feather name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Current View */}
        {renderCurrentView()}

        {/* Enhanced Event Modal */}
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
              {/* Quick Add Toggle */}
              {!editingEvent && (
                <View style={styles.quickAddToggle}>
                  <TouchableOpacity
                    style={[styles.quickAddTab, isQuickAddMode && styles.quickAddTabActive]}
                    onPress={() => setIsQuickAddMode(true)}>
                    <Text
                      style={[
                        styles.quickAddTabText,
                        isQuickAddMode && styles.quickAddTabTextActive,
                      ]}>
                      Quick Add
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickAddTab, !isQuickAddMode && styles.quickAddTabActive]}
                    onPress={() => setIsQuickAddMode(false)}>
                    <Text
                      style={[
                        styles.quickAddTabText,
                        !isQuickAddMode && styles.quickAddTabTextActive,
                      ]}>
                      More Options
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Essential Fields (always visible) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  placeholder="Event title"
                  autoFocus
                />
              </View>

              {/* Extended fields (only in full mode or when editing) */}
              {(!isQuickAddMode || editingEvent) && (
                <>
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
                </>
              )}

              {/* Category Selection - always visible for quick categorization */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setIsCategoryModalVisible(true)}>
                  {selectedCategory ? (
                    <View style={styles.selectedCategory}>
                      <View
                        style={[
                          styles.categoryColorDot,
                          { backgroundColor: selectedCategory.color },
                        ]}
                      />
                      <Text style={styles.selectedCategoryText}>{selectedCategory.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.categorySelectorPlaceholder}>Select category</Text>
                  )}
                  <Icons.Feather name="chevron-right" size={16} color={theme.colors.limedSpruce} />
                </TouchableOpacity>
              </View>

              {/* All Day Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>All day</Text>
                  <Switch
                    value={isAllDay}
                    onValueChange={setIsAllDay}
                    trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
                  />
                </View>
              </View>

              {/* Time Selection - only show if not all day */}
              {!isAllDay && (
                <View style={styles.timeSection}>
                  <View style={styles.timeRow}>
                    <Text style={styles.formLabel}>Start</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowStartTimePicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTime(eventStartTime)}</Text>
                      <Icons.Feather name="clock" size={16} color={theme.colors.limedSpruce} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.formLabel}>End</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => setShowEndTimePicker(true)}>
                      <Text style={styles.timeButtonText}>{formatTime(eventEndTime)}</Text>
                      <Icons.Feather name="clock" size={16} color={theme.colors.limedSpruce} />
                    </TouchableOpacity>
                  </View>

                  {/* Date/Time Pickers */}
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={eventStartTime}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                    />
                  )}
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={eventEndTime}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                    />
                  )}
                </View>
              )}

              {/* Advanced options (only in full mode or when editing) */}
              {(!isQuickAddMode || editingEvent) && (
                <>
                  {/* Recurrence */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Repeat</Text>
                    <TouchableOpacity
                      style={styles.recurrenceSelector}
                      onPress={() => setIsRecurrenceModalVisible(true)}>
                      <Text
                        style={
                          recurrenceRule
                            ? styles.recurrenceSelectorText
                            : styles.recurrenceSelectorPlaceholder
                        }>
                        {recurrenceRule
                          ? `Repeats ${recurrenceRule.frequency.toLowerCase()}`
                          : 'Does not repeat'}
                      </Text>
                      <Icons.Feather
                        name="chevron-right"
                        size={16}
                        color={theme.colors.limedSpruce}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Lecture Toggle - always visible for quick access */}
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

        {/* Recurrence Selector Modal */}
        <RecurrenceSelector
          visible={isRecurrenceModalVisible}
          onClose={() => setIsRecurrenceModalVisible(false)}
          onSelect={setRecurrenceRule}
          initialRule={recurrenceRule}
        />

        {/* Category Selector Modal */}
        <CategorySelector
          visible={isCategoryModalVisible}
          onClose={() => setIsCategoryModalVisible(false)}
          onSelect={(category: any) => setSelectedCategory(category)}
          categories={categories}
          selectedCategory={selectedCategory}
          onCreateCategory={createCategory}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.typography,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.limedSpruce,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  todayButton: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: theme.spacing(2),
  },
  todayButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing(2),
    borderRadius: theme.spacing(4),
  },
  viewSelector: {
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    marginRight: theme.spacing(2),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
    gap: theme.spacing(1),
  },
  viewOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.typography,
  },
  viewOptionTextSelected: {
    color: theme.colors.white,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.typography,
  },
  monthContent: {
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
    minHeight: 44, // Ensure minimum 44pt touch target
    borderRadius: theme.spacing(2),
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  moreEventsDot: {
    backgroundColor: theme.colors.limedSpruce,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreEventsText: {
    fontSize: 8,
    color: theme.colors.white,
    fontWeight: '600',
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
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedCategoryText: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  timeSection: {
    gap: theme.spacing(3),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44, // Ensure minimum touch target
  },
  timeButtonText: {
    fontSize: 16,
    color: theme.colors.typography,
    fontWeight: '500',
  },
  recurrenceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing(2),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recurrenceSelectorText: {
    fontSize: 16,
    color: theme.colors.typography,
  },
  recurrenceSelectorPlaceholder: {
    fontSize: 16,
    color: theme.colors.limedSpruce,
  },
  quickAddToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(2),
    padding: theme.spacing(1),
    marginBottom: theme.spacing(4),
  },
  quickAddTab: {
    flex: 1,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.spacing(1.5),
    alignItems: 'center',
  },
  quickAddTabActive: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickAddTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.limedSpruce,
  },
  quickAddTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
}));
