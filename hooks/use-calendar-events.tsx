import { useState, useEffect, useMemo } from 'react';
import { eq, desc, and, gte, lte, isNull, or } from 'drizzle-orm';
import { useDrizzleDb } from './use-drizzle';
import * as schema from '~/db/schema';
import {
  EnhancedCalendarEvent,
  EventFormData,
  DEFAULT_EVENT_CATEGORIES,
} from '~/lib/calendar-types';
import { parseRecurrenceRule, expandRecurrence, stringifyRecurrenceRule } from '~/lib/recurrence';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

export type CalendarEventWithDetails = schema.CalendarEvent & {
  recordings: schema.Recording[];
  category?: schema.EventCategory | null;
  reminders: schema.EventReminder[];
  recurrenceInstances?: schema.CalendarEvent[];
};

// Calendar events hook
export const useCalendarEvents = () => {
  const drizzleDb = useDrizzleDb();
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([]);
  const [categories, setCategories] = useState<schema.EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadEvents = async (month?: Date) => {
    setIsLoading(true);
    try {
      const searchMonth = month || currentMonth;
      const monthStart = startOfMonth(searchMonth);
      const monthEnd = endOfMonth(addMonths(searchMonth, 2)); // Load 3 months for better UX

      const eventsData = await drizzleDb.query.calendarEvents.findMany({
        with: {
          recordings: true,
          category: true,
          reminders: true,
          recurrenceInstances: true,
        },
        where: or(
          // Regular events within date range
          and(
            gte(schema.calendarEvents.startTime, monthStart),
            lte(schema.calendarEvents.startTime, monthEnd),
            isNull(schema.calendarEvents.recurrenceParentId)
          ),
          // Master recurring events (regardless of date)
          and(
            isNull(schema.calendarEvents.recurrenceParentId),
            schema.calendarEvents.recurrenceRule
          )
        ),
        orderBy: [desc(schema.calendarEvents.startTime)],
      });

      // Expand recurring events
      const expandedEvents: CalendarEventWithDetails[] = [];

      for (const event of eventsData) {
        if (event.recurrenceRule && !event.recurrenceParentId) {
          // This is a master recurring event
          const rule = parseRecurrenceRule(event.recurrenceRule);
          if (rule) {
            const instances = expandRecurrence(
              event.startTime,
              event.endTime,
              rule,
              monthStart,
              monthEnd
            );

            // Add each instance as a separate event
            instances.forEach((instance, index) => {
              if (index === 0) {
                // First instance is the original event
                expandedEvents.push(event);
              } else {
                // Create virtual instances
                const duration = event.endTime.getTime() - event.startTime.getTime();
                expandedEvents.push({
                  ...event,
                  id: `${event.id}_${instance.date.getTime()}` as any, // Virtual ID
                  startTime: instance.date,
                  endTime: new Date(instance.date.getTime() + duration),
                  recurrenceDate: instance.date,
                });
              }
            });
          } else {
            expandedEvents.push(event);
          }
        } else {
          expandedEvents.push(event);
        }
      }

      setEvents(expandedEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      let categoriesData = await drizzleDb.query.eventCategories.findMany({
        orderBy: [desc(schema.eventCategories.isDefault), schema.eventCategories.name],
      });

      // If no categories exist, create default ones
      if (categoriesData.length === 0) {
        await createDefaultCategories();
        categoriesData = await drizzleDb.query.eventCategories.findMany({
          orderBy: [desc(schema.eventCategories.isDefault), schema.eventCategories.name],
        });
      }

      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const createDefaultCategories = async () => {
    try {
      for (const category of DEFAULT_EVENT_CATEGORIES) {
        await drizzleDb.insert(schema.eventCategories).values({
          ...category,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  useEffect(() => {
    loadEvents();
    loadCategories();
  }, [currentMonth]);

  const createEvent = async (eventData: EventFormData) => {
    try {
      const newEvent = await drizzleDb
        .insert(schema.calendarEvents)
        .values({
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          isLecture: eventData.isLecture,
          isAllDay: eventData.isAllDay,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          categoryId: eventData.categoryId || null,
          timezone: eventData.timezone,
          recurrenceRule: eventData.recurrenceRule
            ? stringifyRecurrenceRule(eventData.recurrenceRule)
            : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add reminders if specified
      if (eventData.reminders && eventData.reminders.length > 0) {
        for (const reminder of eventData.reminders) {
          await drizzleDb.insert(schema.eventReminders).values({
            eventId: (newEvent as any[])[0].id,
            reminderTime: reminder.time,
            reminderType: reminder.type,
            createdAt: new Date(),
          });
        }
      }

      await loadEvents(); // Refresh the list
      return (newEvent as any[])[0];
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const updateEvent = async (id: number | string, updates: Partial<EventFormData>) => {
    try {
      // Handle virtual recurring event IDs
      const eventId =
        typeof id === 'string' && id.includes('_') ? parseInt(id.split('_')[0]) : Number(id);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.location !== undefined) updateData.location = updates.location || null;
      if (updates.isLecture !== undefined) updateData.isLecture = updates.isLecture;
      if (updates.isAllDay !== undefined) updateData.isAllDay = updates.isAllDay;
      if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
      if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
      if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId || null;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
      if (updates.recurrenceRule !== undefined) {
        updateData.recurrenceRule = updates.recurrenceRule
          ? stringifyRecurrenceRule(updates.recurrenceRule)
          : null;
      }

      await drizzleDb
        .update(schema.calendarEvents)
        .set(updateData)
        .where(eq(schema.calendarEvents.id, eventId));

      await loadEvents(); // Refresh the list
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  const deleteEvent = async (id: number | string) => {
    try {
      // Handle virtual recurring event IDs
      const eventId =
        typeof id === 'string' && id.includes('_') ? parseInt(id.split('_')[0]) : Number(id);

      await drizzleDb.delete(schema.calendarEvents).where(eq(schema.calendarEvents.id, eventId));
      await loadEvents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  };

  const createCategory = async (
    categoryData: Omit<schema.EventCategory, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await drizzleDb.insert(schema.eventCategories).values({
        ...categoryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: number, updates: Partial<schema.EventCategory>) => {
    try {
      await drizzleDb
        .update(schema.eventCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.eventCategories.id, id));
      await loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await drizzleDb.delete(schema.eventCategories).where(eq(schema.eventCategories.id, id));
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Convert events to enhanced format
  const enhancedEvents: EnhancedCalendarEvent[] = useMemo(() => {
    return events.map((event) => {
      const category = event.category || categories.find((c) => c.id === event.categoryId);
      const parsedRecurrenceRule = event.recurrenceRule
        ? parseRecurrenceRule(event.recurrenceRule)
        : null;
      const duration = Math.floor(
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)
      );

      return {
        ...event,
        category,
        reminders: event.reminders || [],
        recurrenceInstances: event.recurrenceInstances || [],
        parsedRecurrenceRule: parsedRecurrenceRule || undefined,
        isRecurring: !!event.recurrenceRule,
        duration,
        displayColor: category?.color || '#3B82F6',
        displayIcon: category?.icon || undefined,
      };
    });
  }, [events, categories]);

  return {
    events: enhancedEvents,
    categories,
    isLoading,
    currentMonth,
    setCurrentMonth,
    createEvent,
    updateEvent,
    deleteEvent,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshEvents: () => loadEvents(currentMonth),
    loadEventsForMonth: loadEvents,
  };
};

// Hook for a single calendar event with full details
export const useCalendarEvent = (eventId: number) => {
  const drizzleDb = useDrizzleDb();
  const [event, setEvent] = useState<CalendarEventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvent = async () => {
    setIsLoading(true);
    try {
      const eventData = await drizzleDb.query.calendarEvents.findFirst({
        where: eq(schema.calendarEvents.id, eventId),
        with: {
          recordings: true,
          category: true,
          reminders: true,
          recurrenceInstances: true,
        },
      });

      setEvent(eventData || null);
    } catch (error) {
      console.error('Error loading calendar event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  return {
    event,
    isLoading,
    refreshEvent: loadEvent,
  };
};
