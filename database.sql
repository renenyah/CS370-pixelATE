create table public.assignments (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  due_at timestamp with time zone null,
  course text null,
  weight text null,
  submission_type text null,
  notes text null,
  source_document uuid null,
  source_page integer null,
  source_excerpt text null,
  created_at timestamp with time zone null default now(),
  constraint assignments_pkey primary key (id),
  constraint assignments_source_document_fkey foreign KEY (source_document) references documents (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists assignments_user_due_idx on public.assignments using btree (user_id, due_at) TABLESPACE pg_default;

create index IF not exists assignments_source_doc_idx on public.assignments using btree (source_document) TABLESPACE pg_default;

create table public.courses (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  term text null,
  color text null,
  constraint courses_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists courses_user_idx on public.courses using btree (user_id) TABLESPACE pg_default;

create table public.documents (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  storage_path text not null,
  course_hint text null,
  status text not null default 'queued'::text,
  created_at timestamp with time zone null default now(),
  processed_at timestamp with time zone null,
  constraint documents_pkey primary key (id),
  constraint documents_status_check check (
    (
      status = any (
        array['queued'::text, 'processed'::text, 'failed'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists documents_user_idx on public.documents using btree (user_id) TABLESPACE pg_default;

create table public.extraction_runs (
  id uuid not null default gen_random_uuid (),
  document_id uuid null,
  started_at timestamp with time zone null default now(),
  finished_at timestamp with time zone null,
  segments_total integer null,
  segments_llm integer null,
  assignments_created integer null,
  status text not null default 'ok'::text,
  error_message text null,
  constraint extraction_runs_pkey primary key (id),
  constraint extraction_runs_document_id_fkey foreign KEY (document_id) references documents (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists extraction_runs_doc_idx on public.extraction_runs using btree (document_id) TABLESPACE pg_default;

create table public.prompts (
  id uuid not null default gen_random_uuid (),
  name text not null,
  version integer not null,
  body text not null,
  created_at timestamp with time zone null default now(),
  constraint prompts_pkey primary key (id),
  constraint prompts_name_version_key unique (name, version)
) TABLESPACE pg_default;

