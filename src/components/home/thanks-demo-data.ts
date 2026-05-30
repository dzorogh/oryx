export type EmployeeOption = {
  id: string;
  fullName: string;
  department: string;
  role: string;
};

export const EMPLOYEE_OPTIONS: EmployeeOption[] = [
  { id: "emp-1", fullName: "Anna Petrova", department: "IT", role: "Frontend Developer" },
  { id: "emp-2", fullName: "Ilya Smirnov", department: "Logistics", role: "Logistics Manager" },
  { id: "emp-3", fullName: "Maria Sokolova", department: "HR", role: "HR Partner" },
  { id: "emp-4", fullName: "Dmitry Volkov", department: "Sales", role: "Account Manager" },
  { id: "emp-5", fullName: "Olga Vlasova", department: "Finance", role: "Financial Analyst" },
  { id: "emp-6", fullName: "Kirill Orlov", department: "IT", role: "DevOps Engineer" },
  { id: "emp-7", fullName: "Svetlana Egorova", department: "Support", role: "Support Lead" },
  { id: "emp-8", fullName: "Pavel Gromov", department: "Operations", role: "Operations Specialist" },
  { id: "emp-9", fullName: "Elena Belova", department: "Marketing", role: "Marketing Manager" },
  { id: "emp-10", fullName: "Roman Zakharov", department: "IT", role: "QA Engineer" },
  { id: "emp-11", fullName: "Tatyana Lebedeva", department: "Procurement", role: "Procurement Specialist" },
  { id: "emp-12", fullName: "Alexey Nazarov", department: "Security", role: "Security Analyst" },
];
