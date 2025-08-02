import { useState, useEffect } from 'react';
import { eq, desc, and } from 'drizzle-orm';
import { useDrizzleDb } from './use-drizzle';
import * as schema from '~/db/schema';

export type RecordingWithDetails = schema.Recording & {
  folder?: schema.Folder | null;
  transcripts: schema.Transcript[];
  summaries: schema.Summary[];
};

export type FolderWithRecordings = schema.Folder & {
  recordings: schema.Recording[];
};

// Folders hook
export const useFolders = () => {
  const drizzleDb = useDrizzleDb();
  const [folders, setFolders] = useState<FolderWithRecordings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const foldersData = await drizzleDb.query.folders.findMany({
        with: {
          recordings: true,
        },
        orderBy: [desc(schema.folders.updatedAt)],
      });
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const createFolder = async (name: string) => {
    try {
      const newFolder = await drizzleDb
        .insert(schema.folders)
        .values({
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await loadFolders(); // Refresh the list
      return newFolder[0];
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const updateFolder = async (id: number, name: string) => {
    try {
      await drizzleDb
        .update(schema.folders)
        .set({
          name,
          updatedAt: new Date(),
        })
        .where(eq(schema.folders.id, id));

      await loadFolders(); // Refresh the list
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (id: number) => {
    try {
      await drizzleDb.delete(schema.folders).where(eq(schema.folders.id, id));
      await loadFolders(); // Refresh the list
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  return {
    folders,
    isLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    refreshFolders: loadFolders,
  };
};

// Recordings hook
export const useRecordings = (folderId?: number) => {
  const drizzleDb = useDrizzleDb();
  const [recordings, setRecordings] = useState<RecordingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecordings = async () => {
    setIsLoading(true);
    try {
      const whereClause = folderId ? eq(schema.recordings.folderId, folderId) : undefined;

      const recordingsData = await drizzleDb.query.recordings.findMany({
        where: whereClause,
        with: {
          folder: true,
          transcripts: {
            orderBy: [desc(schema.transcripts.createdAt)],
          },
          summaries: {
            orderBy: [desc(schema.summaries.createdAt)],
          },
        },
        orderBy: [desc(schema.recordings.updatedAt)],
      });

      setRecordings(recordingsData);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [folderId]);

  const createRecording = async (name: string, folderId?: number) => {
    try {
      const newRecording = await drizzleDb
        .insert(schema.recordings)
        .values({
          name,
          folderId: folderId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await loadRecordings(); // Refresh the list
      return newRecording[0];
    } catch (error) {
      console.error('Error creating recording:', error);
      throw error;
    }
  };

  const updateRecording = async (
    id: number,
    updates: { name?: string; folderId?: number | null }
  ) => {
    try {
      await drizzleDb
        .update(schema.recordings)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.recordings.id, id));

      await loadRecordings(); // Refresh the list
    } catch (error) {
      console.error('Error updating recording:', error);
      throw error;
    }
  };

  const deleteRecording = async (id: number) => {
    try {
      await drizzleDb.delete(schema.recordings).where(eq(schema.recordings.id, id));
      await loadRecordings(); // Refresh the list
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  };

  const addTranscript = async (recordingId: number, text: string) => {
    try {
      const newTranscript = await drizzleDb
        .insert(schema.transcripts)
        .values({
          recordingId,
          text,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update recording's updatedAt timestamp
      await drizzleDb
        .update(schema.recordings)
        .set({ updatedAt: new Date() })
        .where(eq(schema.recordings.id, recordingId));

      await loadRecordings(); // Refresh the list
      return newTranscript[0];
    } catch (error) {
      console.error('Error adding transcript:', error);
      throw error;
    }
  };

  const addSummary = async (recordingId: number, text: string) => {
    try {
      const newSummary = await drizzleDb
        .insert(schema.summaries)
        .values({
          recordingId,
          text,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update recording's updatedAt timestamp
      await drizzleDb
        .update(schema.recordings)
        .set({ updatedAt: new Date() })
        .where(eq(schema.recordings.id, recordingId));

      await loadRecordings(); // Refresh the list
      return newSummary[0];
    } catch (error) {
      console.error('Error adding summary:', error);
      throw error;
    }
  };

  return {
    recordings,
    isLoading,
    createRecording,
    updateRecording,
    deleteRecording,
    addTranscript,
    addSummary,
    refreshRecordings: loadRecordings,
  };
};

// Hook for a single recording with full details
export const useRecording = (recordingId: number) => {
  const drizzleDb = useDrizzleDb();
  const [recording, setRecording] = useState<RecordingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecording = async () => {
    setIsLoading(true);
    try {
      const recordingData = await drizzleDb.query.recordings.findFirst({
        where: eq(schema.recordings.id, recordingId),
        with: {
          folder: true,
          transcripts: {
            orderBy: [desc(schema.transcripts.createdAt)],
          },
          summaries: {
            orderBy: [desc(schema.summaries.createdAt)],
          },
        },
      });

      setRecording(recordingData || null);
    } catch (error) {
      console.error('Error loading recording:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (recordingId) {
      loadRecording();
    }
  }, [recordingId]);

  return {
    recording,
    isLoading,
    refreshRecording: loadRecording,
  };
};
