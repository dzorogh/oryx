import { notFound } from "next/navigation";
import { SectionPlaceholderPage } from "@/components/home/section-placeholder-page";
import { TeamDirectoryPage } from "@/components/team/team-directory-page";

type SectionConfig = {
  title: string;
  description: string;
};

const SECTION_CONFIGS: Record<string, SectionConfig> = {
  activity: {
    title: "Активность",
    description: "Раздел активностей готов к подключению данных и виджетов.",
  },
  approvals: {
    title: "Согласования",
    description: "Здесь будут отображаться карточки согласований и их статусы.",
  },
  catalog: {
    title: "Каталог",
    description: "Раздел каталога подготовлен для интеграции с контентом.",
  },
  help: {
    title: "Справка",
    description: "Здесь будет база знаний, инструкции и контакты поддержки.",
  },
  learning: {
    title: "Обучение",
    description: "Раздел обучения подготовлен для курсов и учебных материалов.",
  },
  profile: {
    title: "Профиль",
    description: "Страница профиля пользователя готова к подключению данных аккаунта.",
  },
  search: {
    title: "Поиск",
    description: "Раздел поиска готов к подключению глобального поиска по системе.",
  },
  services: {
    title: "Сервисы",
    description: "Раздел сервисов готов для размещения внутренних инструментов.",
  },
  team: {
    title: "Команда",
    description: "Раздел команды готов для карточек сотрудников и ролей.",
  },
};

export const generateStaticParams = () => Object.keys(SECTION_CONFIGS).map((section) => ({ section }));

type SectionPageProps = {
  params: Promise<{ section: string }>;
};

const SectionPage = async ({ params }: SectionPageProps) => {
  const { section } = await params;
  const config = SECTION_CONFIGS[section];
  if (!config) {
    notFound();
  }

  if (section === "team") {
    return <TeamDirectoryPage />;
  }

  return <SectionPlaceholderPage title={config.title} description={config.description} />;
};

export default SectionPage;
