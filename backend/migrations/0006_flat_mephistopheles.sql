CREATE TABLE "feedback_shadow_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_session_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"provider" text,
	"model" text,
	"scorable" boolean,
	"mastery" integer,
	"verdict" text,
	"correction_segment_ids" jsonb NOT NULL,
	"confidence" double precision,
	"primary_mastery" integer,
	"primary_verdict" text,
	"decision" jsonb,
	"evaluation" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_usd" double precision,
	"latency_ms" integer,
	"error_code" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "feedback_shadow_reviews_mode_check" CHECK ("feedback_shadow_reviews"."mode" in ('decision', 'llm', 'hybrid')),
	CONSTRAINT "feedback_shadow_reviews_status_check" CHECK ("feedback_shadow_reviews"."status" in ('completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "knowledge_topic_assessments" (
	"subject_slug" text NOT NULL,
	"topic_slug" text NOT NULL,
	"reference_summary" text NOT NULL,
	"key_concepts" jsonb NOT NULL,
	"common_misconceptions" jsonb NOT NULL,
	"version" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "knowledge_topic_assessments_subject_slug_topic_slug_pk" PRIMARY KEY("subject_slug","topic_slug")
);
--> statement-breakpoint
ALTER TABLE "feedback_shadow_reviews" ADD CONSTRAINT "feedback_shadow_reviews_feedback_session_id_feedback_sessions_id_fk" FOREIGN KEY ("feedback_session_id") REFERENCES "public"."feedback_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_topic_assessments" ADD CONSTRAINT "knowledge_topic_assessments_topic_fk" FOREIGN KEY ("subject_slug","topic_slug") REFERENCES "public"."knowledge_topics"("subject_slug","slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_shadow_reviews_session_mode_index" ON "feedback_shadow_reviews" USING btree ("feedback_session_id","mode");--> statement-breakpoint
CREATE INDEX "feedback_shadow_reviews_mode_created_index" ON "feedback_shadow_reviews" USING btree ("mode","created_at");