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
};

export const BIRTHDAY_PEOPLE: BirthdayPerson[] = [
  {
    id: "bd-1",
    fullName: "Анна Петрова",
    department: "IT",
    role: "Frontend Developer",
    avatarUrl: "https://i.pravatar.cc/96?img=32",
    month: 3,
    day: 24,
  },
  {
    id: "bd-2",
    fullName: "Илья Смирнов",
    department: "Логистика",
    role: "Logistics Manager",
    avatarUrl: "https://i.pravatar.cc/96?img=12",
    month: 4,
    day: 2,
  },
  {
    id: "bd-3",
    fullName: "Мария Соколова",
    department: "HR",
    role: "HR Partner",
    avatarUrl: "https://i.pravatar.cc/96?img=47",
    month: 3,
    day: 24,
  },
  {
    id: "bd-4",
    fullName: "Дмитрий Волков",
    department: "Sales",
    role: "Account Manager",
    avatarUrl: "https://i.pravatar.cc/96?img=53",
    month: 5,
    day: 15,
  },
  {
    id: "bd-5",
    fullName: "Ольга Власова",
    department: "Finance",
    role: "Financial Analyst",
    avatarUrl: "https://i.pravatar.cc/96?img=5",
    month: 3,
    day: 30,
  },
  {
    id: "bd-6",
    fullName: "Кирилл Орлов",
    department: "IT",
    role: "DevOps Engineer",
    avatarUrl: "https://i.pravatar.cc/96?img=15",
    month: 7,
    day: 8,
  },
  {
    id: "bd-7",
    fullName: "Светлана Егорова",
    department: "Support",
    role: "Support Lead",
    avatarUrl: "https://i.pravatar.cc/96?img=28",
    month: 11,
    day: 21,
  },
  {
    id: "bd-8",
    fullName: "Павел Громов",
    department: "Operations",
    role: "Operations Specialist",
    avatarUrl: "https://i.pravatar.cc/96?img=67",
    month: 12,
    day: 5,
  },
];
