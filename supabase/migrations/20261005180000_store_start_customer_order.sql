-- Заказ клиента: «В работу» — перевод черновика (draft) в in_progress.
begin;

create or replace function public.store_start_customer_order(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
begin
  perform public.store_assert_subtype_kind(p_id, 'customer_order');
  select status into v_status from public.store_document where id = p_id for update;
  if v_status = 'in_progress' then return 'ok'; end if;
  if v_status <> 'draft' then
    raise exception 'В работу можно перевести только черновик заказа клиента';
  end if;
  update public.store_document set status = 'in_progress' where id = p_id;
  return 'ok';
end;
$f$;

grant execute on function public.store_start_customer_order(bigint) to anon, authenticated, service_role;

commit;
