export type UserRole =
  | "system_administrator"
  | "rotc_commandant"
  | "supply_officer"
  | "logistics_officer"
  | "property_custodian"
  | "rotc_officer"
  | "student_cadet";

export const ROLES: Record<UserRole, string> = {
  system_administrator: "System Administrator",
  rotc_commandant: "ROTC Commandant",
  supply_officer: "Supply Officer",
  logistics_officer: "Logistics Officer",
  property_custodian: "Property Custodian",
  rotc_officer: "ROTC Officer",
  student_cadet: "Student Cadet",
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  system_administrator: 7,
  rotc_commandant: 6,
  supply_officer: 5,
  logistics_officer: 4,
  property_custodian: 3,
  rotc_officer: 2,
  student_cadet: 1,
};

export function hasMinimumRole(userRole: string, minimumRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  return userLevel >= requiredLevel;
}

export function canManageInventory(role: string): boolean {
  return ["system_administrator", "supply_officer", "property_custodian"].includes(role);
}

export function canApproveRequests(role: string): boolean {
  return ["system_administrator", "rotc_commandant", "supply_officer"].includes(role);
}

export function canBorrowEquipment(role: string): boolean {
  return !["system_administrator"].includes(role);
}

export function canManageUsers(role: string): boolean {
  return role === "system_administrator";
}

export function canViewReports(role: string): boolean {
  return ["system_administrator", "rotc_commandant", "supply_officer"].includes(role);
}

export function canViewAuditLogs(role: string): boolean {
  return role === "system_administrator";
}
