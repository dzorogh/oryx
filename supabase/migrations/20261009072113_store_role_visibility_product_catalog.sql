-- Правила видимости карточки товара и каталога: менеджерские действия скрыты от заказчика.

begin;

comment on column public.store_role_visibility.page is
  'Страница: customer_order — карточка заказа клиента, product — карточка товара, catalog — список товаров.';

insert into public.store_role_visibility (page, element_key, label, manager_visible, customer_visible, sort_order) values
  ('product', 'variants.add', 'Варианты: добавить вариант', true, false, 10),
  ('product', 'variants.archived', 'Варианты: показать архивные', true, false, 20),
  ('product', 'tab.logistics', 'Вкладка «Логистика»: остатки складов, движение, журнал документов', true, false, 30),
  ('product', 'logistics.production', 'Логистика: создать заказ на производство', true, false, 40),
  ('catalog', 'catalog.add', 'Кнопка «Добавить» товар или вариант', true, false, 10)
on conflict (page, element_key) do nothing;

commit;
