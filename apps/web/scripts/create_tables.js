const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '../../.env' }); // Load root .env

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  await sql`
    CREATE TABLE IF NOT EXISTS activity_feed (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS af_user_time_idx ON activity_feed (user_id, created_at);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS af_time_idx ON activity_feed (created_at);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_reports (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      anilist_id INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      issue_type TEXT NOT NULL,
      player_error TEXT,
      video_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS search_analytics (
      id SERIAL PRIMARY KEY,
      query TEXT NOT NULL,
      results_count INTEGER NOT NULL,
      user_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  console.log("Tables created successfully");
}

main().catch(console.error);