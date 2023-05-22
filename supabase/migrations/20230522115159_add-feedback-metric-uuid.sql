alter table "public"."feedback_metrics" add column "uuid" uuid not null default uuid_generate_v4();

CREATE UNIQUE INDEX feedback_metrics_uuid_key ON public.feedback_metrics USING btree (uuid);

alter table "public"."feedback_metrics" add constraint "feedback_metrics_uuid_key" UNIQUE using index "feedback_metrics_uuid_key";


