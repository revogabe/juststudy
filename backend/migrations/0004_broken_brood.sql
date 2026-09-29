CREATE TABLE "feedback_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"focus_session_id" uuid NOT NULL,
	"randomization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"subject_slug" text NOT NULL,
	"subject_name" text NOT NULL,
	"topic_slug" text NOT NULL,
	"topic_name" text NOT NULL,
	"topic_level" text NOT NULL,
	"assessment_context" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"recording_ends_at" timestamp with time zone NOT NULL,
	"upload_ends_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"transcript" jsonb,
	"evaluation_id" uuid,
	"evaluation" jsonb,
	"evaluation_provider" text,
	"evaluation_model" text,
	"prompt_version" text,
	"schema_version" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"estimated_cost_usd" double precision,
	"evaluation_latency_ms" integer,
	"score_before" integer,
	"score_after" integer,
	"score_algorithm_version" text,
	"process_attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"error_code" text,
	"usage_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "feedback_sessions_status_check" CHECK ("feedback_sessions"."status" in ('active', 'pending', 'completed', 'failed', 'expired')),
	CONSTRAINT "feedback_sessions_deadlines_check" CHECK ("feedback_sessions"."recording_ends_at" > "feedback_sessions"."started_at" and "feedback_sessions"."upload_ends_at" > "feedback_sessions"."recording_ends_at"),
	CONSTRAINT "feedback_sessions_transcript_check" CHECK (("feedback_sessions"."status" in ('pending', 'completed', 'failed') and "feedback_sessions"."transcript" is not null and "feedback_sessions"."submitted_at" is not null) or ("feedback_sessions"."status" in ('active', 'expired')))
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"feedback_session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"subject_slug" text NOT NULL,
	"topic_slug" text NOT NULL,
	"topic_level" text NOT NULL,
	"mastery" integer NOT NULL,
	"mastery_band" integer NOT NULL,
	"factual_accuracy" integer NOT NULL,
	"has_critical_misconception" boolean NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"algorithm_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_events_mastery_check" CHECK ("score_events"."mastery" between 0 and 100),
	CONSTRAINT "score_events_mastery_band_check" CHECK ("score_events"."mastery_band" between 0 and 4),
	CONSTRAINT "score_events_accuracy_check" CHECK ("score_events"."factual_accuracy" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "subject_scores" (
	"user_id" text NOT NULL,
	"subject_slug" text NOT NULL,
	"score" integer NOT NULL,
	"certified_level" text,
	"evaluations_count" integer NOT NULL,
	"distinct_topics_count" integer NOT NULL,
	"provisional" boolean NOT NULL,
	"algorithm_version" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subject_scores_user_id_subject_slug_pk" PRIMARY KEY("user_id","subject_slug"),
	CONSTRAINT "subject_scores_score_check" CHECK ("subject_scores"."score" between 0 and 1000)
);
--> statement-breakpoint
ALTER TABLE "feedback_sessions" ADD CONSTRAINT "feedback_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_topic_fk" FOREIGN KEY ("subject_slug","topic_slug") REFERENCES "public"."knowledge_topics"("subject_slug","slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_scores" ADD CONSTRAINT "subject_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_scores" ADD CONSTRAINT "subject_scores_subject_slug_knowledge_subjects_slug_fk" FOREIGN KEY ("subject_slug") REFERENCES "public"."knowledge_subjects"("slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_sessions_focus_live_index" ON "feedback_sessions" USING btree ("focus_session_id") WHERE "feedback_sessions"."status" in ('active', 'pending', 'completed', 'failed');--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_sessions_active_user_index" ON "feedback_sessions" USING btree ("user_id") WHERE "feedback_sessions"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_sessions_evaluation_index" ON "feedback_sessions" USING btree ("evaluation_id") WHERE "feedback_sessions"."evaluation_id" is not null;--> statement-breakpoint
CREATE INDEX "feedback_sessions_pending_job_index" ON "feedback_sessions" USING btree ("next_attempt_at") WHERE "feedback_sessions"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "feedback_sessions_history_index" ON "feedback_sessions" USING btree ("user_id","submitted_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feedback_sessions_usage_outbox_index" ON "feedback_sessions" USING btree ("completed_at") WHERE "feedback_sessions"."status" = 'completed' and "feedback_sessions"."usage_synced_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "score_events_evaluation_index" ON "score_events" USING btree ("evaluation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "score_events_feedback_session_index" ON "score_events" USING btree ("feedback_session_id");--> statement-breakpoint
CREATE INDEX "score_events_user_subject_timeline_index" ON "score_events" USING btree ("user_id","subject_slug","occurred_at","id");--> statement-breakpoint
CREATE INDEX "subject_scores_user_index" ON "subject_scores" USING btree ("user_id");