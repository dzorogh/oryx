-- Customer order list rows also carry money, payment amounts, closed date and position count.

create or replace function public.store_customer_order_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with line_qty as (
    select
      l.document_id,
      l.product_variant_id,
      l.quantity as ordered_qty
    from store_document_product_line l
    join store_document d on d.id = l.document_id and d.kind = 'customer_order'
  ),
  bal as (
    select
      co.id as order_id,
      b.product_variant_id,
      coalesce(sum(b.quantity) filter (
        where b.stock_state = 'reserved'
          and b.owner_kind = 'customer_order'
          and b.owner_entity_id = co.id
      ), 0) as reserved_qty,
      coalesce(sum(b.quantity) filter (
        where b.stock_state = 'shipped'
          and b.owner_kind = 'customer_order'
          and b.owner_entity_id = co.id
      ), 0) as shipped_qty
    from store_customer_order co
    left join store_stock_balance_ref b
      on b.owner_kind = 'customer_order' and b.owner_entity_id = co.id
    group by co.id, b.product_variant_id
  ),
  per_line as (
    select
      lq.document_id as order_id,
      lq.ordered_qty,
      coalesce(b.reserved_qty, 0) as reserved_qty,
      coalesce(b.shipped_qty, 0) as shipped_qty,
      greatest(0, lq.ordered_qty - coalesce(b.shipped_qty, 0) - coalesce(b.reserved_qty, 0)) as open_qty
    from line_qty lq
    left join bal b
      on b.order_id = lq.document_id and b.product_variant_id = lq.product_variant_id
  ),
  totals as (
    select
      order_id,
      coalesce(sum(ordered_qty), 0) as ordered,
      coalesce(sum(reserved_qty), 0) as reserved,
      coalesce(sum(shipped_qty), 0) as shipped,
      coalesce(sum(open_qty), 0) as open_to_reserve
    from per_line
    group by order_id
  ),
  history as (
    select
      h.document_id,
      h.changed_at,
      h.status in ('done', 'closed', 'delivered') as is_done,
      row_number() over (partition by h.document_id order by h.changed_at, h.id) as rn
    from store_document_history h
    join store_document d on d.id = h.document_id and d.kind = 'customer_order'
  ),
  flagged as (
    select
      history.*,
      history.is_done is distinct from lag(history.is_done) over (
        partition by history.document_id order by history.rn
      ) as new_run
    from history
  ),
  runs as (
    select
      document_id,
      changed_at,
      is_done,
      rn,
      sum(case when new_run then 1 else 0 end) over (
        partition by document_id order by rn
      ) as run_id
    from flagged
  ),
  latest_run as (
    select distinct on (document_id)
      document_id,
      run_id,
      is_done
    from runs
    order by document_id, rn desc
  ),
  closed_at as (
    select
      r.document_id,
      (array_agg(r.changed_at order by r.rn))[1] as completed_at
    from runs r
    join latest_run l
      on l.document_id = r.document_id
     and l.run_id = r.run_id
     and l.is_done
    where r.is_done
    group by r.document_id
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r."createdAt" desc, r.id desc), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      coalesce(d.status, 'in_progress') as status,
      d.expected_end_on as "expectedEndOn",
      d.created_at as "createdAt",
      coalesce(d.description, '') as description,
      store_product_lines_json(d.id) as products,
      coalesce(t.ordered, 0) as ordered,
      coalesce(t.reserved, 0) as reserved,
      coalesce(t.shipped, 0) as shipped,
      coalesce(t.open_to_reserve, 0) as "openToReserve",
      coalesce(u.name, '') as "createdBy",
      co.region_id::text as "regionId",
      coalesce(rg.code, '') as "regionCode",
      coalesce((
        select jsonb_agg(jsonb_build_object('id', tn.id, 'name', tn.name) order by tn.sort_order, tn.name)
        from store_tenant tn
        where tn.region_id = co.region_id
      ), '[]'::jsonb) as tenants,
      co.source_kind as "sourceKind",
      case co.source_kind
        when 'plant' then co.source_plant_id::text
        when 'hub' then co.source_warehouse_id::text
      end as "sourceId",
      coalesce((
        select jsonb_agg(
          jsonb_build_object('dueOn', p.due_on, 'status', p.status, 'amount', p.amount)
          order by p.due_on, p.id
        )
        from store_order_payment p
        where p.document_id = d.id
      ), '[]'::jsonb) as payments,
      (
        select jsonb_build_object(
          'currencyCode', c.code,
          'amount', m.amount,
          'rates', m.rates,
          'lineTotals', coalesce((
            select jsonb_agg(
              jsonb_build_object('currencyCode', lc.code, 'total', t.total)
              order by lc.code nulls last
            )
            from (
              select l.currency_id, sum(l.unit_price * l.quantity) as total
              from store_document_product_line l
              where l.document_id = d.id and l.unit_price is not null
              group by l.currency_id
            ) t
            left join store_currency lc on lc.id = t.currency_id
          ), '[]'::jsonb)
        )
        from store_order_money m
        join store_currency c on c.id = m.currency_id
        where m.document_id = d.id
      ) as money,
      ca.completed_at as "completedAt",
      (
        select count(*)::int
        from store_document_product_line l
        where l.document_id = d.id
      ) as positions
    from store_document d
    join store_customer_order co on co.id = d.id
    left join totals t on t.order_id = d.id
    left join app_user u on u.id = d.created_by
    left join store_region rg on rg.id = co.region_id
    left join closed_at ca on ca.document_id = d.id
  ) r;
$f$;

notify pgrst, 'reload schema';
