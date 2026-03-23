export type EmployeeOption = {
  id: string;
  fullName: string;
  department: string;
  role: string;
};

export const EMPLOYEE_OPTIONS: EmployeeOption[] = [
  { id: "emp-1", fullName: "Анна Петрова", department: "IT", role: "Frontend Developer" },
  { id: "emp-2", fullName: "Илья Смирнов", department: "Логистика", role: "Logistics Manager" },
  { id: "emp-3", fullName: "Мария Соколова", department: "HR", role: "HR Partner" },
  { id: "emp-4", fullName: "Дмитрий Волков", department: "Sales", role: "Account Manager" },
  { id: "emp-5", fullName: "Ольга Власова", department: "Finance", role: "Financial Analyst" },
  { id: "emp-6", fullName: "Кирилл Орлов", department: "IT", role: "DevOps Engineer" },
  { id: "emp-7", fullName: "Светлана Егорова", department: "Support", role: "Support Lead" },
  { id: "emp-8", fullName: "Павел Громов", department: "Operations", role: "Operations Specialist" },
  { id: "emp-9", fullName: "Елена Белова", department: "Marketing", role: "Marketing Manager" },
  { id: "emp-10", fullName: "Роман Захаров", department: "IT", role: "QA Engineer" },
  { id: "emp-11", fullName: "Татьяна Лебедева", department: "Procurement", role: "Procurement Specialist" },
  { id: "emp-12", fullName: "Алексей Назаров", department: "Security", role: "Security Analyst" },
];
