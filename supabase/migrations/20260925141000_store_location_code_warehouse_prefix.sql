create or replace function public.store_location_code(p_location_id bigint)
returns text
language sql
stable
set search_path = public
as $f$
  select case lr.kind
    when 'warehouse' then coalesce(
      (select number_prefix from public.store_catalog_code_prefix where code = 'warehouse'),
      'WH'
    ) || '-' || lr.entity_id
    else public.store_doc_number(d.kind, d.sequence_number)
  end
  from public.store_location_ref lr
  left join public.store_document d on d.id = lr.entity_id and lr.kind <> 'warehouse'
  where lr.stock_location_id = p_location_id;
$f$;

comment on function public.store_location_code(bigint) is
  'Код места для текстов ошибок плана заказа: склад — префикс из store_catalog_code_prefix (по умолчанию WH) и id склада; остальные места — номер документа.';
