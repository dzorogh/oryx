import { toast } from "sonner";

const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [/Add at least one production line/i, "Добавьте хотя бы одну строку товара"],
  [/Each line needs a product and a positive quantity/i, "В каждой строке нужны товар и количество больше нуля"],
  [/Cannot add a line to a closed production order/i, "В закрытый заказ на производство нельзя добавить строку"],
  [/Product is not manufactured at this plant/i, "Этот товар не производится на выбранном заводе"],
  [/Quantity must be positive/i, "Количество должно быть больше нуля"],
  [/Allocated quantity cannot exceed the document line/i, "Размещение не может превышать строку документа"],
  [/Product must match the customer order line/i, "Товар должен совпадать со строкой заказа клиента"],
  [/Use the close operation to finish a production order/i, "Чтобы завершить, нажмите «Закрыть заказ на производство»"],
  [/Posted reservations cannot be cancelled/i, "Проведённый резерв нельзя отменить. Создайте резерв с операцией «Снятие»."],
  [/Not enough unused production quantity/i, "Недостаточно неиспользованного количества в заказе на производство"],
  [/Not enough stock/i, "Недостаточно остатка"],
  [/Not enough .+ quantity/i, "Недостаточно количества"],
  [/Cannot reserve more than the open customer order quantity/i, "Нельзя зарезервировать больше открытого количества заказа клиента"],
  [/Cannot ship more than the ordered quantity/i, "Нельзя отгрузить больше заказанного количества"],
  [/Cannot output more than the production order line/i, "Нельзя выпустить больше количества заказа на производство"],
  [/Cannot output from a closed production order/i, "Из закрытого заказа на производство выпускать нельзя"],
  [/Cannot close a production order while reserved quantity remains/i, "Не удалось снять резерв при закрытии заказа на производство"],
  [/Cancelled documents cannot be posted/i, "Отменённый документ нельзя провести"],
  [/Reservation line must belong to the customer order/i, "Строка резерва должна относиться к заказу клиента"],
  [/Shipment line must match the single customer order/i, "Строка отгрузки должна относиться к одному заказу клиента"],
  [/Return requires a posted shipment/i, "Возврат возможен только по проведённой отгрузке"],
  [/Return cannot exceed the shipped quantity/i, "Возврат не может превышать отгруженное количество"],
  [/Output product must match the production order line/i, "Товар выпуска должен совпадать со строкой заказа на производство"],
  [/Transfer must be sent before it can be delivered/i, "Сначала нужно отправить перемещение"],
  [/Delivered transfers are kept as history/i, "Доставленное перемещение остаётся в истории"],
  [/Unknown document kind/i, "Неизвестный вид документа"],
  [/Unknown product/i, "Неизвестный товар"],
  [/duplicate key value.*sku/i, "Товар с таким артикулом уже есть"],
  [/duplicate key value/i, "Такая запись уже есть"],
  [/Supabase is not configured/i, "Supabase не настроен"],
  [/Supabase returned no data/i, "Supabase не вернул данные"],
  [/Could not load logistics data/i, "Не удалось загрузить данные логистики"],
];

export const translateLogisticsError = (message: string): string => {
  for (const [pattern, translation] of ERROR_TRANSLATIONS) {
    if (pattern.test(message)) {
      return translation;
    }
  }
  return message;
};

export const runLogisticsAction = async (
  action: () => Promise<unknown>,
  success: string,
  reload: () => Promise<void>,
): Promise<boolean> => {
  try {
    await action();
    toast.success(success);
    await reload();
    return true;
  } catch (caught: unknown) {
    const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
    toast.error("Не удалось выполнить действие", {
      description: translateLogisticsError(raw),
    });
    return false;
  }
};
