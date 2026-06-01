export type BirthdayPerson = {
  id: string;
  fullName: string;
  department: string;
  role: string;
  avatarUrl: string;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
  profileHref: string;
};

export const BIRTHDAY_PEOPLE: BirthdayPerson[] = [
  {
    id: "bd-1",
    fullName: "Anna Petrova",
    department: "IT",
    role: "Frontend Developer",
    avatarUrl: "https://i.pravatar.cc/96?img=32",
    month: 3,
    day: 24,
    profileHref: "/team/users/1",
  },
  {
    id: "bd-2",
    fullName: "Ilya Smirnov",
    department: "Logistics",
    role: "Logistics Manager",
    avatarUrl: "https://i.pravatar.cc/96?img=12",
    month: 4,
    day: 2,
    profileHref: "/team/users/2",
  },
  {
    id: "bd-3",
    fullName: "Maria Sokolova",
    department: "HR",
    role: "HR Partner",
    avatarUrl: "https://i.pravatar.cc/96?img=47",
    month: 3,
    day: 24,
    profileHref: "/team/users/3",
  },
  {
    id: "bd-4",
    fullName: "Dmitry Volkov",
    department: "Sales",
    role: "Account Manager",
    avatarUrl: "https://i.pravatar.cc/96?img=53",
    month: 5,
    day: 15,
    profileHref: "/team/users/4",
  },
  {
    id: "bd-5",
    fullName: "Olga Vlasova",
    department: "Finance",
    role: "Financial Analyst",
    avatarUrl: "https://i.pravatar.cc/96?img=5",
    month: 3,
    day: 30,
    profileHref: "/team/users/5",
  },
  {
    id: "bd-6",
    fullName: "Kirill Orlov",
    department: "IT",
    role: "DevOps Engineer",
    avatarUrl: "https://i.pravatar.cc/96?img=15",
    month: 7,
    day: 8,
    profileHref: "/team/users/6",
  },
  {
    id: "bd-7",
    fullName: "Svetlana Egorova",
    department: "Support",
    role: "Support Lead",
    avatarUrl: "https://i.pravatar.cc/96?img=28",
    month: 11,
    day: 21,
    profileHref: "/team/users/7",
  },
  {
    id: "bd-8",
    fullName: "Pavel Gromov",
    department: "Operations",
    role: "Operations Specialist",
    avatarUrl: "https://i.pravatar.cc/96?img=67",
    month: 12,
    day: 5,
    profileHref: "/team/users/8",
  },
];
