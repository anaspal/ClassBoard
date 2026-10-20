-- الصقه كاملاً في Supabase: SQL Editor ← New query ← Run
create table if not exists boards(
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text, data jsonb not null, updated_at timestamptz not null default now());
alter table boards enable row level security;
drop policy if exists "own boards" on boards;
create policy "own boards" on boards for all using (owner = auth.uid()) with check (owner = auth.uid());

create table if not exists live_sessions(
  code text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text, data jsonb not null, updated_at timestamptz not null default now());
alter table live_sessions enable row level security;
drop policy if exists "owner live" on live_sessions;
create policy "owner live" on live_sessions for all using (owner = auth.uid()) with check (owner = auth.uid());
-- لا توجد سياسة قراءة عامة: الطالب يقرأ فقط عبر الدالتين التاليتين وبمعرفة الرمز (لا يمكن سرد الحصص).
create or replace function get_live_version(p_code text) returns timestamptz
language sql security definer set search_path = public as $$ select updated_at from live_sessions where code = upper(p_code) $$;
create or replace function get_live(p_code text) returns jsonb
language sql security definer set search_path = public as $$ select jsonb_build_object('name',name,'data',data,'updated_at',updated_at) from live_sessions where code = upper(p_code) $$;
grant execute on function get_live_version(text), get_live(text) to anon, authenticated;
