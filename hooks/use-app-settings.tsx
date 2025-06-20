import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as schema from '~/db/schema';
import { useDrizzleDb } from './use-drizzle';

export const useAppSettings = () => {
  const drizzleDb = useDrizzleDb();

  const data = useLiveQuery(
    drizzleDb.query.appSettings.findFirst({
      where: eq(schema.appSettings.id, 1),
    })
  );

  return data;
};
