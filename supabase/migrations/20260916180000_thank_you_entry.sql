-- Demo backend: Pulse Thanks feed. Open to anon (no login required).

create table if not exists public.thank_you_entry (
  id text primary key,
  sender_id text not null,
  sender_name text not null,
  sender_department text not null,
  recipient_id text not null,
  recipient_name text not null,
  recipient_department text not null,
  message text not null,
  sent_at_label text not null,
  created_at timestamptz not null default now()
);

alter table public.thank_you_entry enable row level security;

drop policy if exists thank_you_entry_open_all on public.thank_you_entry;
create policy thank_you_entry_open_all
  on public.thank_you_entry
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.thank_you_entry to anon, authenticated, service_role;
