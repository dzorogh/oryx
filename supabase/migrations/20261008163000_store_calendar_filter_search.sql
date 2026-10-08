-- Server-side search for the production calendar filter comboboxes: customer orders and regions.
-- p_scope 'calendar' — the same orders as store_output_calendar_page.customerOrders (open or owning stock / open outputs);
-- p_scope 'money' — non-cancelled customer orders with money facts («Поступления»).
-- p_ids returns exactly those rows (labels for already selected chips), ignoring the query and scope.

begin;

create or replace function public.store_calendar_customer_order_search(
  p_query text default '',
  p_scope text default 'calendar',
  p_ids bigint[] default null,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  calendar_owners as (
    select b.stock_owner_id
    from store_stock_balance_ref b
    where b.location_kind in ('warehouse', 'transfer')
    group by b.stock_owner_id, b.product_variant_id, b.location_kind, b.location_entity_id
    having sum(b.quantity) <> 0
    union
    select l.to_owner_id
    from store_production_output o
    join store_document d on d.id = o.id
    join store_document_product_line l on l.document_id = o.id
    where d.status = 'draft' and l.to_owner_id is not null
  ),
  rows as (
    select
      co.id,
      store_doc_number(d.kind, d.sequence_number) as number,
      d.sequence_number as "sequenceNumber",
      co.region_id as "regionId",
      r.code as "regionCode",
      r.name as "regionName"
    from store_customer_order co
    join store_document d on d.id = co.id
    left join store_region r on r.id = co.region_id
    where case
      when p_ids is not null then co.id = any (p_ids)
      when p_scope = 'money' then
        d.status is distinct from 'cancelled'
        and exists (select 1 from store_order_money m where m.document_id = co.id)
      else
        d.status not in ('done', 'cancelled')
        or co.stock_owner_id in (select stock_owner_id from calendar_owners)
    end
    and (
      p_ids is not null
      or store_doc_number(d.kind, d.sequence_number) ilike (select pattern from q)
      or d.sequence_number::text ilike (select pattern from q)
      or coalesce(r.code, '') ilike (select pattern from q)
      or coalesce(r.name, '') ilike (select pattern from q)
    )
    order by d.sequence_number, co.id
    limit case when p_ids is not null then null else greatest(1, least(coalesce(p_limit, 30), 100)) end
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r."sequenceNumber", r.id), '[]'::jsonb) from rows r;
$f$;

create or replace function public.store_calendar_region_search(
  p_query text default '',
  p_scope text default 'calendar',
  p_ids bigint[] default null,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  rows as (
    select r.id, r.code, r.name
    from store_region r
    where r.deleted_at is null
      and case
        when p_ids is not null then r.id = any (p_ids)
        when p_scope = 'money' then exists (
          select 1
          from store_customer_order co
          join store_document d on d.id = co.id
          join store_order_money m on m.document_id = co.id
          where co.region_id = r.id and d.status is distinct from 'cancelled'
        )
        else true
      end
      and (
        p_ids is not null
        or coalesce(r.code, '') ilike (select pattern from q)
        or coalesce(r.name, '') ilike (select pattern from q)
      )
    order by r.id
    limit case when p_ids is not null then null else greatest(1, least(coalesce(p_limit, 30), 100)) end
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb) from rows r;
$f$;

revoke all on function public.store_calendar_customer_order_search(text, text, bigint[], integer) from public, anon, authenticated;
grant execute on function public.store_calendar_customer_order_search(text, text, bigint[], integer) to anon, authenticated, service_role;
revoke all on function public.store_calendar_region_search(text, text, bigint[], integer) from public, anon, authenticated;
grant execute on function public.store_calendar_region_search(text, text, bigint[], integer) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
