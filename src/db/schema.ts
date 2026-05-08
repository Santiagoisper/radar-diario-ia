import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Snapshot JSON alineado con RadarAppData (serializable). PK compuesta para upsert simple. */
export const radarSnapshots = pgTable(
  "radar_snapshots",
  {
    runDate: text("run_date").notNull(),
    mode: text("mode").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.runDate, t.mode] }),
  }),
);
