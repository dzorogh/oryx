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

export type TeamProfileTrainingResult = {
  id: string;
  section: string;
  testName: string;
  startDate: string;
  endDate: string;
  duration: string;
  score: number;
  status: "passed" | "failed";
};

export type TeamProfileTrainingMonthGroup = {
  monthLabel: string;
  results: TeamProfileTrainingResult[];
};

export type TeamProfileLearning = {
  summary: {
    materialsStudied: number;
    materialsTotal: number;
    testsPassed: number;
    testsTotal: number;
    averageScore: number;
  };
  history: TeamProfileTrainingMonthGroup[];
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
  learning?: TeamProfileLearning;
  about?: string;
};

const MARCH_2026_WORK_CALENDAR_DAYS: TeamProfileCalendarDay[] = [
  { dayNumber: 23, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 24, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 25, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 26, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 27, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 28, inCurrentMonth: false, state: "weekend", label: "Day off" },
  { dayNumber: 1, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 2, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 3, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 4, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 5, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 6, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
  { dayNumber: 7, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 8, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 9, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 10, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 11, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 12, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 13, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
  { dayNumber: 14, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 15, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 16, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 17, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 18, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 19, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 20, inCurrentMonth: true, state: "vacation", label: "Vacation" },
  { dayNumber: 21, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 22, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 23, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 24, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 25, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 26, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00", isToday: true },
  { dayNumber: 27, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 17:00" },
  { dayNumber: 28, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 29, inCurrentMonth: true, state: "weekend", label: "Day off" },
  { dayNumber: 30, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 31, inCurrentMonth: true, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 1, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 2, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 3, inCurrentMonth: false, state: "workday", timeRange: "09:00 - 18:00" },
  { dayNumber: 4, inCurrentMonth: false, state: "weekend", label: "Day off" },
  { dayNumber: 5, inCurrentMonth: false, state: "weekend", label: "Day off" },
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
    department: "Development Department",
    headOfDepartment: "Development Department",
    supervisor: "Tarasenko Evgeniy",
    statusBadges: ["Guru", "Absent"],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (903) 734-97-57", href: "tel:+79037349757" },
      { channel: "email", label: "Email", value: "s.indenbom@globaldrive.ru", href: "mailto:s.indenbom@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team1", href: "https://t.me/team1" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79037349757", href: "https://wa.me/79037349757" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/1", href: "/team/users/1" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "MacBook Pro 14", inventoryId: "IT-101", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-102", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell UltraSharp 27", inventoryId: "ACC-103", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-104", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["High Output Management", "Inspired", "Atomic Habits"] },
      { title: "Movies and series", items: ["Moneyball", "The Social Network", "Severance"] },
      { title: "Topics", items: ["Product delivery", "System thinking", "Team rituals", "Motorsport"] },
    ],
    orgAssignments: [
      { name: "Development Department", roleLabel: "Division lead", isLead: true },
      { name: "Business system development", roleLabel: "Division lead", isLead: true },
      { name: "Frontend Squad", roleLabel: "Division lead", isLead: true },
      { name: "Backend Squad", roleLabel: "Division member", isLead: false },
    ],
    learning: {
      summary: {
        materialsStudied: 115,
        materialsTotal: 460,
        testsPassed: 27,
        testsTotal: 92,
        averageScore: 87,
      },
      history: [
        {
          monthLabel: "February 2023",
          results: [
            { id: "1", section: "High-power motors", testName: "PLM training 40-50 hp", startDate: "06.02.2023, 14:46", endDate: "06.02.2023, 14:50", duration: "4 min. 39 sec.", score: 87, status: "passed" },
            { id: "2", section: "High-power motors", testName: "PLM training 40-50 hp", startDate: "06.02.2023, 14:38", endDate: "06.02.2023, 14:45", duration: "7 min. 14 sec.", score: 73, status: "failed" },
          ]
        },
        {
          monthLabel: "March 2023",
          results: [
             { id: "3", section: "Sales fundamentals", testName: "Cold calling techniques", startDate: "15.03.2023, 10:00", endDate: "15.03.2023, 10:20", duration: "20 min. 00 sec.", score: 95, status: "passed" },
          ]
        }
      ]
    },
    about: "Product manager and a bit of an engineer. I believe the best products are built at the intersection of empathy, data, and common sense. In my free time I ride my bike and read sci-fi.",
  },
  {
    id: "6081",
    fullName: "Anastasia Abakumova",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-abakumova",
    role: "Content manager",
    position: "Trainee",
    email: "employee6081@globaldrive.ru",
    phone: "8 (905) 110-60-81",
    city: "Nizhny Novgorod",
    experience: "1 year 3 months",
    federalDistrict: "Volga Federal District 2",
    branch: "Nizhny Novgorod Litvinova",
    department: "Content Sites",
    headOfDepartment: "Content Sites",
    supervisor: "Olga Semenova",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (905) 110-60-81", href: "tel:+79051106081" },
      { channel: "email", label: "Email", value: "employee6081@globaldrive.ru", href: "mailto:employee6081@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team6081", href: "https://t.me/team6081" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79051106081", href: "https://wa.me/79051106081" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/6081", href: "/team/users/6081" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "MacBook Air 13", inventoryId: "IT-608101", status: "assigned", note: "Content manager workstation" },
      { category: "Phone", name: "iPhone 14", inventoryId: "MOB-608102", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "LG Ergo 27", inventoryId: "ACC-608103", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-608104", status: "service", note: "Scheduled service replacement" },
    ],
    interests: [
      { title: "Books", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Movies and series", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Topics", items: ["Content strategy", "Editing", "AI tools"] },
    ],
    orgAssignments: [
      { name: "Content Sites", roleLabel: "Division member", isLead: false },
      { name: "Corp portal and 1C", roleLabel: "Division member", isLead: false },
    ],
  },
  {
    id: "2973",
    fullName: "Artur Abgaryan",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-abgaryan",
    role: "Store director",
    position: "Head of the branch",
    email: "employee2973@globaldrive.ru",
    phone: "8 (914) 220-29-73",
    city: "Nakhodka",
    experience: "6 years 5 months",
    federalDistrict: "DVFO",
    branch: "Nakhodka",
    department: "Sales Department",
    headOfDepartment: "Sales Department",
    supervisor: "Andrey Kovalev",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (914) 220-29-73", href: "tel:+79142202973" },
      { channel: "email", label: "Email", value: "employee2973@globaldrive.ru", href: "mailto:employee2973@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team2973", href: "https://t.me/team2973" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79142202973", href: "https://wa.me/79142202973" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/2973", href: "/team/users/2973" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "Dell Latitude 7440", inventoryId: "IT-297301", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-297302", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Plantronics Voyager", inventoryId: "ACC-297303", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-297304", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Movies and series", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Topics", items: ["Retail operations", "Leadership", "Store metrics"] },
    ],
    orgAssignments: [
      { name: "Sales Department", roleLabel: "Division lead", isLead: true },
      { name: "Nakhodka", roleLabel: "Division lead", isLead: true },
    ],
  },
  {
    id: "2496",
    fullName: "Ilnar Abrahmanov",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-abrahmanov",
    role: "Store director",
    position: "Head of the branch",
    email: "employee2496@globaldrive.ru",
    phone: "8 (927) 140-24-96",
    city: "Naberezhnye Chelny",
    experience: "5 years 2 months",
    federalDistrict: "Povolzhye",
    branch: "Naberezhnye Chelny",
    department: "Sales Department",
    headOfDepartment: "Sales Department",
    supervisor: "Andrey Kovalev",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (927) 140-24-96", href: "tel:+79271402496" },
      { channel: "email", label: "Email", value: "employee2496@globaldrive.ru", href: "mailto:employee2496@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team2496", href: "https://t.me/team2496" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79271402496", href: "https://wa.me/79271402496" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/2496", href: "/team/users/2496" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "Dell Latitude 7440", inventoryId: "IT-249601", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-249602", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell Dock WD22", inventoryId: "ACC-249603", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-249604", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Movies and series", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Topics", items: ["Operations", "Process improvement", "Team health"] },
    ],
    orgAssignments: [
      { name: "Sales Department", roleLabel: "Division lead", isLead: true },
      { name: "Naberezhnye Chelny", roleLabel: "Division lead", isLead: true },
    ],
  },
  {
    id: "5558",
    fullName: "Evgenia Abdullaeva",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-abdullaeva",
    role: "Accountant-operator",
    position: "Accountant",
    email: "employee5558@globaldrive.ru",
    phone: "8 (913) 330-55-58",
    city: "Novosibirsk",
    experience: "3 years 7 months",
    federalDistrict: "SFO 2",
    branch: "Novosibirsk",
    department: "Finance Department",
    headOfDepartment: "Finance Department",
    supervisor: "Elena Mironova",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (913) 330-55-58", href: "tel:+79133305558" },
      { channel: "email", label: "Email", value: "employee5558@globaldrive.ru", href: "mailto:employee5558@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team5558", href: "https://t.me/team5558" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79133305558", href: "https://wa.me/79133305558" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/5558", href: "/team/users/5558" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "Lenovo ThinkPad T14", inventoryId: "IT-555801", status: "assigned", note: "Work device" },
      { category: "Phone", name: "iPhone 14", inventoryId: "MOB-555802", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell UltraSharp 24", inventoryId: "ACC-555803", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-555804", status: "service", note: "Scheduled service replacement" },
    ],
    interests: [
      { title: "Books", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Movies and series", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Topics", items: ["Financial control", "Document management", "Automation"] },
    ],
    orgAssignments: [
      { name: "Finance Department", roleLabel: "Division member", isLead: false },
      { name: "Novosibirsk", roleLabel: "Division member", isLead: false },
    ],
  },
  {
    id: "4022",
    fullName: "Anna Petrova",
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
    supervisor: "Alexey Kozlov",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (926) 180-40-22", href: "tel:+79261804022" },
      { channel: "email", label: "Email", value: "employee4022@globaldrive.ru", href: "mailto:employee4022@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4022", href: "https://t.me/team4022" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79261804022", href: "https://wa.me/79261804022" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/4022", href: "/team/users/4022" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "MacBook Pro 14", inventoryId: "IT-402201", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 14", inventoryId: "MOB-402202", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell UltraSharp 27", inventoryId: "ACC-402203", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-402204", status: "service", note: "Scheduled service replacement" },
    ],
    interests: [
      { title: "Books", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Movies and series", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Topics", items: ["React", "Design systems", "DX"] },
    ],
    orgAssignments: [
      { name: "IT", roleLabel: "Division member", isLead: false },
      { name: "Frontend Squad", roleLabel: "Division member", isLead: false },
    ],
  },
  {
    id: "4023",
    fullName: "Ilya Smirnov",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-smirnov",
    role: "Logistics Manager",
    position: "Manager",
    email: "employee4023@globaldrive.ru",
    phone: "8 (921) 550-40-23",
    city: "Saint Petersburg",
    experience: "4 years 9 months",
    federalDistrict: "North-West Federal District",
    branch: "Saint Petersburg",
    department: "Logistics",
    headOfDepartment: "Logistics",
    supervisor: "Maxim Frolov",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (921) 550-40-23", href: "tel:+79215504023" },
      { channel: "email", label: "Email", value: "employee4023@globaldrive.ru", href: "mailto:employee4023@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4023", href: "https://t.me/team4023" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79215504023", href: "https://wa.me/79215504023" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/4023", href: "/team/users/4023" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "Dell Latitude 7440", inventoryId: "IT-402301", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 14", inventoryId: "MOB-402302", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Zebra TC22", inventoryId: "ACC-402303", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-402304", status: "service", note: "Scheduled service replacement" },
    ],
    interests: [
      { title: "Books", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Movies and series", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Topics", items: ["Supply chain", "Warehouse flow", "Transport planning"] },
    ],
    orgAssignments: [
      { name: "Logistics", roleLabel: "Division member", isLead: false },
      { name: "Warehouse and transport", roleLabel: "Division member", isLead: false },
    ],
  },
  {
    id: "4024",
    fullName: "Maria Sokolova",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-sokolova",
    role: "HR Partner",
    position: "Partner",
    email: "employee4024@globaldrive.ru",
    phone: "8 (915) 470-40-24",
    city: "Yaroslavl",
    experience: "5 years 1 month",
    federalDistrict: "Central Federal District",
    branch: "Yaroslavl",
    department: "HR",
    headOfDepartment: "HR",
    supervisor: "Darya Subbotina",
    statusBadges: ["Guru"],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (915) 470-40-24", href: "tel:+79154704024" },
      { channel: "email", label: "Email", value: "employee4024@globaldrive.ru", href: "mailto:employee4024@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4024", href: "https://t.me/team4024" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79154704024", href: "https://wa.me/79154704024" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/4024", href: "/team/users/4024" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "MacBook Air 13", inventoryId: "IT-402401", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-402402", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell UltraSharp 27", inventoryId: "ACC-402403", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-402404", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["Hooked", "Sprint", "The Mom Test"] },
      { title: "Movies and series", items: ["The Bear", "Black Mirror", "Suits"] },
      { title: "Topics", items: ["People ops", "Recruitment", "Adaptation"] },
    ],
    orgAssignments: [
      { name: "HR", roleLabel: "Division lead", isLead: true },
      { name: "Recruitment and adaptation", roleLabel: "Division lead", isLead: true },
    ],
  },
  {
    id: "4025",
    fullName: "Dmitry Volkov",
    avatarUrl: "https://loremflickr.com/320/320/man,portrait?lock=team-volkov",
    role: "Account Manager",
    position: "Lead manager",
    email: "employee4025@globaldrive.ru",
    phone: "8 (912) 610-40-25",
    city: "Yekaterinburg",
    experience: "3 years 11 months",
    federalDistrict: "Ural Federal District",
    branch: "Yekaterinburg",
    department: "Sales",
    headOfDepartment: "Sales",
    supervisor: "Kirill Vasiliev",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (912) 610-40-25", href: "tel:+79126104025" },
      { channel: "email", label: "Email", value: "employee4025@globaldrive.ru", href: "mailto:employee4025@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4025", href: "https://t.me/team4025" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79126104025", href: "https://wa.me/79126104025" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/4025", href: "/team/users/4025" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "Dell Latitude 7440", inventoryId: "IT-402501", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-402502", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Dell Dock WD22", inventoryId: "ACC-402503", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-402504", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["Good to Great", "No Rules Rules", "Blue Ocean Strategy"] },
      { title: "Movies and series", items: ["Ford v Ferrari", "Billions", "Chef's Table"] },
      { title: "Topics", items: ["B2B sales", "Negotiations", "Pipeline"] },
    ],
    orgAssignments: [
      { name: "Sales", roleLabel: "Division lead", isLead: true },
      { name: "B2B accounts", roleLabel: "Division lead", isLead: true },
    ],
  },
  {
    id: "4026",
    fullName: "Svetlana Egorova",
    avatarUrl: "https://loremflickr.com/320/320/woman,portrait?lock=team-egorova",
    role: "Support Lead",
    position: "Team lead",
    email: "employee4026@globaldrive.ru",
    phone: "8 (913) 620-40-26",
    city: "Krasnoyarsk",
    experience: "4 years 6 months",
    federalDistrict: "SFO 1",
    branch: "Krasnoyarsk",
    department: "Support",
    headOfDepartment: "Support",
    supervisor: "Irina Kuznetsova",
    statusBadges: [],
    contacts: [
      { channel: "phone", label: "Phone", value: "8 (913) 620-40-26", href: "tel:+79136204026" },
      { channel: "email", label: "Email", value: "employee4026@globaldrive.ru", href: "mailto:employee4026@globaldrive.ru" },
      { channel: "telegram", label: "Telegram", value: "@team4026", href: "https://t.me/team4026" },
      { channel: "whatsapp", label: "WhatsApp", value: "+79136204026", href: "https://wa.me/79136204026" },
      { channel: "internal", label: "Internal profile", value: "Employee card / team/users/4026", href: "/team/users/4026" },
    ],
    workCalendar: MARCH_2026_WORK_CALENDAR,
    assets: [
      { category: "Laptop", name: "MacBook Pro 14", inventoryId: "IT-402601", status: "assigned", note: "Primary work device" },
      { category: "Phone", name: "iPhone 15", inventoryId: "MOB-402602", status: "assigned", note: "Corporate SIM" },
      { category: "Accessory", name: "Jabra Evolve2 65", inventoryId: "ACC-402603", status: "assigned" },
      { category: "Token", name: "YubiKey 5 NFC", inventoryId: "SEC-402604", status: "reserve", note: "Backup MFA key" },
    ],
    interests: [
      { title: "Books", items: ["The Phoenix Project", "Thinking in Systems", "Deep Work"] },
      { title: "Movies and series", items: ["Chernobyl", "Industry", "The Playlist"] },
      { title: "Topics", items: ["Customer care", "Escalations", "Knowledge base"] },
    ],
    orgAssignments: [
      { name: "Support", roleLabel: "Division lead", isLead: true },
      { name: "Customer care", roleLabel: "Division lead", isLead: true },
    ],
  },
];

export const TEAM_PROFILE_DEMO_IDS = TEAM_PROFILE_DEMO_DATA.map((profile) => profile.id);

export const getTeamProfileDemoById = (id: string) =>
  TEAM_PROFILE_DEMO_DATA.find((profile) => profile.id === id) ?? null;
