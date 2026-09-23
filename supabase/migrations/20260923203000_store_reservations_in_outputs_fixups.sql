-- Follow-ups for reservations-in-outputs: revoke helper grants; return sequence_number from PO create.

begin;

revoke all on function public.store_cancel_po_active_outputs(bigint) from public, anon, authenticated;
grant execute on function public.store_cancel_po_active_outputs(bigint) to service_role;

create or replace function public.store_create_production_order(
  p_plant_id bigint,
  p_lines jsonb default '[]'::jsonb,
  p_description text default '',
  p_expected_end_on date default null,
  p_status text default 'draft',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc bigint;
  e jsonb;
  v_line_ids bigint[] := '{}';
  v_line_id bigint;
  v_status text := coalesce(p_status, 'draft');
  v_seq bigint;
begin
  if not exists (select 1 from public.store_plant where id = p_plant_id and deleted_at is null) then
    raise exception 'Завод % не найден', p_plant_id;
  end if;
  if v_status not in ('draft', 'in_progress') then
    raise exception 'Начальный статус производства должен быть draft или in_progress';
  end if;
  v_id := public.store_create_document(
    'production_order', coalesce(p_description, ''), v_status, p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('production_order');
  insert into public.store_production_order (id, plant_id, stock_location_id)
  values (v_id, p_plant_id, v_loc);
  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_id := public.store_insert_line(
      v_id, (e->>'product_variant_id')::bigint, (e->>'quantity')::numeric
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  select sequence_number into v_seq from public.store_document where id = v_id;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids), 'sequence_number', v_seq);
end;
$f$;

notify pgrst, 'reload schema';

commit;
