-- Property availability + chat infrastructure
-- Run this against your Supabase project before deploying the app changes.

-- 1. property_availability table -------------------------------------------
create table if not exists property_availability (
  id uuid primary key default uuid_generate_v4(),
  property_id text not null references properties(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  status text not null check (status in ('available', 'blocked', 'booked')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists property_availability_property_day_idx
  on property_availability(property_id, day);

create index if not exists property_availability_host_idx
  on property_availability(host_id, day);

-- Trigger to auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists property_availability_set_updated_at on property_availability;
create trigger property_availability_set_updated_at
  before update on property_availability
  for each row
  execute function set_updated_at();

alter table property_availability enable row level security;

-- Hosts can manage their own availability rows
create policy "Hosts manage availability"
  on property_availability
  for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Travellers can read availability for published properties
create policy "Travellers read availability"
  on property_availability
  for select
  using (
    exists (
      select 1
      from properties p
      where p.id = property_id
        and p.status = 'active'
    )
  );

-- 2. conversations + messages ----------------------------------------------
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  property_id text not null references properties(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  traveller_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  last_message text,
  last_message_at timestamptz default now(),
  host_unread_count integer not null default 0,
  traveller_unread_count integer not null default 0,
  host_name text,
  host_avatar text,
  traveller_name text,
  traveller_avatar text,
  created_at timestamptz not null default now()
);

create unique index if not exists conversations_unique_pair_idx
  on conversations(property_id, host_id, traveller_id);

create index if not exists conversations_host_idx on conversations(host_id, last_message_at desc);
create index if not exists conversations_traveller_idx on conversations(traveller_id, last_message_at desc);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  contains_contact_info boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Participants read/write conversations"
  on conversations
  for all
  using (auth.uid() in (host_id, traveller_id))
  with check (auth.uid() in (host_id, traveller_id));

create policy "Participants read/write messages"
  on messages
  for all
  using (
    exists (
      select 1
      from conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.traveller_id)
    )
  )
  with check (
    exists (
      select 1
      from conversations c
      where c.id = conversation_id
        and auth.uid() in (c.host_id, c.traveller_id)
    )
  );

-- 3. Helper function for blocking contact info (optional server-side enforcement)
create or replace function contains_contact_info(msg text)
returns boolean
language plpgsql
as $$
begin
  return msg ~* '([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})'
      or msg ~* '(\+?\d[\d\s().-]{7,})';
end;
$$;

-- Use this from the API route before inserting messages to keep both parties on-platform.

