-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can only read and edit their own profile
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Automatically create a profile when someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, phone)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
