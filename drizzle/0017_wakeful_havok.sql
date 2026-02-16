CREATE TABLE "client_gallery" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"studio_id" text NOT NULL,
	"client_name" text,
	"client_email" text,
	"share_token" text NOT NULL,
	"is_active" boolean NOT NULL,
	"expires_at" timestamp,
	"allow_download" boolean NOT NULL,
	"requires_password" boolean NOT NULL,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "client_gallery_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "gallery_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"gallery_id" text NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"position" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"photo_id" text NOT NULL,
	"gallery_id" text NOT NULL,
	"status" text NOT NULL,
	"comment" text,
	"client_identifier" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_gallery" ADD CONSTRAINT "client_gallery_studio_id_user_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_photo" ADD CONSTRAINT "gallery_photo_gallery_id_client_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."client_gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_feedback" ADD CONSTRAINT "photo_feedback_photo_id_gallery_photo_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."gallery_photo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_feedback" ADD CONSTRAINT "photo_feedback_gallery_id_client_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."client_gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_client_gallery_studio_id" ON "client_gallery" USING btree ("studio_id");--> statement-breakpoint
CREATE INDEX "idx_client_gallery_share_token" ON "client_gallery" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_client_gallery_is_active" ON "client_gallery" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_gallery_photo_gallery_id" ON "gallery_photo" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_photo_position" ON "gallery_photo" USING btree ("gallery_id","position");--> statement-breakpoint
CREATE INDEX "idx_photo_feedback_photo_id" ON "photo_feedback" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "idx_photo_feedback_gallery_id" ON "photo_feedback" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "idx_photo_feedback_status" ON "photo_feedback" USING btree ("gallery_id","status");