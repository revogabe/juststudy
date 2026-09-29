ALTER TABLE "score_events" ADD COLUMN "score_before" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD COLUMN "score_after" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_score_before_check" CHECK ("score_events"."score_before" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_score_after_check" CHECK ("score_events"."score_after" between 0 and 1000);