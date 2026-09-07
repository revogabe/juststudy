CREATE TABLE "topic_randomizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_slug" text NOT NULL,
	"topic_slug" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_randomizations_status_check" CHECK ("topic_randomizations"."status" in ('pending', 'abandoned', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "topic_randomizations" ADD CONSTRAINT "topic_randomizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_randomizations" ADD CONSTRAINT "topic_randomizations_topic_fk" FOREIGN KEY ("subject_slug","topic_slug") REFERENCES "public"."knowledge_topics"("subject_slug","slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_randomizations_active_topic_index" ON "topic_randomizations" USING btree ("user_id","subject_slug","topic_slug") WHERE "topic_randomizations"."status" in ('pending', 'completed');--> statement-breakpoint
CREATE INDEX "topic_randomizations_user_timeline_index" ON "topic_randomizations" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "topic_randomizations_user_subject_status_index" ON "topic_randomizations" USING btree ("user_id","subject_slug","status");