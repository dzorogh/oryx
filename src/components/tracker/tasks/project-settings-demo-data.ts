export type ProjectBusinessRole = "Owner" | "Admin" | "Editor" | "Viewer";

export type ProjectMember = {
  id: string;
  userId: string;
  fullName: string;
  businessRole: ProjectBusinessRole;
};

export type SystemMember = {
  id: string;
  fullName: string;
  systemRole: string;
};

export type ProjectSpace = {
  id: string;
  name: string;
};

export type ProjectDraft = {
  id: string;
  name: string;
  description: string;
  spaceId: string;
  isArchived: boolean;
};

export type ProjectSettingsSeed = {
  project: ProjectDraft;
  spaces: ProjectSpace[];
  members: ProjectMember[];
  systemMembersBySpaceId: Record<string, SystemMember[]>;
  availableUsers: Array<{ userId: string; fullName: string }>;
  businessRoles: ProjectBusinessRole[];
};

const REALISTIC_NAMES = [
  "Инденбом Сергей", "Абакумова Анастасия", "Абгарян Артур", "Абрахманов Ильнар",
  "Абдуллаева Евгения", "Петрова Анна", "Смирнов Илья", "Соколова Мария",
  "Волков Дмитрий", "Егорова Светлана", "Козлов Алексей", "Миронова Елена",
  "Фролов Максим", "Субботина Дарья", "Васильев Кирилл", "Кузнецова Ирина",
  "Тарасенко Евгений", "Семёнова Ольга", "Ковалёв Андрей", "Лебедев Павел",
  "Новикова Виктория", "Морозов Роман", "Федорова Алина", "Попов Никита",
  "Андреева Юлия", "Белов Антон", "Захарова Полина", "Орлов Тимур",
  "Шестакова Екатерина", "Громов Станислав", "Власова Наталья", "Титов Игорь",
  "Сафонова Диана", "Жуков Олег", "Борисова Татьяна", "Калинин Виталий",
  "Крылова Елизавета", "Панов Григорий", "Рябова Ксения", "Денисов Артём",
  "Гусева Оксана", "Логинов Вадим", "Щербакова Марина", "Баранов Денис",
  "Комарова Ирина", "Филиппов Константин", "Давыдова Алёна", "Степанов Михаил",
  "Костина Вероника", "Белоусов Данил",
];

const ROLE_DISTRIBUTION: ProjectBusinessRole[] = ["Owner", "Admin", "Admin", "Editor", "Editor", "Editor", "Viewer", "Viewer", "Viewer", "Viewer"];

const generateMembers = (count: number): ProjectMember[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `member-${i + 1}`,
    userId: `user-${i + 1}`,
    fullName: REALISTIC_NAMES[i % REALISTIC_NAMES.length],
    businessRole: ROLE_DISTRIBUTION[i % ROLE_DISTRIBUTION.length],
  }));

const AVAILABLE_NAMES = [
  "Чернов Александр", "Быкова Ангелина", "Зимин Георгий", "Ефимова Надежда",
  "Романов Владислав", "Макарова Валерия", "Сорокин Евгений", "Жданова Лариса",
  "Третьяков Руслан", "Мельникова Карина",
];

const generateAvailableUsers = (startId: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `user-${startId + i}`,
    fullName: AVAILABLE_NAMES[i % AVAILABLE_NAMES.length],
  }));

export const ROLE_WEIGHT: Record<ProjectBusinessRole, number> = {
  Owner: 0,
  Admin: 1,
  Editor: 2,
  Viewer: 3,
};

export const PROJECT_SETTINGS_SEED: ProjectSettingsSeed = {
  project: {
    id: "project-ecommerce",
    name: "Ecommerce",
    description: "Project for managing supplies, catalog, and team tasks.",
    spaceId: "space-team",
    isArchived: false,
  },
  spaces: [
    { id: "space-team", name: "Team Space" },
    { id: "space-logistics", name: "Logistics Space" },
    { id: "space-operations", name: "Operations Space" },
  ],
  members: generateMembers(50),
  systemMembersBySpaceId: {
    "space-team": [
      { id: "sys-1", fullName: "Тарасенко Евгений", systemRole: "Space Owner" },
      { id: "sys-2", fullName: "Козлов Алексей", systemRole: "Space Editor" },
      { id: "sys-3", fullName: "Миронова Елена", systemRole: "Space Viewer" },
    ],
    "space-logistics": [
      { id: "sys-4", fullName: "Фролов Максим", systemRole: "Space Owner" },
      { id: "sys-5", fullName: "Смирнов Илья", systemRole: "Logistics Operator" },
    ],
    "space-operations": [
      { id: "sys-6", fullName: "Ковалёв Андрей", systemRole: "Space Owner" },
      { id: "sys-7", fullName: "Лебедев Павел", systemRole: "Operations Controller" },
    ],
  },
  availableUsers: generateAvailableUsers(100, 10),
  businessRoles: ["Owner", "Admin", "Editor", "Viewer"],
};
