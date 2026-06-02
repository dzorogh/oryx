import { USER_PROFILE_CURRENT_USER_ID } from "@/features/users/profile/user-profile-demo-data";

export type TeamDirectoryEmployee = {
  id: string;
  fullName: string;
  employeeRole: string;
  district: string;
  branch: string;
  department: string;
  divisions: string;
  position: string;
  avatarUrl: string;
  isLead: boolean;
  profileHref: string;
};

export const TEAM_DIRECTORY_EMPLOYEES: TeamDirectoryEmployee[] = [
  {
    id: USER_PROFILE_CURRENT_USER_ID,
    fullName: "Alexey Nazarov",
    employeeRole: "Employee",
    district: "Central Federal District",
    branch: "HQ — Moscow office",
    department: "Digital Products",
    divisions: "Engineering",
    position: "Senior Frontend Developer",
    avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp12",
    isLead: false,
    profileHref: `/team/users/${USER_PROFILE_CURRENT_USER_ID}`,
  },
  {
    id: "emp-08",
    fullName: "Elena Kozlova",
    employeeRole: "Manager",
    district: "Central Federal District",
    branch: "HQ — Moscow office",
    department: "Digital Products",
    divisions: "Engineering",
    position: "Team Lead",
    avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp08",
    isLead: true,
    profileHref: "/team/users/emp-08",
  },
  {
    id: "emp-15",
    fullName: "Dmitry Sokolov",
    employeeRole: "Employee",
    district: "Northwestern Federal District",
    branch: "Store — Saint Petersburg",
    department: "Sales",
    divisions: "Retail",
    position: "Sales Manager",
    avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp15",
    isLead: false,
    profileHref: "/team/users/emp-15",
  },
  {
    id: "emp-22",
    fullName: "Anna Petrova",
    employeeRole: "Employee",
    district: "Central Federal District",
    branch: "HQ — Moscow office",
    department: "HR",
    divisions: "People operations",
    position: "HR Specialist",
    avatarUrl: "https://loremflickr.com/200/200/portrait?lock=emp22",
    isLead: false,
    profileHref: "/team/users/emp-22",
  },
];
