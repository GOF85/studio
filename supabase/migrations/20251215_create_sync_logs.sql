-- Tabla para logs de sincronización de artículos ERP
create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null,
  type text not null default 'articulos',
  status text not null, -- 'success' | 'error' | 'cancelled'
  log text not null,
  duration_ms integer null,
  extra jsonb null
);

-- Índice para ordenar por fecha
create index if not exists idx_sync_logs_created_at on public.sync_logs (created_at desc);
