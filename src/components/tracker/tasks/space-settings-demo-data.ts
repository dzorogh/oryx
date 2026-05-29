export type SpaceBusinessRole = "Owner" | "Admin" | "Editor" | "Viewer";

export type SpaceMember = {
  id: string;
  userId: string;
  fullName: string;
  businessRole: SpaceBusinessRole;
};

export type TaskStage = {
  id: string;
  name: string;
  color: string;
  order: number;
  usedInTasksCount: number;
};

export type CustomFieldType = "Text" | "Number" | "Date" | "Select";

export type CustomField = {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  isArchived: boolean;
};

export type SpaceDraft = {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  isArchived: boolean;
};

export type SpaceTenant = { id: string; name: string };

export type SpaceSettingsSeed = {
  space: SpaceDraft;
  tenants: SpaceTenant[];
  stages: TaskStage[];
  members: SpaceMember[];
  availableUsers: Array<{ userId: string; fullName: string }>;
  businessRoles: SpaceBusinessRole[];
  customFields: CustomField[];
  fieldTypes: CustomFieldType[];
};

export const STAGE_COLORS = [
  { id: "gray", label: "Gray", tw: "bg-gray-400" },
  { id: "red", label: "Red", tw: "bg-red-400" },
  { id: "orange", label: "Orange", tw: "bg-orange-400" },
  { id: "amber", label: "Amber", tw: "bg-amber-400" },
  { id: "yellow", label: "Yellow", tw: "bg-yellow-400" },
  { id: "lime", label: "Lime", tw: "bg-lime-400" },
  { id: "green", label: "Green", tw: "bg-green-400" },
  { id: "emerald", label: "Emerald", tw: "bg-emerald-400" },
  { id: "cyan", label: "Cyan", tw: "bg-cyan-400" },
  { id: "blue", label: "Blue", tw: "bg-blue-400" },
  { id: "violet", label: "Violet", tw: "bg-violet-400" },
  { id: "pink", label: "Pink", tw: "bg-pink-400" },
] as const;

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

const ROLE_DISTRIBUTION: SpaceBusinessRole[] = [
  "Owner", "Admin", "Admin", "Editor", "Editor", "Editor",
  "Viewer", "Viewer", "Viewer", "Viewer",
];

const generateMembers = (count: number): SpaceMember[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `sm-${i + 1}`,
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

export const SPACE_ROLE_WEIGHT: Record<SpaceBusinessRole, number> = {
  Owner: 0,
  Admin: 1,
  Editor: 2,
  Viewer: 3,
};

export const SPACE_SETTINGS_SEED: SpaceSettingsSeed = {
  space: {
    id: "space-team",
    name: "Team Space",
    description: "Main workspace for the development team.",
    tenantId: "tenant-oryx",
    isArchived: false,
  },
  tenants: [
    { id: "tenant-oryx", name: "Oryx" },
    { id: "tenant-north", name: "North" },
    { id: "tenant-global", name: "GlobalDrive" },
  ],
  stages: [
    { id: "stage-1", name: "Backlog", color: "bg-gray-400", order: 1, usedInTasksCount: 12 },
    { id: "stage-2", name: "To do", color: "bg-blue-400", order: 2, usedInTasksCount: 8 },
    { id: "stage-3", name: "In progress", color: "bg-amber-400", order: 3, usedInTasksCount: 5 },
    { id: "stage-4", name: "Done", color: "bg-green-400", order: 4, usedInTasksCount: 34 },
    { id: "stage-5", name: "Code review", color: "bg-violet-400", order: 5, usedInTasksCount: 3 },
    { id: "stage-6", name: "QA", color: "bg-cyan-400", order: 6, usedInTasksCount: 0 },
    { id: "stage-7", name: "Blocked", color: "bg-red-400", order: 7, usedInTasksCount: 2 },
    { id: "stage-8", name: "Won't do", color: "bg-orange-400", order: 8, usedInTasksCount: 0 },
  ],
  members: generateMembers(50),
  availableUsers: generateAvailableUsers(100, 10),
  businessRoles: ["Owner", "Admin", "Editor", "Viewer"],
  customFields: [
    { id: "cf-1", name: "Sprint", fieldType: "Select", isArchived: false },
    { id: "cf-2", name: "Story points", fieldType: "Number", isArchived: false },
    { id: "cf-3", name: "Due date", fieldType: "Date", isArchived: false },
    { id: "cf-4", name: "External link", fieldType: "Text", isArchived: false },
    { id: "cf-5", name: "Estimated hours", fieldType: "Number", isArchived: false },
    { id: "cf-6", name: "Release version", fieldType: "Text", isArchived: false },
    { id: "cf-7", name: "Legacy priority", fieldType: "Select", isArchived: true },
    { id: "cf-8", name: "Old category", fieldType: "Text", isArchived: true },
    { id: "cf-9", name: "Deprecated date", fieldType: "Date", isArchived: true },
    { id: "cf-10", name: "Removed flag", fieldType: "Number", isArchived: true },
  ],
  fieldTypes: ["Text", "Number", "Date", "Select"],
};
