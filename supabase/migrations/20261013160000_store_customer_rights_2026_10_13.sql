-- Права заказчика в заказе клиента: источник, автор, заметка и расчётная стоимость открыты.
-- Курсы — отдельное правило и заказчику закрыты. Загрузка и удаление файлов открыты обеим ролям.

insert into public.store_role_visibility (page, element_key, label, manager_visible, customer_visible, sort_order) values
  ('customer_order', 'order.edit', 'Правка полей: срок, заметка, сумма, валюта, платежи, количество', true, false, 20),
  ('customer_order', 'header.source', 'Шапка: способ оформления (склад региона или площадка)', true, true, 30),
  ('customer_order', 'header.author', 'Шапка: автор', true, true, 60),
  ('customer_order', 'header.note', 'Шапка: заметка', true, true, 70),
  ('customer_order', 'money.estimate', 'Деньги: расчётная стоимость', true, true, 180),
  ('customer_order', 'money.rates', 'Деньги: курсы валют', true, false, 185),
  ('customer_order', 'files.manage', 'Файлы: загрузка и удаление', true, true, 215)
on conflict (page, element_key) do update set
  label = excluded.label,
  customer_visible = excluded.customer_visible;
