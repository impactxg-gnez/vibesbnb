-- Fix for Supabase Security Advisor Alert: rls_disabled_in_public
-- Project: VibesBNB (okmudgacbpgycixtpoqx)
-- Table: public.archived_messages
-- Run this in Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/okmudgacbpgycixtpoqx/sql/new

ALTER TABLE public.archived_messages ENABLE ROW LEVEL SECURITY;
