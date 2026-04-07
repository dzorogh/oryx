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
  position: string;
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
  about?: string;
};

const MARCH_2026_WORK_CALENDAR_DAYS: TeamProfileCalendarDay[] = [
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
];

const MARCH_2026_WORK_CALENDAR: TeamProfileCalendarMonth = {
  monthLabel: "March 2026",
  days: MARCH_2026_WORK_CALENDAR_DAYS,
};

export const TEAM_PROFILE_DEMO_DATA: TeamProfileData[] = [
  {
    id: "1",
    fullName: "Sergey Indenbom",
    avatarUrl: "https://loremflickr.com/320/320/man,avatar?lock=team-sergey-indenbom",
    role: "Project manager",
    position: "Project manager",
    email: "s.indenbom@globaldrive.ru",
    phone: "8 (903) 734-97-57",
    city: "Moscow",
    experience: "4 years 1 month",
    federalDistrict: "Moscow Federal District",
    branch: "Moscow (Head Office, City)",
    department: "Отдел разработки",
    headOfDepartment: "Отдел разработки",
    supervisor: "Tarasenko Evgeniy",
    statusBadges: ["Guru", "Absent"],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (903) 734-97-57", href: "tel:+79037349757" },
      { channel: "email", label: "Почта", value: "s.indenbom@globaldrive.ru", href: "mailto:s.indenbom@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team1", href: "https://t.me/team1" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79037349757", href: "https://wa.me/79037349757" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/1", href: "/team/users/1" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "MacBook Pro 14", inventoryId: "IT-101", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-102", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell UltraSharp 27", inventoryId: "ACC-103", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-104", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["High Output Management", "Inspired", "Atomic Habits"] },
      { title: "Фильмы и сериалы", items: ["Moneyball", "The Social Network", "Severance"] },
      { title: "Темы", items: ["Product delivery", "System thinking", "Team rituals", "Motorsport"] },
    ],
    orgAssignments: [
      { name: "Отдел разработки", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Business system development", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Frontend Squad", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Backend Squad", roleLabel: "Участник подразделения", isLead: false },
    ],
    about: "Продакт, менеджер и немного инженер. Верю, что лучшие продукты делаются на стыке эмпатии, данных и здравого смысла. В свободное время катаю на велосипеде и читаю сай-фай.",
  },
  {
    id: "6081",
    fullName: "Абакумова Анастасия",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-abakumova",
    role: "Content manager",
    position: "Trainee",
    email: "employee6081@globaldrive.ru",
    phone: "8 (905) 110-60-81",
    city: "Нижний Новгород",
    experience: "1 year 3 months",
    federalDistrict: "Volga Federal District 2",
    branch: "Нижний Новгород Литвинова",
    department: "Content Sites",
    headOfDepartment: "Content Sites",
    supervisor: "Семенова Ольга",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (905) 110-60-81", href: "tel:+79051106081" },
      { channel: "email", label: "Почта", value: "employee6081@globaldrive.ru", href: "mailto:employee6081@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team6081", href: "https://t.me/team6081" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79051106081", href: "https://wa.me/79051106081" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/6081", href: "/team/users/6081" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "MacBook Air 13", inventoryId: "IT-608101", status: "assigned", note: "Рабочая станция контент-менеджера" },
      { category: "Телефон", name: "iPhone 14", inventoryId: "MOB-608102", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "LG Ergo 27", inventoryId: "ACC-608103", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-608104", status: "service", note: "Плановая замена в сервисе" },
    ],
    interests: [
      { title: "Книги", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Фильмы и сериалы", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Темы", items: ["Контент-стратегия", "Редактура", "AI tools"] },
    ],
    orgAssignments: [
      { name: "Content Sites", roleLabel: "Участник подразделения", isLead: false },
      { name: "Corp portal and 1C", roleLabel: "Участник подразделения", isLead: false },
    ],
  },
  {
    id: "2973",
    fullName: "Абгарян Артур",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-abgaryan",
    role: "Store director",
    position: "Head of the branch",
    email: "employee2973@globaldrive.ru",
    phone: "8 (914) 220-29-73",
    city: "Находка",
    experience: "6 years 5 months",
    federalDistrict: "DVFO",
    branch: "Находка",
    department: "Отдел продаж",
    headOfDepartment: "Отдел продаж",
    supervisor: "Ковалёв Андрей",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (914) 220-29-73", href: "tel:+79142202973" },
      { channel: "email", label: "Почта", value: "employee2973@globaldrive.ru", href: "mailto:employee2973@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team2973", href: "https://t.me/team2973" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79142202973", href: "https://wa.me/79142202973" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/2973", href: "/team/users/2973" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "Dell Latitude 7440", inventoryId: "IT-297301", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-297302", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Plantronics Voyager", inventoryId: "ACC-297303", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-297304", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Фильмы и сериалы", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Темы", items: ["Retail operations", "Leadership", "Store metrics"] },
    ],
    orgAssignments: [
      { name: "Отдел продаж", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Находка", roleLabel: "Руководитель подразделения", isLead: true },
    ],
  },
  {
    id: "2496",
    fullName: "Абрахманов Ильнар",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-abrahmanov",
    role: "Store director",
    position: "Head of the branch",
    email: "employee2496@globaldrive.ru",
    phone: "8 (927) 140-24-96",
    city: "Набережные Челны",
    experience: "5 years 2 months",
    federalDistrict: "Povolzhye",
    branch: "Набережные Челны",
    department: "Отдел продаж",
    headOfDepartment: "Отдел продаж",
    supervisor: "Ковалёв Андрей",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (927) 140-24-96", href: "tel:+79271402496" },
      { channel: "email", label: "Почта", value: "employee2496@globaldrive.ru", href: "mailto:employee2496@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team2496", href: "https://t.me/team2496" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79271402496", href: "https://wa.me/79271402496" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/2496", href: "/team/users/2496" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "Dell Latitude 7440", inventoryId: "IT-249601", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-249602", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell Dock WD22", inventoryId: "ACC-249603", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-249604", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Фильмы и сериалы", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Темы", items: ["Operations", "Process improvement", "Team health"] },
    ],
    orgAssignments: [
      { name: "Отдел продаж", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Набережные Челны", roleLabel: "Руководитель подразделения", isLead: true },
    ],
  },
  {
    id: "5558",
    fullName: "Абдуллаева Евгения",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-abdullaeva",
    role: "Accountant-operator",
    position: "Accountant",
    email: "employee5558@globaldrive.ru",
    phone: "8 (913) 330-55-58",
    city: "Новосибирск",
    experience: "3 years 7 months",
    federalDistrict: "SFO 2",
    branch: "Новосибирск",
    department: "Финансовый отдел",
    headOfDepartment: "Финансовый отдел",
    supervisor: "Миронова Елена",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (913) 330-55-58", href: "tel:+79133305558" },
      { channel: "email", label: "Почта", value: "employee5558@globaldrive.ru", href: "mailto:employee5558@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team5558", href: "https://t.me/team5558" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79133305558", href: "https://wa.me/79133305558" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/5558", href: "/team/users/5558" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "Lenovo ThinkPad T14", inventoryId: "IT-555801", status: "assigned", note: "Рабочее устройство" },
      { category: "Телефон", name: "iPhone 14", inventoryId: "MOB-555802", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell UltraSharp 24", inventoryId: "ACC-555803", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-555804", status: "service", note: "Плановая замена в сервисе" },
    ],
    interests: [
      { title: "Книги", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Фильмы и сериалы", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Темы", items: ["Финансовый контроль", "Документооборот", "Автоматизация"] },
    ],
    orgAssignments: [
      { name: "Финансовый отдел", roleLabel: "Участник подразделения", isLead: false },
      { name: "Novosibirsk", roleLabel: "Участник подразделения", isLead: false },
    ],
  },
  {
    id: "4022",
    fullName: "Петрова Анна",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-petrova",
    role: "Frontend Developer",
    position: "Senior specialist",
    email: "employee4022@globaldrive.ru",
    phone: "8 (926) 180-40-22",
    city: "Moscow",
    experience: "2 years 4 months",
    federalDistrict: "Moscow Federal District",
    branch: "Moscow (Head Office, City)",
    department: "IT",
    headOfDepartment: "IT",
    supervisor: "Козлов Алексей",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (926) 180-40-22", href: "tel:+79261804022" },
      { channel: "email", label: "Почта", value: "employee4022@globaldrive.ru", href: "mailto:employee4022@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4022", href: "https://t.me/team4022" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79261804022", href: "https://wa.me/79261804022" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/4022", href: "/team/users/4022" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "MacBook Pro 14", inventoryId: "IT-402201", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 14", inventoryId: "MOB-402202", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell UltraSharp 27", inventoryId: "ACC-402203", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-402204", status: "service", note: "Плановая замена в сервисе" },
    ],
    interests: [
      { title: "Книги", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Фильмы и сериалы", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Темы", items: ["React", "Design systems", "DX"] },
    ],
    orgAssignments: [
      { name: "IT", roleLabel: "Участник подразделения", isLead: false },
      { name: "Frontend Squad", roleLabel: "Участник подразделения", isLead: false },
    ],
  },
  {
    id: "4023",
    fullName: "Смирнов Илья",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-smirnov",
    role: "Logistics Manager",
    position: "Manager",
    email: "employee4023@globaldrive.ru",
    phone: "8 (921) 550-40-23",
    city: "Санкт-Петербург",
    experience: "4 years 9 months",
    federalDistrict: "North-West Federal District",
    branch: "Санкт-Петербург",
    department: "Логистика",
    headOfDepartment: "Логистика",
    supervisor: "Фролов Максим",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (921) 550-40-23", href: "tel:+79215504023" },
      { channel: "email", label: "Почта", value: "employee4023@globaldrive.ru", href: "mailto:employee4023@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4023", href: "https://t.me/team4023" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79215504023", href: "https://wa.me/79215504023" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/4023", href: "/team/users/4023" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "Dell Latitude 7440", inventoryId: "IT-402301", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 14", inventoryId: "MOB-402302", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Zebra TC22", inventoryId: "ACC-402303", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-402304", status: "service", note: "Плановая замена в сервисе" },
    ],
    interests: [
      { title: "Книги", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Фильмы и сериалы", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Темы", items: ["Supply chain", "Warehouse flow", "Transport planning"] },
    ],
    orgAssignments: [
      { name: "Логистика", roleLabel: "Участник подразделения", isLead: false },
      { name: "Warehouse and transport", roleLabel: "Участник подразделения", isLead: false },
    ],
  },
  {
    id: "4024",
    fullName: "Соколова Мария",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-sokolova",
    role: "HR Partner",
    position: "Partner",
    email: "employee4024@globaldrive.ru",
    phone: "8 (915) 470-40-24",
    city: "Ярославль",
    experience: "5 years 1 month",
    federalDistrict: "Central Federal District",
    branch: "Ярославль",
    department: "HR",
    headOfDepartment: "HR",
    supervisor: "Субботина Дарья",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (915) 470-40-24", href: "tel:+79154704024" },
      { channel: "email", label: "Почта", value: "employee4024@globaldrive.ru", href: "mailto:employee4024@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4024", href: "https://t.me/team4024" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79154704024", href: "https://wa.me/79154704024" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/4024", href: "/team/users/4024" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "MacBook Air 13", inventoryId: "IT-402401", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-402402", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell UltraSharp 27", inventoryId: "ACC-402403", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-402404", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Фильмы и сериалы", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Темы", items: ["People ops", "Recruitment", "Adaptation"] },
    ],
    orgAssignments: [
      { name: "HR", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Recruitment and adaptation", roleLabel: "Руководитель подразделения", isLead: true },
    ],
  },
  {
    id: "4025",
    fullName: "Волков Дмитрий",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-volkov",
    role: "Account Manager",
    position: "Lead manager",
    email: "employee4025@globaldrive.ru",
    phone: "8 (912) 610-40-25",
    city: "Екатеринбург",
    experience: "3 years 11 months",
    federalDistrict: "Ural Federal District",
    branch: "Екатеринбург",
    department: "Sales",
    headOfDepartment: "Sales",
    supervisor: "Васильев Кирилл",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (912) 610-40-25", href: "tel:+79126104025" },
      { channel: "email", label: "Почта", value: "employee4025@globaldrive.ru", href: "mailto:employee4025@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4025", href: "https://t.me/team4025" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79126104025", href: "https://wa.me/79126104025" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/4025", href: "/team/users/4025" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "Dell Latitude 7440", inventoryId: "IT-402501", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-402502", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Dell Dock WD22", inventoryId: "ACC-402503", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-402504", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Фильмы и сериалы", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Темы", items: ["B2B sales", "Negotiations", "Pipeline"] },
    ],
    orgAssignments: [
      { name: "Sales", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "B2B accounts", roleLabel: "Руководитель подразделения", isLead: true },
    ],
  },
  {
    id: "4026",
    fullName: "Егорова Светлана",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-egorova",
    role: "Support Lead",
    position: "Team lead",
    email: "employee4026@globaldrive.ru",
    phone: "8 (913) 620-40-26",
    city: "Красноярск",
    experience: "4 years 6 months",
    federalDistrict: "SFO 1",
    branch: "Красноярск",
    department: "Support",
    headOfDepartment: "Support",
    supervisor: "Кузнецова Ирина",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Телефон", value: "8 (913) 620-40-26", href: "tel:+79136204026" },
      { channel: "email", label: "Почта", value: "employee4026@globaldrive.ru", href: "mailto:employee4026@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4026", href: "https://t.me/team4026" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79136204026", href: "https://wa.me/79136204026" },
      { channel: "internal", label: "Внутренний профиль", value: "Employee card / team/users/4026", href: "/team/users/4026" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Ноутбук", name: "MacBook Pro 14", inventoryId: "IT-402601", status: "assigned", note: "Основное рабочее устройство" },
      { category: "Телефон", name: "iPhone 15", inventoryId: "MOB-402602", status: "assigned", note: "Корпоративная SIM" },
      { category: "Аксессуар", name: "Jabra Evolve2 65", inventoryId: "ACC-402603", status: "assigned" },
      { category: "Токен", name: "YubiKey 5 NFC", inventoryId: "SEC-402604", status: "reserve", note: "Резервный ключ MFA" },
    ],
    interests: [
      { title: "Книги", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Фильмы и сериалы", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Темы", items: ["Customer care", "Escalations", "Knowledge base"] },
    ],
    orgAssignments: [
      { name: "Support", roleLabel: "Руководитель подразделения", isLead: true },
      { name: "Customer care", roleLabel: "Руководитель подразделения", isLead: true },
    ],
  },
];

export const TEAM_PROFILE_DEMO_IDS = TEAM_PROFILE_DEMO_DATA.map((profile) => profile.id);

export const getTeamProfileDemoById = (id: string) =>
  TEAM_PROFILE_DEMO_DATA.find((profile) => profile.id === id) ?? null;
