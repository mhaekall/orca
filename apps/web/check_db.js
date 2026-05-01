import { neon } from '@neondatabase/serverless';

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const result = await sql`SELECT 1 as "ok"`;
    console.log("DB Connection OK:", result);
  } catch (e) {
    console.error("DB Error:", e);
  }
}
check().catch(console.error);