import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!_db) {
    const dbUrl = process.env.DATABASE_URL || "postgres://dummy:dummy@ep-dummy-123456.us-east-2.aws.neon.tech/neondb";
    const sql = neon(dbUrl);
    _db = drizzle(sql, { schema });
  }
  return _db!;
};
