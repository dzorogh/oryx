export type NewsItem = {
  id: string;
  title: string;
  imageUrl: string;
  publishedAt: string;
  likes: number;
  rubric: NewsRubric;
};

export type NewsRubric = "all" | "it" | "company" | "hr" | "logistics";

const IMAGES = [
  "https://www.figma.com/api/mcp/asset/683dae38-1d8e-4ed8-854d-379618612bc1",
  "https://www.figma.com/api/mcp/asset/ed2983f8-95e3-4e0f-8fed-52251e95df19",
  "https://www.figma.com/api/mcp/asset/3ae7c6a4-e52d-462a-9248-fd66a54fdb92",
  "https://www.figma.com/api/mcp/asset/878c5e74-0ae2-4d11-9ef4-9b8e814f8b16",
];

const TITLES = [
  "IT Department will accept all requests exclusively through the Service Desk system",
  "Новости IT: сентябрь 2025",
  "Пушистые друзья команды GLOBADRIVE",
  "Новый сезон корпоративного мотоклуба уже открыт",
  "Обновление политики информационной безопасности",
  "Новый график технических работ на выходные",
  "Запущен внутренний курс по аналитике данных",
  "Команда логистики завершила квартал с рекордом",
  "Новые шаблоны документов доступны в каталоге",
  "Релиз мобильного приложения для сотрудников",
  "Переезд части сервисов в новую инфраструктуру",
  "Старт программы менторства для новых коллег",
  "Обновлены SLA по заявкам Service Desk",
  "В офисе открыта новая зона совместной работы",
  "Утвержден план развития платформы на квартал",
  "Внедрены новые дашборды для руководителей",
  "Команда QA расширяет набор автотестов",
  "Опубликован новый регламент для поставщиков",
  "Обновлена база знаний по бизнес-процессам",
  "Плановый аудит систем завершен успешно",
];

export const NEWS_ITEMS: NewsItem[] = TITLES.map((title, index) => ({
  id: `news-${index + 1}`,
  title,
  imageUrl: IMAGES[index % IMAGES.length],
  publishedAt: `${(index % 6) + 1} ч назад`,
  likes: 120 + index * 7,
  rubric: (["it", "company", "hr", "logistics"] as const)[index % 4],
}));
