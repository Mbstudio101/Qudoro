-- User data sync table — one row per authenticated user.
-- Stores the full Zustand state JSON so data survives device switches / reinstalls.

create table if not exists public.user_sync (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb        not null default '{}'::jsonb,
  updated_at timestamptz  not null default now()
);

-- Only the owning user may read or write their row.
alter table public.user_sync enable row level security;

drop policy if exists "Users manage own sync data" on public.user_sync;
create policy "Users manage own sync data"
on public.user_sync
for all
using  (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Keep updated_at current on every upsert.
create or replace function public.touch_user_sync_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_user_sync on public.user_sync;
create trigger trg_touch_user_sync
before update on public.user_sync
for each row execute procedure public.touch_user_sync_updated_at();
