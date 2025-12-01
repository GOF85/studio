-- Refresh Supabase schema cache
-- Run this in Supabase SQL Editor after any schema changes

NOTIFY pgrst, 'reload schema';
