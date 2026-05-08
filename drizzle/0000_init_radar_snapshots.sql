CREATE TABLE IF NOT EXISTS "radar_snapshots" (
	"run_date" text NOT NULL,
	"mode" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now(),
	CONSTRAINT "radar_snapshots_run_date_mode_pk" PRIMARY KEY("run_date","mode")
);
