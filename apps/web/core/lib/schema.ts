import { pgTable, text, integer, timestamp, boolean, serial, unique, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" })
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt")
});

export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  animeSlug: text("animeSlug").notNull(),
  episode: integer("episode").notNull(),
  timestampSec: integer("timestampSec").notNull().default(0),
  durationSec: integer("durationSec").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  updatedAt: timestamp("updatedAt").notNull()
}, (table) => ({
  unq: unique().on(table.userId, table.animeSlug, table.episode),
  userUpdatedAtIdx: index("wh_user_updated_at_idx").on(table.userId, table.updatedAt),
  userSlugEpisodeIdx: index("wh_user_slug_ep_idx").on(table.userId, table.animeSlug, table.episode),
  userCompletedIdx: index("wh_user_completed_idx").on(table.userId, table.completed, table.updatedAt),
}));

// ── Gamification (Edge Synced) ──

export const userProgression = pgTable("user_progression", {
	userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
	level: integer("level").default(1),
	totalExp: integer("total_exp").default(0),
	currentTitleId: integer("current_title_id"), // Reference to titles table on backend
	updatedAt: timestamp("updatedAt").notNull()
});

export const userReputation = pgTable("user_reputation", {
	userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
	score: integer("score").default(0),
	updatedAt: timestamp("updatedAt").notNull()
});

export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'liked_episode', 'completed_anime', 'earned_title', etc.
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userTimeIdx: index("af_user_time_idx").on(table.userId, table.createdAt),
  timeIdx: index("af_time_idx").on(table.createdAt),
}));

export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  anilistId: integer("anilist_id").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  issueType: text("issue_type").notNull(),
  playerError: text("player_error"),
  videoUrl: text("video_url"),
  status: text("status").notNull().default('pending'), // 'pending', 'resolved', 'ignored'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  resultsCount: integer("results_count").notNull(),
  userId: text("user_id"), // Optional
  createdAt: timestamp("created_at").notNull().defaultNow(),
});