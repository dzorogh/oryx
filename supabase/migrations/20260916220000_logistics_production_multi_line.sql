-- A production order can contain several product lines.

drop function if exists public.logistics_create_production_order(text, text, text, text, text, numeric);

create or replace function public.logistics_create_production_order(
  p_id text,
  p_number text,
  p_manufacturer_id text,
  p_lines jsonb
)
returns text
language plpgsql
as $$
declare
  v_item record;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one production line';
  end if;

  insert into public.logistics_production_order (id, number, manufacturer_id, status)
  values (p_id, p_number, p_manufacturer_id, 'draft');

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(id text, product_id text, quantity numeric)
  loop
    if v_item.id is null or v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Each line needs a product and a positive quantity';
    end if;
    insert into public.logistics_production_order_line (
      id, order_id, product_id, quantity, activated_quantity
    ) values (v_item.id, p_id, v_item.product_id, v_item.quantity, 0);
  end loop;

  return public.logistics_sync_production_activation(p_id);
end;
$$;

create or replace function public.logistics_add_production_line(
  p_id text,
  p_line_id text,
  p_product_id text,
  p_quantity numeric
)
returns text
language plpgsql
as $$
declare
  v_status text;
begin
  select status into strict v_status from public.logistics_production_order where id = p_id;
  if v_status in ('cancelled', 'closed') then
    raise exception 'Cannot add a line to a closed production order';
  end if;
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  insert into public.logistics_production_order_line (
    id, order_id, product_id, quantity, activated_quantity
  ) values (p_line_id, p_id, p_product_id, p_quantity, 0);
  return public.logistics_sync_production_activation(p_id);
end;
$$;

grant execute on function public.logistics_create_production_order(text, text, text, jsonb)
  to anon, authenticated, service_role;
grant execute on function public.logistics_add_production_line(text, text, text, numeric)
  to anon, authenticated, service_role;
