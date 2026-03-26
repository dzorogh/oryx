export type TeamProfileContactChannel = "phone" | "email" | "telegram" | "whatsapp" | "internal";

export type TeamProfileContact = {
  channel: TeamProfileContactChannel;
  label: string;
  value: string;
  href: string;
  note?: string;
};

export type TeamProfileCalendarDayState = "workday" | "weekend" | "vacation";

export type TeamProfileCalendarDay = {
  dayNumber: number;
  inCurrentMonth: boolean;
  state: TeamProfileCalendarDayState;
  timeRange?: string;
  label?: string;
  isToday?: boolean;
};

export type TeamProfileCalendarMonth = {
  monthLabel: string;
  days: TeamProfileCalendarDay[];
};

export type TeamProfileAssetStatus = "assigned" | "reserve" | "service";

export type TeamProfileAsset = {
  category: string;
  name: string;
  inventoryId: string;
  status: TeamProfileAssetStatus;
  note?: string;
};

export type TeamProfileInterestGroup = {
  title: string;
  items: string[];
};

export type TeamProfileOrgAssignment = {
  name: string;
  roleLabel: string;
  isLead: boolean;
};

export type TeamProfileData = {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  experience: string;
  federalDistrict: string;
  branch: string;
  department: string;
  headOfDepartment: string;
  supervisor: string;
  statusBadges: string[];
  contacts: TeamProfileContact[];
  workCalendar: TeamProfileCalendarMonth;
  assets: TeamProfileAsset[];
  interests: TeamProfileInterestGroup[];
  orgAssignments: TeamProfileOrgAssignment[];
};

export const TEAM_PROFILE_DEMO_DATA: TeamProfileData[] = [
  {
    id: "1",
    fullName: "Sergey Indenbom",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=sergey-indenbom",
    role: "Project manager",
    email: "s.indenbom@globaldrive.ru",
    phone: "8 (903) 734-97-57",
    city: "Москва",
    experience: "4 years 1 month",
    federalDistrict: "Moscow",
    branch: "Moscow (Head Office, City)",
    department: "маркетинга",
    headOfDepartment: "Отдел разработки",
    supervisor: "Tarasenko Evgeniy",
    statusBadges: ["Guru", "Absent"],
    contacts: [
      {
        channel: "phone",
        label: "Телефон",
        value: "8 (903) 734-97-57",
        href: "tel:+79037349757",
      },
      {
        channel: "email",
        label: "Почта",
        value: "s.indenbom@globaldrive.ru",
        href: "mailto:s.indenbom@globaldrive.ru",
      },
      {
        channel: "telegram",
        label: "Telegram",
        value: "@sindenbom",
        href: "https://t.me/sindenbom",
      },
      {
        channel: "whatsapp",
        label: "WhatsApp",
        value: "+7 903 734-97-57",
        href: "https://wa.me/79037349757",
      },
      {
        channel: "internal",
        label: "Внутренний профиль",
        value: "Employee card / team/1",
        href: "/team/1",
      },
    ],
    workCalendar: {
      monthLabel: "March 2026",
      days: [
        { dayNumber: 23, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 24, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 25, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 26, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 27, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 28, inCurrentMonth: false, state: "weekend", label: "Выходной" },
        { dayNumber: 1, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 2, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 3, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 4, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 5, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 6, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
        { dayNumber: 7, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 8, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 9, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 10, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 11, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 12, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 13, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
        { dayNumber: 14, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 15, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 16, inCurrentMonth: true, state: "vacation", label: "Отпуск" },
        { dayNumber: 17, inCurrentMonth: true, state: "vacation", label: "Отпуск" },
        { dayNumber: 18, inCurrentMonth: true, state: "vacation", label: "Отпуск" },
        { dayNumber: 19, inCurrentMonth: true, state: "vacation", label: "Отпуск" },
        { dayNumber: 20, inCurrentMonth: true, state: "vacation", label: "Отпуск" },
        { dayNumber: 21, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 22, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 23, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 24, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 25, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 26, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00", isToday: true },
        { dayNumber: 27, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
        { dayNumber: 28, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 29, inCurrentMonth: true, state: "weekend", label: "Выходной" },
        { dayNumber: 30, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 31, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 1, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 2, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 3, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
        { dayNumber: 4, inCurrentMonth: false, state: "weekend", label: "Выходной" },
        { dayNumber: 5, inCurrentMonth: false, state: "weekend", label: "Выходной" },
      ],
    },
    assets: [
      {
        category: "Ноутбук",
        name: "MacBook Pro 14 M3",
        inventoryId: "IT-20481",
        status: "assigned",
        note: "Основное рабочее устройство",
      },
      {
        category: "Телефон",
        name: "iPhone 15",
        inventoryId: "MOB-09311",
        status: "assigned",
        note: "Корпоративная SIM",
      },
      {
        category: "Аксессуар",
        name: "Dell UltraSharp 27",
        inventoryId: "MON-18820",
        status: "assigned",
      },
      {
        category: "Токен",
        name: "YubiKey 5 NFC",
        inventoryId: "SEC-01452",
        status: "reserve",
        note: "Резервный ключ MFA",
      },
    ],
    interests: [
      {
        title: "Книги",
        items: ["High Output Management", "Inspired", "Atomic Habits"],
      },
      {
        title: "Фильмы и сериалы",
        items: ["Moneyball", "The Social Network", "Severance"],
      },
      {
        title: "Темы",
        items: ["Product delivery", "System thinking", "Team rituals", "Motorsport"],
      },
    ],
    orgAssignments: [
      {
        name: "Business system development",
        roleLabel: "Руководитель подразделения",
        isLead: true,
      },
      {
        name: "Frontend Squad",
        roleLabel: "Руководитель подразделения",
        isLead: true,
      },
      {
        name: "Backend Squad",
        roleLabel: "Руководитель подразделения",
        isLead: true,
      },
      {
        name: "Marketing operations",
        roleLabel: "Участник подразделения",
        isLead: false,
      },
    ],
  },
];

export const TEAM_PROFILE_DEMO_IDS = TEAM_PROFILE_DEMO_DATA.map((profile) => profile.id);

export const getTeamProfileDemoById = (id: string) =>
  TEAM_PROFILE_DEMO_DATA.find((profile) => profile.id === id) ?? null;
