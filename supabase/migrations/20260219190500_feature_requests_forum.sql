create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  details text not null check (char_length(details) between 10 and 2000),
  category text not null default 'general' check (category in ('general', 'ui-ux', 'study-flow', 'marketplace', 'security')),
  status text not null default 'open' check (status in ('open', 'planned', 'in-progress', 'completed', 'closed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  author_label text not null default 'Qudoro User',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_requests_created_at on public.feature_requests (created_at desc);
create index if not exists idx_feature_requests_status on public.feature_requests (status);
create index if not exists idx_feature_requests_category on public.feature_requests (category);

create or replace function public.touch_feature_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_feature_requests on public.feature_requests;
create trigger trg_touch_feature_requests
before update on public.feature_requests
for each row execute procedure public.touch_feature_requests_updated_at();

alter table public.feature_requests enable row level security;

drop policy if exists "Authenticated read feature requests" on public.feature_requests;
create policy "Authenticated read feature requests"
on public.feature_requests
for select
to authenticated
using (true);

drop policy if exists "Authenticated create own feature request" on public.feature_requests;
create policy "Authenticated create own feature request"
on public.feature_requests
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Users update own feature request" on public.feature_requests;
create policy "Users update own feature request"
on public.feature_requests
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);
