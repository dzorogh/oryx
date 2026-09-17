alter table public.logistics_customer_order
  add column if not exists description text not null default '';
