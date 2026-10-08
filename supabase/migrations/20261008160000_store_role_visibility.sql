-- Видимость элементов страниц по ролям просмотра (менеджер / заказчик).
-- Демо-переключатель на карточке заказа клиента читает эти правила и прячет элементы.

create table public.store_role_visibility (
  page text not null,
  element_key text not null,
  label text not null,
  manager_visible boolean not null default true,
  customer_visible boolean not null default false,
  sort_order integer not null,
  primary key (page, element_key)
);

comment on table public.store_role_visibility is
  'Видимость элементов страницы по роли просмотра. Ключа нет в таблице — менеджер видит элемент, заказчик нет.';

comment on column public.store_role_visibility.page is
  'Страница: customer_order — карточка заказа клиента.';

comment on column public.store_role_visibility.element_key is
  'Ключ элемента в коде страницы, например tab.plan или header.author.';

comment on column public.store_role_visibility.label is
  'Название элемента для технического переключателя ролей.';

insert into public.store_role_visibility (page, element_key, label, manager_visible, customer_visible, sort_order) values
  ('customer_order', 'order.actions', 'Кнопки действий: в работу, закрыть, копия, отмена, резерв, отгрузка', true, false, 10),
  ('customer_order', 'order.edit', 'Правка полей: срок, заметка, сумма, валюта, курсы, платежи, количество, файлы', true, false, 20),
  ('customer_order', 'header.source', 'Шапка: способ оформления (склад региона или площадка)', true, false, 30),
  ('customer_order', 'header.region', 'Шапка: регион', true, false, 40),
  ('customer_order', 'header.tenant', 'Шапка: тенант', true, true, 50),
  ('customer_order', 'header.author', 'Шапка: автор', true, false, 60),
  ('customer_order', 'header.note', 'Шапка: заметка', true, false, 70),
  ('customer_order', 'header.fulfillment_breakdown', 'Выполнение: резерв, в производстве, не обеспечено', true, false, 80),
  ('customer_order', 'progress.stages', 'Ход заказа: производство, доставка, отгрузка', true, true, 90),
  ('customer_order', 'progress.related', 'Ход заказа: связанные резервы и возвраты', true, false, 100),
  ('customer_order', 'tab.products', 'Вкладка «Товары»', true, true, 110),
  ('customer_order', 'products.prices', 'Товары: цена и сумма', true, true, 120),
  ('customer_order', 'products.max_per_container', 'Товары: макс. в контейнере', true, true, 130),
  ('customer_order', 'products.flow', 'Товары: поток (в производстве, выпущено, в пути)', true, false, 140),
  ('customer_order', 'products.warehouse_reserve', 'Товары: резерв на складах', true, false, 150),
  ('customer_order', 'products.containers', 'Товары: сводка по контейнерам', true, true, 160),
  ('customer_order', 'tab.money', 'Вкладка «Деньги»', true, true, 170),
  ('customer_order', 'money.estimate', 'Деньги: расчётная стоимость и курсы', true, false, 180),
  ('customer_order', 'tab.plan', 'Вкладка «План»', true, false, 190),
  ('customer_order', 'tab.containers', 'Вкладка «Контейнеры»', true, true, 200),
  ('customer_order', 'tab.files', 'Вкладка «Файлы»', true, true, 210),
  ('customer_order', 'tab.comments', 'Вкладка «Комментарии»', true, true, 220),
  ('customer_order', 'tab.movements', 'Вкладка «Движения»', true, false, 230),
  ('customer_order', 'tab.history', 'Вкладка «История»', true, true, 240);

alter table public.store_role_visibility enable row level security;

create policy store_select_store_role_visibility on public.store_role_visibility
  for select to anon, authenticated using (true);

revoke all on table public.store_role_visibility from anon, authenticated;
grant select on table public.store_role_visibility to anon, authenticated;
grant all on table public.store_role_visibility to service_role;
