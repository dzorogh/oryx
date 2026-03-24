/** Демо: благодарности, отправленные текущим пользователем (страница «Мои благодарности»). */
export type MyThankYouEntry = {
  id: string;
  recipientName: string;
  recipientDepartment: string;
  message: string;
  sentAtLabel: string;
};

export const MY_THANK_YOU_ENTRIES: MyThankYouEntry[] = [
  {
    id: "ty-1",
    recipientName: "Анна Петрова",
    recipientDepartment: "PIM",
    message: "Спасибо за оперативную помощь с заказом и сверку спецификации.",
    sentAtLabel: "20 марта 2026",
  },
  {
    id: "ty-2",
    recipientName: "Илья Смирнов",
    recipientDepartment: "Логистика",
    message: "Благодарю за координацию отгрузки в сжатые сроки.",
    sentAtLabel: "18 марта 2026",
  },
  {
    id: "ty-3",
    recipientName: "Мария Соколова",
    recipientDepartment: "HR",
    message: "Отдельное спасибо за онбординг нового коллеги в команде.",
    sentAtLabel: "15 марта 2026",
  },
];
