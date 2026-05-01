import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const getDb = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[getDb] DATABASE_URL is missing! Using dummy connection.");
    return drizzle(neon("postgres://dummy:dummy@ep-dummy-123456.us-east-2.aws.neon.tech/neondb"), { schema });
  }
  
  // Create a fresh connection on each request to prevent stale Cloudflare Edge environment variable caching
  return drizzle(neon(dbUrl), { schema });
};
