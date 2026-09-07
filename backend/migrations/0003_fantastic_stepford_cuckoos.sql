CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"randomization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"randomization_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "focus_sessions_duration_check" CHECK ("focus_sessions"."duration_seconds" between 60 and 14400),
	CONSTRAINT "focus_sessions_dates_check" CHECK ("focus_sessions"."ends_at" > "focus_sessions"."started_at"),
	CONSTRAINT "focus_sessions_status_check" CHECK ("focus_sessions"."status" in ('active', 'completed', 'abandoned')),
	CONSTRAINT "focus_sessions_finished_at_check" CHECK (("focus_sessions"."status" = 'active' and "focus_sessions"."finished_at" is null) or ("focus_sessions"."status" in ('completed', 'abandoned') and "focus_sessions"."finished_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "focus_sessions_randomization_index" ON "focus_sessions" USING btree ("randomization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "focus_sessions_active_user_index" ON "focus_sessions" USING btree ("user_id") WHERE "focus_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "focus_sessions_active_ends_at_index" ON "focus_sessions" USING btree ("ends_at") WHERE "focus_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "focus_sessions_active_last_seen_at_index" ON "focus_sessions" USING btree ("last_seen_at") WHERE "focus_sessions"."status" = 'active';