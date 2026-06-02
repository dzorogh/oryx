// english-ui:ignore-file — localized name fields (en, ru, es-MX) per user-profile spec

import { EMPLOYEE_OPTIONS } from "@/components/home/thanks-demo-data";

export const USER_PROFILE_CURRENT_USER_ID = "emp-12";

/** Rich demo profiles (full block data). */
export const USER_PROFILE_DEMO_IDS = ["emp-12", "emp-08", "emp-15", "emp-22"] as const;

const LEGACY_PROFILE_IDS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "6081",
  "2973",
  "2496",
  "5558",
  "4022",
  "4023",
  "4024",
  "4025",
  "4026",
  "7101",
  "7102",
  "emp-01",
] as const;

const THANKS_ROSTER_IDS = EMPLOYEE_OPTIONS.map((employee) => employee.id);

/** All user ids pre-rendered for `/users/[id]`, `/team/users/[id]`, `/team/[id]` (static export). */
export const USER_PROFILE_ROUTE_IDS = [
  ...new Set([
    ...USER_PROFILE_DEMO_IDS,
    ...THANKS_ROSTER_IDS,
    ...LEGACY_PROFILE_IDS,
  ]),
] as const;

/** @deprecated Use USER_PROFILE_ROUTE_IDS */
export const TEAM_EMPLOYEE_REDIRECT_IDS = USER_PROFILE_ROUTE_IDS;

export type WorkStatus = "working" | "day_off" | "on_vacation" | "sick_leave" | "off_hours";

export type PreferredChannel =
  | "email"
  | "telegram"
  | "whatsapp"
  | "corporate_messenger"
  | "phone";

export type LocalizedName = {
  en: string;
  ru: string;
  "es-MX": string;
};

export type ProfileBiReport = {
  id: string;
  title: string;
  href: string;
  showInProfile: boolean;
  allowedUserIds: string[];
  tenantIds: string[];
};

export type ProfileAttendanceRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  note?: string;
};

export type ProfileCalendarDay = {
  dayNumber: number;
  inCurrentMonth: boolean;
  state: "workday" | "weekend" | "vacation" | "sick";
  timeRange?: string;
  label?: string;
  isToday?: boolean;
};

export type ProfileAssetItem = {
  id: string;
  name: string;
  inventoryId: string;
  note?: string;
};

export type ProfileAssetCategory = {
  id: string;
  label: string;
  items: ProfileAssetItem[];
};

export type ProfileDocument = {
  id: string;
  name: string;
  uploadedAt: string;
  sizeLabel: string;
};

export type ProfileDocumentCategory = {
  id: string;
  label: string;
  documents: ProfileDocument[];
};

export type TenantRoleGroup = {
  tenantId: string;
  tenantName: string;
  roles: string[];
};

export type ProfileAbility = {
  id: string;
  label: string;
  moduleId: string;
  moduleLabel: string;
};

export type ProfileDelegationEntry = {
  delegateUserId: string;
  delegateName: string;
  abilityIds: string[];
};

export type NotificationModuleSetting = {
  moduleId: string;
  moduleLabel: string;
  email: boolean;
  portal: boolean;
};

export type ProfileTechnicalParams = {
  mainTenantId: string;
  bitrixId: string;
  oneCId: string;
  anvizId: string;
  hireDate: string;
  jobRoleType: string;
  position: string;
  departments: string[];
  snils: string;
};

export type ProfilePersonal = {
  gender: string;
  birthday: string;
  hideBirthYear: boolean;
  hobbies: string;
  sports: string;
  musicArtists: string;
  favoriteMovie: string;
  favoriteBook: string;
};

export type UserProfileData = {
  id: string;
  names: LocalizedName;
  avatarUrl: string;
  workStatus: WorkStatus;
  workdayStart?: string;
  workdayEnd?: string;
  vacationEnd?: string;
  position: string;
  email: string;
  phone: string;
  telegram: string;
  whatsapp: string;
  preferredChannel: PreferredChannel;
  city: string;
  departments: string[];
  headOfDepartments: string[];
  managers: string[];
  location: string;
  district: string;
  deputyUserId?: string;
  deputyName?: string;
  personal: ProfilePersonal;
  calendarMonthLabel: string;
  calendarDays: ProfileCalendarDay[];
  attendance: ProfileAttendanceRecord[];
  tenantRoles: TenantRoleGroup[];
  instanceRoles: string[];
  abilities: ProfileAbility[];
  delegations: ProfileDelegationEntry[];
  assetCategories: ProfileAssetCategory[];
  registrantAssets: ProfileAssetItem[];
  materialAssets: ProfileAssetItem[];
  documents: ProfileDocumentCategory[];
  technical: {
    createdAt: string;
    updatedAt: string;
    params: ProfileTechnicalParams;
  };
  notifications: NotificationModuleSetting[];
  managerIds: string[];
};

const MARCH_2026_DAYS: ProfileCalendarDay[] = [
  { dayNumber: 23, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 24, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 25, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 26, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 27, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 28, inCurrentMonth: false, state: "weekend", label: "Day off" },
  { dayNumber: 1, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 2, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 3, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 4, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 5, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 6, inCurrentMonth: true, state: "workday", timeRange: "09:00–17:00" },
  { dayNumber: 7, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 8, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 9, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 10, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 11, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 12, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 13, inCurrentMonth: true, state: "workday", timeRange: "09:00–17:00" },
  { dayNumber: 14, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 15, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 16, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 17, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 18, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 19, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 20, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 21, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 22, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 23, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 24, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 25, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 26, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00", isToday: true },
  { dayNumber: 27, inCurrentMonth: true, state: "workday", timeRange: "09:00–17:00" },
  { dayNumber: 28, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 29, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 30, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 31, inCurrentMonth: true, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 1, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
  { dayNumber: 2, inCurrentMonth: false, state: "workday", timeRange: "09:00–18:00" },
];

const SHARED_ABILITIES: ProfileAbility[] = [
  { id: "pulse.view", label: "View Pulse feed", moduleId: "pulse", moduleLabel: "Pulse" },
  { id: "pulse.thanks.send", label: "Send thanks", moduleId: "pulse", moduleLabel: "Pulse" },
  { id: "tasks.view", label: "View tasks", moduleId: "tasks", moduleLabel: "Tasks" },
  { id: "tasks.edit", label: "Edit tasks", moduleId: "tasks", moduleLabel: "Tasks" },
  { id: "store.catalog", label: "Browse catalog", moduleId: "store", moduleLabel: "Store" },
  { id: "team.profile", label: "View profiles", moduleId: "team", moduleLabel: "Team" },
];

const DOCUMENT_CATEGORIES: ProfileDocumentCategory[] = [
  {
    id: "offer",
    label: "Offer agreement",
    documents: [{ id: "d1", name: "Offer_2024.pdf", uploadedAt: "2024-03-12", sizeLabel: "240 KB" }],
  },
  { id: "nda", label: "Non-disclosure agreement", documents: [] },
  { id: "material_liability", label: "Material liability agreement", documents: [] },
  { id: "exit_checklist", label: "Exit checklist", documents: [] },
  { id: "scans", label: "Document scans", documents: [] },
  { id: "other", label: "Other", documents: [] },
];

const NOTIFICATION_DEFAULTS: NotificationModuleSetting[] = [
  { moduleId: "pulse", moduleLabel: "Pulse", email: true, portal: true },
  { moduleId: "tasks", moduleLabel: "Tasks", email: true, portal: false },
  { moduleId: "store", moduleLabel: "Store", email: false, portal: true },
  { moduleId: "team", moduleLabel: "Team", email: false, portal: true },
];

const buildTestRows = () =>
  Array.from({ length: 50 }, (_, i) => ({
    id: `test-${i + 1}`,
    section: i % 3 === 0 ? "Safety" : i % 3 === 1 ? "Product" : "Compliance",
    testName: `Assessment module ${i + 1}`,
    startDate: `2025-${String((i % 12) + 1).padStart(2, "0")}-01`,
    endDate: `2025-${String((i % 12) + 1).padStart(2, "0")}-15`,
    score: 70 + (i % 30),
    status: i % 7 === 0 ? ("failed" as const) : ("passed" as const),
  }));

export const USER_PROFILE_TEST_ROWS = buildTestRows();

export const USER_PROFILE_BI_REPORTS: ProfileBiReport[] = [
  {
    id: "report-sales",
    title: "Sales overview",
    href: "/analytics/dashboards",
    showInProfile: true,
    allowedUserIds: [],
    tenantIds: ["tenant-globaldrive"],
  },
  {
    id: "report-inventory",
    title: "Inventory health",
    href: "/analytics/stocks",
    showInProfile: true,
    allowedUserIds: [],
    tenantIds: ["tenant-globaldrive", "tenant-oryxbms"],
  },
  {
    id: "report-kpis",
    title: "Operational KPIs",
    href: "/analytics/dashboard-compact",
    showInProfile: true,
    allowedUserIds: [USER_PROFILE_CURRENT_USER_ID],
    tenantIds: ["tenant-globaldrive"],
  },
];

const EMP_12: UserProfileData = {
  id: "emp-12",
  names: {
    en: "Alexey Nazarov",
    ru: "Алексей Назаров",
    "es-MX": "Alexey Nazarov",
  },
  avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp12",
  workStatus: "working",
  workdayStart: "2026-06-01T09:00:00",
  workdayEnd: "2026-06-01T18:00:00",
  position: "Senior Frontend Developer",
  email: "alexey.nazarov@example.com",
  phone: "+7 999 123-45-67",
  telegram: "@alexey.nazarov",
  whatsapp: "+7 999 123-45-67",
  preferredChannel: "telegram",
  city: "Moscow",
  departments: ["Digital Products", "Engineering"],
  headOfDepartments: ["Engineering"],
  managers: ["Maria Volkova", "Sergey Indenbom"],
  location: "HQ — Moscow office",
  district: "Central Federal District",
  personal: {
    gender: "Male",
    birthday: "1990-08-14",
    hideBirthYear: false,
    hobbies: "Photography, board games",
    sports: "Running, swimming",
    musicArtists: "Daft Punk, Khruangbin",
    favoriteMovie: "The Social Network",
    favoriteBook: "Clean Code",
  },
  calendarMonthLabel: "March 2026",
  calendarDays: MARCH_2026_DAYS,
  attendance: [
    { id: "a1", date: "2026-05-30", checkIn: "08:58", checkOut: "18:12", note: "HQ entrance" },
    { id: "a2", date: "2026-05-29", checkIn: "09:04", checkOut: "18:01" },
    { id: "a3", date: "2026-05-28", checkIn: "09:15", checkOut: "17:45", note: "Remote" },
    { id: "a4", date: "2026-05-27", checkIn: "08:55", checkOut: "18:20" },
    { id: "a5", date: "2026-05-26", checkIn: "09:00", checkOut: "18:00" },
  ],
  tenantRoles: [
    { tenantId: "tenant-globaldrive", tenantName: "Globaldrive", roles: ["User", "Catalog Editor"] },
    { tenantId: "tenant-oryxbms", tenantName: "OryxBMS", roles: ["User"] },
  ],
  instanceRoles: ["Tasks Support"],
  abilities: SHARED_ABILITIES,
  delegations: [
    {
      delegateUserId: "emp-08",
      delegateName: "Elena Kozlova",
      abilityIds: ["tasks.view", "tasks.edit"],
    },
  ],
  assetCategories: [
    {
      id: "laptops",
      label: "Laptops",
      items: [
        { id: "as1", name: "MacBook Pro 14\"", inventoryId: "IT-4421", note: "Assigned 2024" },
      ],
    },
    {
      id: "monitors",
      label: "Monitors",
      items: [],
    },
    {
      id: "phones",
      label: "Phones",
      items: [{ id: "as2", name: "iPhone 15", inventoryId: "IT-8890" }],
    },
  ],
  registrantAssets: [{ id: "r1", name: "Company vehicle pass", inventoryId: "REG-102" }],
  materialAssets: [{ id: "m1", name: "Warehouse keys set", inventoryId: "MO-55" }],
  documents: DOCUMENT_CATEGORIES,
  technical: {
    createdAt: "2022-11-03T10:00:00Z",
    updatedAt: "2026-05-28T14:22:00Z",
    params: {
      mainTenantId: "tenant-globaldrive",
      bitrixId: "BX-12098",
      oneCId: "1C-EMP-12098",
      anvizId: "ANV-4421",
      hireDate: "2022-11-03",
      jobRoleType: "Programmer",
      position: "Senior Frontend Developer",
      departments: ["Digital Products", "Engineering"],
      snils: "123-456-789 00",
    },
  },
  notifications: NOTIFICATION_DEFAULTS,
  managerIds: ["emp-01"],
};

const EMP_08: UserProfileData = {
  ...EMP_12,
  id: "emp-08",
  names: { en: "Elena Kozlova", ru: "Елена Козлова", "es-MX": "Elena Kozlova" },
  avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp08",
  workStatus: "on_vacation",
  vacationEnd: "2026-06-15",
  deputyUserId: "emp-12",
  deputyName: "Alexey Nazarov",
  position: "Team Lead",
  email: "elena.kozlova@example.com",
  managerIds: ["emp-01"],
};

const EMP_15: UserProfileData = {
  ...EMP_12,
  id: "emp-15",
  names: { en: "Dmitry Sokolov", ru: "Дмитрий Соколов", "es-MX": "Dmitry Sokolov" },
  avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp15",
  workStatus: "sick_leave",
  position: "Sales Manager",
  managerIds: ["emp-12"],
};

const EMP_22: UserProfileData = {
  ...EMP_12,
  id: "emp-22",
  names: { en: "Anna Petrova", ru: "Анна Петрова", "es-MX": "Anna Petrova" },
  avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp22",
  workStatus: "day_off",
  position: "HR Specialist",
  managerIds: ["emp-01"],
};

export const USER_PROFILE_DEMO_DATA: UserProfileData[] = [EMP_12, EMP_08, EMP_15, EMP_22];

const buildFallbackProfile = (userId: string): UserProfileData => {
  const roster = EMPLOYEE_OPTIONS.find((employee) => employee.id === userId);
  const displayName = roster?.fullName ?? `Employee ${userId}`;
  const position = roster?.role ?? "Employee";
  const department = roster?.department ?? "General";

  return {
    ...EMP_12,
    id: userId,
    names: { en: displayName, ru: displayName, "es-MX": displayName },
    avatarUrl: `https://loremflickr.com/200/200/portrait?lock=${userId}`,
    position,
    email: `${userId.replace(/[^a-z0-9]/gi, ".")}@example.com`,
    departments: [department],
    managers: [],
  };
};

export const getUserProfileDemoById = (userId: string): UserProfileData | undefined => {
  const existing = USER_PROFILE_DEMO_DATA.find((profile) => profile.id === userId);
  if (existing) {
    return existing;
  }

  if (userId === "emp-8") {
    return USER_PROFILE_DEMO_DATA.find((profile) => profile.id === "emp-08") ?? buildFallbackProfile(userId);
  }

  if (!(USER_PROFILE_ROUTE_IDS as readonly string[]).includes(userId)) {
    return undefined;
  }

  return buildFallbackProfile(userId);
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  working: "Working",
  day_off: "Day off",
  on_vacation: "On vacation",
  sick_leave: "Sick leave",
  off_hours: "Off hours",
};

export const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  email: "Email",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  corporate_messenger: "Corporate messenger",
  phone: "Phone",
};

export const DELEGATE_PICKER_OPTIONS = USER_PROFILE_DEMO_DATA.map((p) => ({
  id: p.id,
  label: p.names.en,
}));
