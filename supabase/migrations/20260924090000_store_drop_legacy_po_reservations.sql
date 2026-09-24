-- Резерв на месте заказа на производство больше не существует (резерв держит выпуск).
-- Удаляем оставшиеся демо-документы резерва на таких местах: у них нет проводок в ledger.
-- Защитные триггеры запрещают удаление документов, поэтому выключаем их только на время очистки.

begin;

create temp table legacy_po_rsv on commit drop as
select r.id
from public.store_reservation r
join public.store_stock_location sl on sl.id = r.location_id
where sl.kind = 'production_order'
  and not exists (select 1 from public.store_stock_transaction t where t.document_id = r.id);

alter table public.store_document_product_line disable trigger store_document_product_line_guard;
alter table public.store_document_history disable trigger store_document_history_no_update;
alter table public.store_document disable trigger store_document_header_guard;

delete from public.store_document_product_line where document_id in (select id from legacy_po_rsv);
delete from public.store_document_history where document_id in (select id from legacy_po_rsv);
delete from public.store_reservation where id in (select id from legacy_po_rsv);
delete from public.store_document where id in (select id from legacy_po_rsv);

alter table public.store_document enable trigger store_document_header_guard;
alter table public.store_document_history enable trigger store_document_history_no_update;
alter table public.store_document_product_line enable trigger store_document_product_line_guard;

commit;
