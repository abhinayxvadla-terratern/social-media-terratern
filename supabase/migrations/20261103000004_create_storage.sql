-- ==============================================================================
-- Migration 04: Supabase Storage Configuration
-- Filename: 20261103000004_create_storage.sql
-- Description:
--   Creates the private Supabase Storage bucket "pdfs" for downloadable lead
--   magnets, reports, and generated guides.
--
-- Security specifications:
--   - public = false (Private bucket: downloads require signed URLs)
--   - file_size_limit = 20MB (20971520 bytes)
--   - allowed_mime_types = ['application/pdf']
--   - Access control policies are established in Migration 05 (Security & RLS)
-- ==============================================================================

-- Create private 'pdfs' storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pdfs',
  'pdfs',
  false,
  20971520, -- 20 MB max file size
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];
