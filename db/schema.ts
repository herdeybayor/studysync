import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1).notNull(), // Fixed ID to ensure single entry
  firstName: text('first_name'),
  lastName: text('last_name'),
  username: text('username'),
  preferences: text('preferences', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const folders = sqliteTable('folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const eventCategories = sqliteTable('event_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(), // Hex color code
  icon: text('icon'), // Icon name from icon library
  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false).notNull(),
  isLecture: integer('is_lecture', { mode: 'boolean' }).default(false).notNull(),
  location: text('location'),
  categoryId: integer('category_id').references(() => eventCategories.id, { onDelete: 'set null' }),
  timezone: text('timezone').default('UTC'),

  // Recurrence fields
  recurrenceRule: text('recurrence_rule'), // RRULE string format
  recurrenceParentId: integer('recurrence_parent_id').references((): any => calendarEvents.id, {
    onDelete: 'cascade',
  }),
  recurrenceDate: integer('recurrence_date', { mode: 'timestamp' }), // For recurring instances
  isRecurrenceException: integer('is_recurrence_exception', { mode: 'boolean' })
    .default(false)
    .notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const eventReminders = sqliteTable('event_reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').references(() => calendarEvents.id, { onDelete: 'cascade' }),
  reminderTime: integer('reminder_time').notNull(), // Minutes before event
  reminderType: text('reminder_type').notNull(), // 'notification', 'email', 'popup'
  isTriggered: integer('is_triggered', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const calendarSettings = sqliteTable('calendar_settings', {
  id: integer('id').primaryKey().default(1).notNull(), // Single settings record
  defaultView: text('default_view').default('month').notNull(), // 'month', 'week', 'day', 'agenda'
  weekStartsOn: integer('week_starts_on').default(0).notNull(), // 0 = Sunday, 1 = Monday
  workingHoursStart: text('working_hours_start').default('09:00').notNull(),
  workingHoursEnd: text('working_hours_end').default('17:00').notNull(),
  defaultEventDuration: integer('default_event_duration').default(60).notNull(), // Minutes
  showWeekNumbers: integer('show_week_numbers', { mode: 'boolean' }).default(false).notNull(),
  defaultReminders: text('default_reminders', { mode: 'json' }), // Array of reminder times
  timeFormat: text('time_format').default('12h').notNull(), // '12h' or '24h'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const recordings = sqliteTable('recordings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folderId: integer('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
  calendarEventId: integer('calendar_event_id').references(() => calendarEvents.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  audioFilePath: text('audio_file_path'),
  duration: integer('duration'), // Duration in seconds
  fileSize: integer('file_size'), // File size in bytes
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const transcripts = sqliteTable('transcripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordingId: integer('recording_id').references(() => recordings.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const summaries = sqliteTable('summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordingId: integer('recording_id').references(() => recordings.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Types
 */

export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type EventCategory = typeof eventCategories.$inferSelect;
export type NewEventCategory = typeof eventCategories.$inferInsert;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

export type EventReminder = typeof eventReminders.$inferSelect;
export type NewEventReminder = typeof eventReminders.$inferInsert;

export type CalendarSettings = typeof calendarSettings.$inferSelect;
export type NewCalendarSettings = typeof calendarSettings.$inferInsert;

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;

/**
 * Relations
 */

export const folderRelations = relations(folders, ({ many }) => ({
  recordings: many(recordings),
}));

export const eventCategoriesRelations = relations(eventCategories, ({ many }) => ({
  events: many(calendarEvents),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one, many }) => ({
  recordings: many(recordings),
  category: one(eventCategories, {
    fields: [calendarEvents.categoryId],
    references: [eventCategories.id],
  }),
  reminders: many(eventReminders),
  recurrenceParent: one(calendarEvents, {
    fields: [calendarEvents.recurrenceParentId],
    references: [calendarEvents.id],
    relationName: 'recurrenceParent',
  }),
  recurrenceInstances: many(calendarEvents, {
    relationName: 'recurrenceParent',
  }),
}));

export const eventRemindersRelations = relations(eventReminders, ({ one }) => ({
  event: one(calendarEvents, {
    fields: [eventReminders.eventId],
    references: [calendarEvents.id],
  }),
}));

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  folder: one(folders, {
    fields: [recordings.folderId],
    references: [folders.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [recordings.calendarEventId],
    references: [calendarEvents.id],
  }),
  transcripts: many(transcripts),
  summaries: many(summaries),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  recording: one(recordings, {
    fields: [transcripts.recordingId],
    references: [recordings.id],
  }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  recording: one(recordings, {
    fields: [summaries.recordingId],
    references: [recordings.id],
  }),
}));
