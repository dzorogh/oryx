/** Рубрика материала (значение «all» используется только в фильтрах, не в данных). */
export type NewsItemRubric = Exclude<NewsRubric, "all">;

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string;
  likes: number;
  rubric: NewsItemRubric;
};

export type NewsRubric = "all" | "it" | "company" | "hr" | "logistics";

export const NEWS_RUBRIC_LABELS: Record<Exclude<NewsRubric, "all">, string> = {
  it: "IT",
  company: "Компания",
  hr: "HR",
  logistics: "Логистика",
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "news-1",
    title: "IT Department will accept all requests exclusively through the Service Desk system",
    excerpt: "С сентября все обращения в IT принимаются только через Service Desk — без исключений.",
    imageUrl: "https://loremflickr.com/1600/900/support,office?lock=1",
    publishedAt: "1 ч назад",
    likes: 120,
    rubric: "it",
  },
  {
    id: "news-2",
    title: "Новости IT: сентябрь 2025",
    excerpt: "Обзор релизов, инцидентов и планов команды на месяц.",
    imageUrl: "https://loremflickr.com/1600/900/technology,computer?lock=2",
    publishedAt: "2 ч назад",
    likes: 127,
    rubric: "company",
  },
  {
    id: "news-3",
    title: "Пушистые друзья команды GLOBADRIVE",
    excerpt: "Фото и истории о питомцах коллег: познакомьтесь с командой ближе.",
    imageUrl: "https://loremflickr.com/1600/900/pet,dog?lock=3",
    publishedAt: "3 ч назад",
    likes: 134,
    rubric: "hr",
  },
  {
    id: "news-4",
    title: "Новый сезон корпоративного мотоклуба уже открыт",
    excerpt: "Регистрация на сезон открыта, расписание выездов и встреч в календаре.",
    imageUrl: "https://loremflickr.com/1600/900/motorcycle,road?lock=4",
    publishedAt: "4 ч назад",
    likes: 141,
    rubric: "logistics",
  },
  {
    id: "news-5",
    title: "Обновление политики информационной безопасности",
    excerpt: "Что изменилось в требованиях к паролям, доступам и рабочим устройствам.",
    imageUrl: "https://loremflickr.com/1600/900/security,computer?lock=5",
    publishedAt: "5 ч назад",
    likes: 148,
    rubric: "it",
  },
  {
    id: "news-6",
    title: "Новый график технических работ на выходные",
    excerpt: "Окна обслуживания сдвинуты: проверьте, не затронет ли это ваши задачи.",
    imageUrl: "https://loremflickr.com/1600/900/computer,office?lock=6",
    publishedAt: "6 ч назад",
    likes: 155,
    rubric: "company",
  },
  {
    id: "news-7",
    title: "Запущен внутренний курс по аналитике данных",
    excerpt: "Практикум по SQL и визуализации: места ограничены, запись по внутренней ссылке.",
    imageUrl: "https://loremflickr.com/1600/900/data,computer?lock=7",
    publishedAt: "1 ч назад",
    likes: 162,
    rubric: "hr",
  },
  {
    id: "news-8",
    title: "Команда логистики завершила квартал с рекордом",
    excerpt: "Итоги квартала и благодарность команде за стабильные поставки.",
    imageUrl: "https://loremflickr.com/1600/900/warehouse,truck?lock=8",
    publishedAt: "2 ч назад",
    likes: 169,
    rubric: "logistics",
  },
  {
    id: "news-9",
    title: "Новые шаблоны документов доступны в каталоге",
    excerpt: "Унифицированные формы ускорят согласования и уменьшат число правок.",
    imageUrl: "https://loremflickr.com/1600/900/document,office?lock=9",
    publishedAt: "3 ч назад",
    likes: 176,
    rubric: "it",
  },
  {
    id: "news-10",
    title: "Релиз мобильного приложения для сотрудников",
    excerpt: "Что нового в приложении: уведомления, офлайн и быстрые действия.",
    imageUrl: "https://loremflickr.com/1600/900/mobile,smartphone?lock=10",
    publishedAt: "4 ч назад",
    likes: 183,
    rubric: "company",
  },
  {
    id: "news-11",
    title: "Переезд части сервисов в новую инфраструктуру",
    excerpt: "Миграция пройдёт поэтапно; расписание и FAQ опубликованы в базе знаний.",
    imageUrl: "https://loremflickr.com/1600/900/cloud,computer?lock=11",
    publishedAt: "5 ч назад",
    likes: 190,
    rubric: "hr",
  },
  {
    id: "news-12",
    title: "Старт программы менторства для новых коллег",
    excerpt: "Пара наставник — новичок: как записаться и чего ожидать от программы.",
    imageUrl: "https://loremflickr.com/1600/900/teamwork,people?lock=12",
    publishedAt: "6 ч назад",
    likes: 197,
    rubric: "logistics",
  },
  {
    id: "news-13",
    title: "Обновлены SLA по заявкам Service Desk",
    excerpt: "Сроки реакции и эскалации обновлены; таблица доступна в Confluence.",
    imageUrl: "https://loremflickr.com/1600/900/support,computer?lock=13",
    publishedAt: "1 ч назад",
    likes: 204,
    rubric: "it",
  },
  {
    id: "news-14",
    title: "В офисе открыта новая зона совместной работы",
    excerpt: "Коворкинг с переговорками на час: бронирование через внутренний портал.",
    imageUrl: "https://loremflickr.com/1600/900/office,workspace?lock=14",
    publishedAt: "2 ч назад",
    likes: 211,
    rubric: "company",
  },
  {
    id: "news-15",
    title: "Утвержден план развития платформы на квартал",
    excerpt: "Приоритеты развития продукта и зависимости между командами.",
    imageUrl: "https://loremflickr.com/1600/900/meeting,business?lock=15",
    publishedAt: "3 ч назад",
    likes: 218,
    rubric: "hr",
  },
  {
    id: "news-16",
    title: "Внедрены новые дашборды для руководителей",
    excerpt: "Единая точка входа к метрикам отделов и дочерних юрлиц.",
    imageUrl: "https://loremflickr.com/1600/900/analytics,business?lock=16",
    publishedAt: "4 ч назад",
    likes: 225,
    rubric: "logistics",
  },
  {
    id: "news-17",
    title: "Команда QA расширяет набор автотестов",
    excerpt: "Покрытие регрессии растёт; подключайте свои сервисы к пайплайну.",
    imageUrl: "https://loremflickr.com/1600/900/developer,computer?lock=17",
    publishedAt: "5 ч назад",
    likes: 232,
    rubric: "it",
  },
  {
    id: "news-18",
    title: "Опубликован новый регламент для поставщиков",
    excerpt: "Документ вступает в силу с указанной даты; обратите внимание на приложения.",
    imageUrl: "https://loremflickr.com/1600/900/contract,document?lock=18",
    publishedAt: "6 ч назад",
    likes: 239,
    rubric: "company",
  },
  {
    id: "news-19",
    title: "Обновлена база знаний по бизнес-процессам",
    excerpt: "Структура статей и поиск по тегам стали удобнее для ежедневной работы.",
    imageUrl: "https://loremflickr.com/1600/900/library,book?lock=19",
    publishedAt: "1 ч назад",
    likes: 246,
    rubric: "hr",
  },
  {
    id: "news-20",
    title: "Плановый аудит систем завершен успешно",
    excerpt: "Результаты проверки без критичных замечаний; отчёт для руководства приложен.",
    imageUrl: "https://loremflickr.com/1600/900/security,business?lock=20",
    publishedAt: "2 ч назад",
    likes: 253,
    rubric: "logistics",
  },
];
