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

export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  isLecture: integer('is_lecture', { mode: 'boolean' }).default(false).notNull(),
  location: text('location'),
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

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

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

export const calendarEventsRelations = relations(calendarEvents, ({ many }) => ({
  recordings: many(recordings),
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
