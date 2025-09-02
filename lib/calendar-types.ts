import { CalendarEvent, EventCategory, EventReminder, CalendarSettings } from '~/db/schema';
import { RecurrenceRule, RecurrenceInstance } from './recurrence';

// Enhanced calendar event types with computed properties
export interface EnhancedCalendarEvent extends CalendarEvent {
  category?: EventCategory;
  reminders: EventReminder[];
  recurrenceInstances?: CalendarEvent[];
  parsedRecurrenceRule?: RecurrenceRule;
  isRecurring: boolean;
  duration: number; // in minutes
  displayColor: string;
  displayIcon?: string;
}

// Calendar view types
export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda';

// Event form data structure
export interface EventFormData {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  isLecture: boolean;
  categoryId?: number;
  timezone: string;
  recurrenceRule?: RecurrenceRule;
  reminders: {
    time: number; // minutes before event
    type: 'notification' | 'email' | 'popup';
  }[];
}

// Calendar event with position information for rendering
export interface PositionedEvent extends EnhancedCalendarEvent {
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
  column?: number;
  totalColumns?: number;
}

// Time slot structure for week/day views
export interface TimeSlot {
  time: Date;
  hour: number;
  minute: number;
  events: PositionedEvent[];
  isWorkingHour: boolean;
  isCurrentTime?: boolean;
}

// Week structure for week view
export interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  days: {
    date: Date;
    isToday: boolean;
    isCurrentMonth: boolean;
    events: PositionedEvent[];
    timeSlots: TimeSlot[];
  }[];
}

// Month structure for month view
export interface MonthData {
  monthStart: Date;
  monthEnd: Date;
  weeks: {
    weekStart: Date;
    days: {
      date: Date | null;
      isToday: boolean;
      isCurrentMonth: boolean;
      events: EnhancedCalendarEvent[];
      hasMoreEvents: boolean;
      eventCount: number;
    }[];
  }[];
}

// Day structure for day view
export interface DayData {
  date: Date;
  isToday: boolean;
  allDayEvents: PositionedEvent[];
  timeSlots: TimeSlot[];
  workingHoursStart: number;
  workingHoursEnd: number;
}

// Agenda item for agenda view
export interface AgendaItem {
  date: Date;
  events: EnhancedCalendarEvent[];
  isToday: boolean;
  dateLabel: string;
}

// Default event categories
export const DEFAULT_EVENT_CATEGORIES: Omit<EventCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Study', color: '#3B82F6', icon: 'book', isDefault: true },
  { name: 'Lecture', color: '#10B981', icon: 'graduation-cap', isDefault: true },
  { name: 'Assignment', color: '#F59E0B', icon: 'clipboard', isDefault: true },
  { name: 'Exam', color: '#EF4444', icon: 'alert-circle', isDefault: true },
  { name: 'Meeting', color: '#8B5CF6', icon: 'users', isDefault: true },
  { name: 'Personal', color: '#06B6D4', icon: 'user', isDefault: true },
  { name: 'Break', color: '#84CC16', icon: 'coffee', isDefault: true },
];

// Default reminder times (in minutes before event)
export const DEFAULT_REMINDER_TIMES = [
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 },
];

// Calendar preferences
export interface CalendarPreferences {
  defaultView: CalendarViewType;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "17:00"
  timeFormat: '12h' | '24h';
  showWeekNumbers: boolean;
  defaultEventDuration: number; // minutes
  defaultReminders: number[]; // array of minutes before event
}

// Event conflict detection
export interface EventConflict {
  event1: EnhancedCalendarEvent;
  event2: EnhancedCalendarEvent;
  overlapStart: Date;
  overlapEnd: Date;
  overlapDuration: number; // minutes
}

// Search and filter options
export interface EventSearchOptions {
  query?: string;
  categoryIds?: number[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  isLecture?: boolean;
  hasRecording?: boolean;
}

// Calendar state for context
export interface CalendarState {
  currentView: CalendarViewType;
  currentDate: Date;
  selectedDate: Date;
  selectedEvent?: EnhancedCalendarEvent;
  isEventModalVisible: boolean;
  isEditingEvent: boolean;
  preferences: CalendarPreferences;
  categories: EventCategory[];
  events: EnhancedCalendarEvent[];
  isLoading: boolean;
  searchQuery: string;
  filterOptions: EventSearchOptions;
}

// Calendar actions
export interface CalendarActions {
  // Navigation
  setCurrentView: (view: CalendarViewType) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date) => void;
  navigateToToday: () => void;
  navigateToPrevious: () => void;
  navigateToNext: () => void;

  // Events
  createEvent: (eventData: EventFormData) => Promise<void>;
  updateEvent: (eventId: number, updates: Partial<EventFormData>) => Promise<void>;
  deleteEvent: (eventId: number, deleteRecurring?: 'single' | 'all' | 'future') => Promise<void>;
  duplicateEvent: (eventId: number) => Promise<void>;

  // Recurrence
  updateRecurringSeries: (parentId: number, updates: Partial<EventFormData>) => Promise<void>;
  createRecurrenceException: (eventId: number, exceptionDate: Date) => Promise<void>;

  // Categories
  createCategory: (
    category: Omit<EventCategory, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateCategory: (categoryId: number, updates: Partial<EventCategory>) => Promise<void>;
  deleteCategory: (categoryId: number) => Promise<void>;

  // Reminders
  addReminder: (
    eventId: number,
    reminder: Omit<EventReminder, 'id' | 'eventId' | 'createdAt'>
  ) => Promise<void>;
  removeReminder: (reminderId: number) => Promise<void>;

  // Search and filter
  setSearchQuery: (query: string) => void;
  setFilterOptions: (options: EventSearchOptions) => void;
  searchEvents: (options: EventSearchOptions) => Promise<EnhancedCalendarEvent[]>;

  // Modal state
  openEventModal: (event?: EnhancedCalendarEvent) => void;
  closeEventModal: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<void>;

  // Refresh
  refreshEvents: () => Promise<void>;
}

// Time formatting utilities
export const TimeFormatUtils = {
  formatTime: (date: Date, format: '12h' | '24h' = '12h'): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: format === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12: format === '12h',
    }).format(date);
  },

  formatDate: (date: Date, includeYear: boolean = false): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: includeYear ? 'numeric' : undefined,
    }).format(date);
  },

  formatDateShort: (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  },

  formatDateRange: (start: Date, end: Date): string => {
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
      return TimeFormatUtils.formatDate(start);
    }

    const sameMonth =
      start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      return `${start.getDate()} - ${TimeFormatUtils.formatDate(end)}`;
    }

    return `${TimeFormatUtils.formatDateShort(start)} - ${TimeFormatUtils.formatDateShort(end)}`;
  },

  getDurationString: (start: Date, end: Date): string => {
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  },
};
