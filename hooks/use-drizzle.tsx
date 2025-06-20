import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from '~/db/schema';

export const useDrizzleDb = () => {
  const db = SQLite.useSQLiteContext();
  const drizzleDb = drizzle(db, { schema });

  return drizzleDb;
};
