create extension if not exists pgcrypto;
create type public.message_kind as enum ('text','audio','sticker','image','location');
create type public.family_role as enum ('admin','member');
create table public.families (id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 80), invite_code text not null unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)), created_at timestamptz not null default now());
create table public.users (id uuid primary key references auth.users(id) on delete cascade, family_id uuid references public.families(id) on delete set null, telegram_id text not null unique, username text, display_name text not null, avatar_url text, role public.family_role not null default 'member', created_at timestamptz not null default now(), last_seen timestamptz not null default now(), location_sharing_enabled boolean not null default true, online boolean not null default false);
create table public.locations (id bigint generated always as identity primary key, user_id uuid not null unique references public.users(id) on delete cascade, latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180), accuracy real, updated_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade, sender_id uuid not null references public.users(id) on delete cascade, receiver_id uuid references public.users(id) on delete cascade, type public.message_kind not null, text text, audio_url text, sticker_id text, image_url text, latitude double precision, longitude double precision, created_at timestamptz not null default now(), read_at timestamptz, constraint message_payload check ((type='text' and text is not null) or (type='audio' and audio_url is not null) or (type='sticker' and sticker_id is not null) or (type='image' and image_url is not null) or (type='location' and latitude is not null and longitude is not null)));
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, type text not null, message_id uuid references public.messages(id) on delete cascade, created_at timestamptz not null default now(), read boolean not null default false);
create index messages_conversation on public.messages(family_id, created_at desc); create index locations_updated on public.locations(updated_at desc);

create or replace function public.my_family_id() returns uuid language sql stable security definer set search_path=public as $$ select family_id from public.users where id=auth.uid() $$;
create or replace function public.is_family_admin() returns boolean language sql stable security definer set search_path=public as $$ select role='admin' from public.users where id=auth.uid() $$;
alter table public.families enable row level security; alter table public.users enable row level security; alter table public.locations enable row level security; alter table public.messages enable row level security; alter table public.notifications enable row level security;
create policy "family read" on public.families for select using (id=public.my_family_id());
create policy "family member read" on public.users for select using (family_id=public.my_family_id() or id=auth.uid());
create policy "own profile update" on public.users for update using (id=auth.uid()) with check (id=auth.uid() and (family_id is not distinct from public.my_family_id()));
create policy "admin manages members" on public.users for update using (family_id=public.my_family_id() and public.is_family_admin()) with check (public.is_family_admin());
create policy "admin updates family" on public.families for update using (id=public.my_family_id() and public.is_family_admin()) with check (id=public.my_family_id() and public.is_family_admin());
create policy "family locations read" on public.locations for select using (exists(select 1 from public.users u where u.id=locations.user_id and u.family_id=public.my_family_id()));
create policy "own location write" on public.locations for insert with check (user_id=auth.uid());
create policy "own location update" on public.locations for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "conversation read" on public.messages for select using (family_id=public.my_family_id() and (sender_id=auth.uid() or receiver_id=auth.uid()));
create policy "send in family" on public.messages for insert with check (family_id=public.my_family_id() and sender_id=auth.uid() and (receiver_id is null or exists(select 1 from public.users where id=receiver_id and family_id=public.my_family_id())));
create policy "recipient marks read" on public.messages for update using(receiver_id=auth.uid()) with check(receiver_id=auth.uid());
create policy "own notifications" on public.notifications for select using(user_id=auth.uid()); create policy "own notifications update" on public.notifications for update using(user_id=auth.uid());

create or replace function public.notify_new_message() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.receiver_id is not null then insert into public.notifications(user_id,type,message_id) values(new.receiver_id,case when new.type='location' then 'location_shared' else 'new_message' end,new.id); end if; return new; end $$;
create trigger messages_create_notification after insert on public.messages for each row execute function public.notify_new_message();

-- Private buckets: use paths beginning with auth.uid(); signed URLs are created by trusted server code if required.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('family-media','family-media',false,20971520,array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg']) on conflict do nothing;
create policy "family media upload" on storage.objects for insert to authenticated with check (bucket_id='family-media' and (storage.foldername(name))[1]=public.my_family_id()::text);
create policy "family media select" on storage.objects for select to authenticated using (bucket_id='family-media' and (storage.foldername(name))[1]=public.my_family_id()::text);
alter publication supabase_realtime add table public.locations, public.messages, public.notifications, public.users;
