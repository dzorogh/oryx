-- Перераспределение количества между владельцами внутри черновика выпуска.
-- Резерв: свободно → владелец; снятие: владелец → свободно.

begin;

create or replace function public.store_move_in_production_output(
  p_output_id bigint,
  p_from_owner_id bigint,
  p_to_owner_id bigint,
  p_lines jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_free bigint := public.store_free_owner_id();
  v_from bigint := coalesce(p_from_owner_id, public.store_free_owner_id());
  v_to bigint := coalesce(p_to_owner_id, public.store_free_owner_id());
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_src record;
  v_dst record;
begin
  perform public.store_assert_subtype_kind(p_output_id, 'production_output');
  select status into v_status from public.store_document where id = p_output_id;
  if v_status is distinct from 'draft' then
    raise exception 'Резерв в выпуске можно менять только в черновике';
  end if;
  if v_from = v_to then
    raise exception 'Владельцы источника и назначения совпадают';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = v_from)
     or not exists (select 1 from public.store_stock_owner where id = v_to) then
    raise exception 'Владелец не найден';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка';
  end if;

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;

    select id, quantity into v_src
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and coalesce(to_owner_id, v_free) = v_from
    for update;
    if v_src.id is null or v_src.quantity < v_qty then
      if v_from = v_free then
        raise exception 'Недостаточно свободного количества в черновике выпуска';
      end if;
      raise exception 'Недостаточно зарезервированного количества в черновике выпуска';
    end if;

    if v_src.quantity = v_qty then
      delete from public.store_document_product_line where id = v_src.id;
    else
      update public.store_document_product_line set quantity = quantity - v_qty where id = v_src.id;
    end if;

    select id, quantity into v_dst
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and coalesce(to_owner_id, v_free) = v_to
    for update;
    if v_dst.id is null then
      perform public.store_insert_line(p_output_id, v_variant, v_qty, null, v_to);
    else
      update public.store_document_product_line set quantity = quantity + v_qty where id = v_dst.id;
    end if;
  end loop;

  return 'ok';
end;
$f$;

create or replace function public.store_reserve_in_production_output(
  p_output_id bigint,
  p_owner_id bigint,
  p_lines jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  if p_owner_id = public.store_free_owner_id() then
    raise exception 'Нужен владелец-заказ клиента';
  end if;
  return public.store_move_in_production_output(p_output_id, public.store_free_owner_id(), p_owner_id, p_lines);
end;
$f$;

grant execute on function public.store_move_in_production_output(bigint, bigint, bigint, jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
