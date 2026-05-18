import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./core/lib/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
