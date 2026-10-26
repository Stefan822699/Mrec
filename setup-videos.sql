-- Run once in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. Storage bucket for videos (public so share links work without logging in)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/*'])
on conflict (id) do nothing;

-- Only logged-in users can upload/delete, and only inside their own folder
create policy "upload own videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Videos table
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null,
  size_bytes bigint default 0,
  views integer default 0,
  created_at timestamptz default now()
);

alter table public.videos enable row level security;

-- Anyone with a link can watch; only the owner can add/edit/delete
create policy "anyone can view videos" on public.videos
  for select using (true);
create policy "insert own videos" on public.videos
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own videos" on public.videos
  for update to authenticated using (auth.uid() = user_id);
create policy "delete own videos" on public.videos
  for delete to authenticated using (auth.uid() = user_id);

-- 3. View counter anyone can trigger
create function public.increment_views(video_id uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.videos set views = views + 1 where id = video_id;
$$;

grant execute on function public.increment_views(uuid) to anon, authenticated;
