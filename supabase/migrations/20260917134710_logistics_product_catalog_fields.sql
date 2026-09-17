alter table public.logistics_product
  add column if not exists image_url text,
  add column if not exists dealer_price numeric,
  add column if not exists retail_price numeric,
  add column if not exists category text,
  add column if not exists family text;
