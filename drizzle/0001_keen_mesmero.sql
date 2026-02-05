CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_hash" text NOT NULL,
	"original_url" text,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE INDEX "images_created_at_idx" ON "images" USING btree ("created_at");