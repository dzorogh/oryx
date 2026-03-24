export type IdeaStatus = "new" | "review";

/** Подписи и классы бейджей статуса (без бордера, цветные фоны из палитры Corportal). */
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "Новая",
  review: "На рассмотрении",
};

export const IDEA_STATUS_BADGE_CLASS: Record<IdeaStatus, string> = {
  new: "bg-corportal-idea-status-new-bg text-corportal-idea-status-new-fg",
  review: "bg-corportal-idea-status-review-bg text-corportal-idea-status-review-fg",
};

export type IdeaItem = {
  id: string;
  title: string;
  author: string;
  status: IdeaStatus;
  likes: number;
  comments: number;
  createdAt: string;
};

const IDEA_TITLES = [
  "Добавить единый дашборд статусов по всем заказам",
  "Сократить время согласования через шаблоны решений",
  "Внедрить быстрый поиск по клиентским карточкам",
  "Добавить автоархивацию устаревших заявок",
  "Показывать SLA-риск до просрочки в списке задач",
  "Сделать экспорт отчета по упаковке в один клик",
  "Добавить массовое редактирование карточек заказов",
  "Подсветить конфликтующие изменения в согласованиях",
  "Собрать ленту изменений по заказу в одном блоке",
  "Сделать шаблоны комментариев для частых кейсов",
  "Добавить быстрые фильтры по регионам и складам",
  "Показывать загрузку команды в реальном времени",
  "Упростить форму создания заявки до 4 шагов",
  "Добавить уведомления в Telegram для критичных статусов",
  "Визуализировать просадки по SLA за неделю",
  "Внедрить автоназначение ответственного по правилам",
  "Добавить рейтинг полезности внутренних статей",
  "Собрать библиотеку типовых бизнес-процессов",
];

const AUTHORS = [
  "Анна Петрова",
  "Илья Смирнов",
  "Мария Соколова",
  "Дмитрий Волков",
  "Ольга Власова",
  "Кирилл Орлов",
];

export const IDEAS_ITEMS: IdeaItem[] = IDEA_TITLES.map((title, index) => ({
  id: `idea-${index + 1}`,
  title,
  author: AUTHORS[index % AUTHORS.length],
  status: index % 3 === 0 ? "new" : "review",
  likes: 18 + index * 5,
  comments: 2 + (index % 7),
  createdAt: `${(index % 5) + 1} ч назад`,
}));
