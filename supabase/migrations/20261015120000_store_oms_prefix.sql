-- OMS-таблицы, view и функции: store_* → store_oms_*.
-- Справочники, PIM и настройки остаются store_*.
-- ALTER … RENAME сохраняет OID (данные, FK, RLS, гранты, триггеры).
-- Тела функций — текст: после переименования их пересобирает create or replace.
-- Длинные имена раньше коротких; замена по границам слов (\m … \M), «_» — символ слова.
-- Идентификатор длиннее 63 байт обрезается: так Postgres хранит имя.

do $oms$
#variable_conflict use_column
declare
  rec record;
  tok record;
  fn_name text;
  original text;
  new_def text;
  target_name text;
  keep_names text[] := array[
    'store_catalog_page',
    'store_create_plant',
    'store_create_product_variant',
    'store_create_region',
    'store_create_warehouse',
    'store_currency_rates_snapshot',
    'store_current_user_id',
    'store_forbid_hard_delete',
    'store_forbid_variant_hard_delete',
    'store_region_hub_warehouse_guard',
    'store_region_status_for_new_region',
    'store_region_status_for_new_variant',
    'store_set_code_prefix',
    'store_set_production_currency',
    'store_set_tenant_region',
    'store_update_plant',
    'store_update_region',
    'store_update_warehouse',
    'store_variant_stock_facts'
  ];
  relation_names text[] := array[
    'store_adjustment',
    'store_customer_order',
    'store_customer_order_client_delivery',
    'store_customer_order_meta',
    'store_document',
    'store_document_file',
    'store_document_history',
    'store_document_kind',
    'store_document_product_line',
    'store_order_money',
    'store_order_payment',
    'store_order_payment_event',
    'store_order_plan',
    'store_order_plan_action',
    'store_production_order',
    'store_production_output',
    'store_reservation',
    'store_shipment',
    'store_stock_location',
    'store_stock_owner',
    'store_stock_transaction',
    'store_transfer',
    'store_location_ref',
    'store_owner_ref',
    'store_stock_balance',
    'store_stock_balance_ref'
  ];
begin
  create temp table oms_relation (
    old_name text primary key,
    new_name text not null
  ) on commit drop;

  insert into oms_relation (old_name, new_name)
  select name, 'store_oms_' || substring(name from 7)
  from unnest(relation_names) as name;

  create temp table oms_token (
    old_name text primary key,
    new_name text not null
  ) on commit drop;

  insert into oms_token (old_name, new_name)
  select old_name, new_name from oms_relation;

  -- Последовательности, индексы, ограничения, триггеры и политики,
  -- чьё имя начинается со старого имени OMS-отношения. Таблицы ещё под старыми именами.
  create temp table oms_obj (
    kind text not null,
    old_name text not null,
    parent_name text,
    new_name text not null
  ) on commit drop;

  insert into oms_obj (kind, old_name, parent_name, new_name)
  select kind, name, parent_name, left('store_oms_' || substring(name from 7), 63)
  from (
    select 'sequence'::text as kind, c.relname as name, null::text as parent_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
    union all
    select 'index', ic.relname, tc.relname
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_class tc on tc.oid = i.indrelid
    join pg_namespace n on n.oid = tc.relnamespace
    where n.nspname = 'public' and ic.relkind in ('i', 'I')
    union all
    select 'constraint', con.conname, c.relname
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
    union all
    select 'trigger', t.tgname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
    union all
    select 'policy', pol.polname, c.relname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) obj
  where exists (
    select 1
    from oms_relation rel
    where left(obj.name, length(rel.old_name)) = rel.old_name
  );

  if exists (
    select 1 from oms_obj
    where kind in ('sequence', 'index')
    group by kind, new_name
    having count(*) > 1
  ) then
    raise exception 'OMS rename would collide on a sequence or index name';
  end if;

  if exists (
    select 1 from oms_obj
    where kind in ('constraint', 'trigger', 'policy')
    group by kind, parent_name, new_name
    having count(*) > 1
  ) then
    raise exception 'OMS rename would collide on a constraint, trigger, or policy name';
  end if;

  for rec in
    select * from oms_obj
    where kind = 'constraint'
    order by length(old_name) desc, old_name
  loop
    execute format(
      'alter table public.%I rename constraint %I to %I',
      rec.parent_name, rec.old_name, rec.new_name
    );
    insert into oms_token (old_name, new_name)
    values (rec.old_name, rec.new_name)
    on conflict (old_name) do nothing;
  end loop;

  -- В PG 17 переименование unique/PK-ограничения переименовывает и одноимённый индекс.
  -- Индекс, который ещё носит старое имя, переименовываем отдельно.
  for rec in
    select * from oms_obj
    where kind in ('sequence', 'index', 'trigger', 'policy')
    order by length(old_name) desc, old_name, kind
  loop
    if rec.kind = 'sequence' and exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'S' and c.relname = rec.old_name
    ) then
      execute format('alter sequence public.%I rename to %I', rec.old_name, rec.new_name);
    elsif rec.kind = 'index' and exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('i', 'I') and c.relname = rec.old_name
    ) then
      execute format('alter index public.%I rename to %I', rec.old_name, rec.new_name);
    elsif rec.kind = 'trigger' and exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not t.tgisinternal and c.relname = rec.parent_name and t.tgname = rec.old_name
    ) then
      execute format(
        'alter trigger %I on public.%I rename to %I',
        rec.old_name, rec.parent_name, rec.new_name
      );
    elsif rec.kind = 'policy' and exists (
      select 1 from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = rec.parent_name and pol.polname = rec.old_name
    ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        rec.old_name, rec.parent_name, rec.new_name
      );
    end if;

    insert into oms_token (old_name, new_name)
    values (rec.old_name, rec.new_name)
    on conflict (old_name) do nothing;
  end loop;

  for rec in
    select rel.old_name, rel.new_name, c.relkind
    from oms_relation rel
    join pg_class c on c.relname = rel.old_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.relkind in ('r', 'v')
    order by length(rel.old_name) desc
  loop
    if rec.relkind = 'v' then
      execute format('alter view public.%I rename to %I', rec.old_name, rec.new_name);
    else
      execute format('alter table public.%I rename to %I', rec.old_name, rec.new_name);
    end if;
  end loop;

  if exists (
    select 1
    from oms_relation rel
    join pg_class c on c.relname = rel.old_name
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.relkind in ('r', 'v')
  ) then
    raise exception 'an OMS relation was not renamed';
  end if;

  if (
    select count(*)
    from unnest(relation_names) as name
    where not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      where c.relname = 'store_oms_' || substring(name from 7)
        and c.relkind in ('r', 'v')
    )
  ) > 0 then
    raise exception 'an expected OMS relation is missing after rename';
  end if;

  -- Сначала rename функции: гранты и триггеры остаются на том же OID.
  for rec in
    select
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and left(p.proname, 6) = 'store_'
      and left(p.proname, 10) <> 'store_oms_'
      and p.proname <> all (keep_names)
    order by length(p.proname) desc, p.proname
  loop
    target_name := case
      when rec.proname = 'store_customer_order_oms_payload' then 'store_oms_customer_order_payload'
      else 'store_oms_' || substring(rec.proname from 7)
    end;
    execute format(
      'alter function public.%I(%s) rename to %I',
      rec.proname,
      rec.args,
      target_name
    );
    insert into oms_token (old_name, new_name)
    values (rec.proname, target_name)
    on conflict (old_name) do nothing;
  end loop;

  foreach target_name in array keep_names loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = target_name
    ) then
      raise exception 'directory or PIM function % is missing', target_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and left(p.proname, 6) = 'store_'
      and left(p.proname, 10) <> 'store_oms_'
      and p.proname <> all (keep_names)
  ) then
    raise exception 'an OMS function was not renamed';
  end if;

  -- Тела всех функций public: старые имена → новые, длинные раньше коротких.
  for rec in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
  loop
    fn_name := rec.proname;
    original := rec.src;
    new_def := original;
    for tok in
      select t.old_name, t.new_name
      from oms_token t
      where position(t.old_name in new_def) > 0
      order by length(t.old_name) desc, t.old_name desc
    loop
      new_def := regexp_replace(new_def, '\m' || tok.old_name || '\M', tok.new_name, 'g');
    end loop;
    new_def := replace(new_def, 'Логистики', 'OMS');
    new_def := replace(new_def, 'логистики', 'OMS');

    if new_def is distinct from original then
      begin
        execute new_def;
      exception when others then
        raise exception 'rebuilding function % failed: %', fn_name, sqlerrm;
      end;
    end if;
  end loop;

  -- COMMENT: русские описания сохраняются, старые имена и «логистики» заменяются.
  create temp table oms_comment (
    objoid oid,
    classoid oid,
    objsubid integer,
    description text,
    primary key (objoid, classoid, objsubid)
  ) on commit drop;

  insert into oms_comment (objoid, classoid, objsubid, description)
  select d.objoid, d.classoid, d.objsubid, d.description
  from pg_description d
  join pg_class c on d.classoid = 'pg_class'::regclass and c.oid = d.objoid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  union all
  select d.objoid, d.classoid, d.objsubid, d.description
  from pg_description d
  join pg_proc p on d.classoid = 'pg_proc'::regclass and p.oid = d.objoid
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  union all
  select d.objoid, d.classoid, d.objsubid, d.description
  from pg_description d
  join pg_constraint con on d.classoid = 'pg_constraint'::regclass and con.oid = d.objoid
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  union all
  select d.objoid, d.classoid, d.objsubid, d.description
  from pg_description d
  join pg_type t on d.classoid = 'pg_type'::regclass and t.oid = d.objoid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public';

  for rec in select * from oms_comment loop
    new_def := rec.description;
    for tok in
      select t.old_name, t.new_name
      from oms_token t
      where position(t.old_name in new_def) > 0
      order by length(t.old_name) desc, t.old_name desc
    loop
      new_def := regexp_replace(new_def, '\m' || tok.old_name || '\M', tok.new_name, 'g');
    end loop;
    new_def := replace(new_def, 'Логистики', 'OMS');
    new_def := replace(new_def, 'логистики', 'OMS');
    if new_def is distinct from rec.description then
      update pg_description
      set description = new_def
      where objoid = rec.objoid
        and classoid = rec.classoid
        and objsubid = rec.objsubid;
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join oms_token tok on p.prosrc ~ ('\m' || tok.old_name || '\M')
    where n.nspname = 'public'
  ) then
    raise exception 'a public function body still names an old OMS object';
  end if;

  if exists (
    select 1
    from oms_relation rel
    where exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('i', 'I', 'S')
        and left(c.relname, length(rel.old_name)) = rel.old_name
    )
    or exists (
      select 1
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and left(con.conname, length(rel.old_name)) = rel.old_name
    )
    or exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
        and left(t.tgname, length(rel.old_name)) = rel.old_name
    )
    or exists (
      select 1
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and left(pol.polname, length(rel.old_name)) = rel.old_name
    )
  ) then
    raise exception 'a sequence, index, constraint, trigger, or policy still starts with an old OMS name';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'store_product_variant_logistics'
  ) then
    raise exception 'store_product_variant_logistics must stay a PIM table';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'store_create_warehouse'
      and p.prosrc ~ '\mstore_oms_new_stock_location\M'
  ) then
    raise exception 'store_create_warehouse must call store_oms_new_stock_location';
  end if;

  notify pgrst, 'reload schema';
end
$oms$;

comment on column public.store_plant.name is
  'Название завода. Показывать только в справочнике /store/plants; в прочих экранах — код PLT-{id}.';
