import { useState, useEffect } from 'react';
import { eq, desc } from 'drizzle-orm';
import { useDrizzleDb } from './use-drizzle';
import * as schema from '~/db/schema';

export type CalendarEventWithDetails = schema.CalendarEvent & {
  recordings: schema.Recording[];
};

// Calendar events hook
export const useCalendarEvents = () => {
  const drizzleDb = useDrizzleDb();
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const eventsData = await drizzleDb.query.calendarEvents.findMany({
        with: {
          recordings: true,
        },
        orderBy: [desc(schema.calendarEvents.startTime)],
      });
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    location?: string;
    isLecture: boolean;
    startTime: Date;
    endTime: Date;
  }) => {
    try {
      const newEvent = await drizzleDb
        .insert(schema.calendarEvents)
        .values({
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          isLecture: eventData.isLecture,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await loadEvents(); // Refresh the list
      return newEvent[0];
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const updateEvent = async (
    id: number,
    updates: {
      title?: string;
      description?: string;
      location?: string;
      isLecture?: boolean;
      startTime?: Date;
      endTime?: Date;
    }
  ) => {
    try {
      await drizzleDb
        .update(schema.calendarEvents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.calendarEvents.id, id));

      await loadEvents(); // Refresh the list
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  const deleteEvent = async (id: number) => {
    try {
      await drizzleDb.delete(schema.calendarEvents).where(eq(schema.calendarEvents.id, id));
      await loadEvents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  };

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: loadEvents,
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
