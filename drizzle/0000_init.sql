CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_compositions" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_ref" text NOT NULL,
	"source_label" text NOT NULL,
	"source_version" text NOT NULL,
	"source_name" text NOT NULL,
	"license" text NOT NULL,
	"url" text,
	"quality" text NOT NULL,
	"per100g" jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"profile_mode" text DEFAULT 'simplified' NOT NULL,
	"sex" text,
	"birth_year" integer,
	"height_cm" real,
	"weight_kg" real,
	"activity" text DEFAULT 'light' NOT NULL,
	"goal" text DEFAULT 'none' NOT NULL,
	"high_protein" boolean DEFAULT false NOT NULL,
	"appetite" text DEFAULT 'normal' NOT NULL,
	"special_situations" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"diets" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"allergies" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"excluded_ingredient_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"liked_ingredient_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_settings" (
	"household_id" text PRIMARY KEY NOT NULL,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"meal_schedule" jsonb NOT NULL,
	"general_appetite" text DEFAULT 'normal' NOT NULL,
	"budget_cents" integer NOT NULL,
	"budget_mode" text DEFAULT 'target' NOT NULL,
	"max_weekday_minutes" integer DEFAULT 40 NOT NULL,
	"max_weekend_minutes" integer DEFAULT 75 NOT NULL,
	"skill" text DEFAULT 'intermediate' NOT NULL,
	"equipment" text[] DEFAULT ARRAY['hob']::text[] NOT NULL,
	"batch_cooking" boolean DEFAULT false NOT NULL,
	"prefer_quick_meals" boolean DEFAULT false NOT NULL,
	"max_distinct_recipes" integer,
	"organic" text DEFAULT 'indifferent' NOT NULL,
	"store_brand" text DEFAULT 'indifferent' NOT NULL,
	"accept_promotions" boolean DEFAULT true NOT NULL,
	"repetition_tolerance" text DEFAULT 'medium' NOT NULL,
	"use_leftovers" boolean DEFAULT true NOT NULL,
	"store_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"onboarding_draft" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aisle" text NOT NULL,
	"purchase_unit" text NOT NULL,
	"measures" jsonb NOT NULL,
	"measures_source" text,
	"composition_id" text,
	"allergens" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"animal_origin" text NOT NULL,
	"is_pork" boolean DEFAULT false NOT NULL,
	"contains_alcohol" boolean DEFAULT false NOT NULL,
	"is_staple" boolean DEFAULT false NOT NULL,
	"shelf_life_days" integer NOT NULL,
	"cooked_yield" real,
	"protein_family" text,
	"piece_label" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mapping_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text,
	"retailer_id" text,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plan_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"date" date NOT NULL,
	"day_index" integer NOT NULL,
	"meal_type" text NOT NULL,
	"recipe_id" text,
	"locked" boolean DEFAULT false NOT NULL,
	"eater_ids" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"week_start" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"seed" integer NOT NULL,
	"store_id" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"over_budget_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"quantity" real,
	"expires_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text NOT NULL,
	"product_id" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"substitution_note" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" integer NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "recipe_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"position" integer NOT NULL,
	"ingredient_id" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"role" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "recipe_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"timer_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"servings" integer NOT NULL,
	"prep_minutes" integer NOT NULL,
	"cook_minutes" integer NOT NULL,
	"difficulty" text NOT NULL,
	"equipment" text[] NOT NULL,
	"tags" text[] NOT NULL,
	"cuisine" text NOT NULL,
	"season_months" integer[] NOT NULL,
	"meal_types" text[] NOT NULL,
	"keeps_well" boolean NOT NULL,
	"origin" text NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"image_url" text,
	"image_credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "retail_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"store_id" text,
	"price_cents" integer,
	"unit_price_cents" integer,
	"promotion_label" text,
	"promotion_valid_until" timestamp with time zone,
	"availability" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"provider" text NOT NULL,
	"quality" text NOT NULL,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "retail_products" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"external_id" text,
	"ean" text,
	"name" text NOT NULL,
	"brand" text,
	"pack_label" text NOT NULL,
	"pack_quantity" real NOT NULL,
	"pack_unit" text NOT NULL,
	"is_organic" boolean DEFAULT false NOT NULL,
	"is_store_brand" boolean DEFAULT false NOT NULL,
	"source_url" text,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"website" text,
	"integration_status" text NOT NULL,
	"integration_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retailers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"city" text,
	"postcode" text,
	"latitude" real,
	"longitude" real,
	"is_drive" boolean DEFAULT false NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"retailer_id" text,
	"store_id" text,
	"status" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_settings" ADD CONSTRAINT "household_settings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_settings" ADD CONSTRAINT "household_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_composition_id_food_compositions_id_fk" FOREIGN KEY ("composition_id") REFERENCES "public"."food_compositions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_issues" ADD CONSTRAINT "mapping_issues_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_issues" ADD CONSTRAINT "mapping_issues_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD CONSTRAINT "meal_plan_slots_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD CONSTRAINT "meal_plan_slots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mappings" ADD CONSTRAINT "product_mappings_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mappings" ADD CONSTRAINT "product_mappings_product_id_retail_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."retail_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_feedback" ADD CONSTRAINT "recipe_feedback_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_feedback" ADD CONSTRAINT "recipe_feedback_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_prices" ADD CONSTRAINT "retail_prices_product_id_retail_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."retail_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_prices" ADD CONSTRAINT "retail_prices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_products" ADD CONSTRAINT "retail_products_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_at_index" ON "analytics_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "food_compositions_source_source_ref_source_version_index" ON "food_compositions" USING btree ("source","source_ref","source_version");--> statement-breakpoint
CREATE INDEX "household_members_household_id_index" ON "household_members" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "household_memberships_household_id_user_id_index" ON "household_memberships" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE INDEX "household_memberships_user_id_index" ON "household_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_plan_slots_plan_id_date_meal_type_index" ON "meal_plan_slots" USING btree ("plan_id","date","meal_type");--> statement-breakpoint
CREATE INDEX "meal_plans_household_id_week_start_index" ON "meal_plans" USING btree ("household_id","week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "pantry_items_household_id_ingredient_id_index" ON "pantry_items" USING btree ("household_id","ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_mappings_ingredient_id_product_id_index" ON "product_mappings" USING btree ("ingredient_id","product_id");--> statement-breakpoint
CREATE INDEX "product_mappings_ingredient_id_index" ON "product_mappings" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "recipe_feedback_household_id_kind_index" ON "recipe_feedback" USING btree ("household_id","kind");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_id_index" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_steps_recipe_id_index" ON "recipe_steps" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_review_status_index" ON "recipes" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "retail_prices_product_id_store_id_fetched_at_index" ON "retail_prices" USING btree ("product_id","store_id","fetched_at");--> statement-breakpoint
CREATE INDEX "retail_products_retailer_id_index" ON "retail_products" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "retail_products_ean_index" ON "retail_products" USING btree ("ean");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_list_items_plan_id_ingredient_id_index" ON "shopping_list_items" USING btree ("plan_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "stores_retailer_id_index" ON "stores" USING btree ("retailer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_retailer_id_external_id_index" ON "stores" USING btree ("retailer_id","external_id");--> statement-breakpoint
CREATE INDEX "sync_logs_provider_started_at_index" ON "sync_logs" USING btree ("provider","started_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");