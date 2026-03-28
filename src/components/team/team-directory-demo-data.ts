import { TEAM_PROFILE_DEMO_DATA, type TeamProfileData } from "./team-profile-demo-data";

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
  profileHref?: string;
};

const getEmployeeDivisions = (profile: TeamProfileData) => {
  const divisions = profile.orgAssignments
    .map((assignment) => assignment.name)
    .filter((name) => name !== profile.department);

  if (divisions.length === 0) {
    return profile.department;
  }

  return divisions.join(", ");
};

const mapProfileToDirectoryEmployee = (profile: TeamProfileData): TeamDirectoryEmployee => ({
  id: profile.id,
  fullName: profile.fullName,
  employeeRole: profile.role,
  district: profile.federalDistrict,
  branch: profile.branch,
  department: profile.department,
  divisions: getEmployeeDivisions(profile),
  position: profile.position,
  avatarUrl: profile.avatarUrl,
  isLead: profile.orgAssignments.some((assignment) => assignment.isLead),
  profileHref: `/team/users/${profile.id}`,
});

export const TEAM_DIRECTORY_EMPLOYEES: TeamDirectoryEmployee[] = TEAM_PROFILE_DEMO_DATA.map(
  mapProfileToDirectoryEmployee
);
