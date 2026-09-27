ALTER TABLE "recipes" ADD COLUMN "image_source_url" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "image_candidates" jsonb;--> statement-breakpoint
ALTER TABLE "retail_products" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "retail_products" ADD COLUMN "household_id" text;--> statement-breakpoint
ALTER TABLE "retail_products" ADD CONSTRAINT "retail_products_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retail_products_household_id_index" ON "retail_products" USING btree ("household_id");