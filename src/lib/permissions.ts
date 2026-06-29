export type UserRole =
  | "logistics_officer"
  | "rotc_officer";

export const ROLES: Record<UserRole, string> = {
  logistics_officer: "Logistics Officer (S-4)",
  rotc_officer: "ROTC Officer",
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  logistics_officer: 2,
  rotc_officer: 1,
};

export function hasMinimumRole(userRole: string, minimumRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];
  return userLevel >= requiredLevel;
}

// Logistics Officer has ALL access
const LOGISTICS_ONLY = ["logistics_officer"];

export function canManageInventory(role: string): boolean {
  return role === "logistics_officer";
}

export function canManageCategories(role: string): boolean {
  return role === "logistics_officer";
}

export function canManageLocations(role: string): boolean {
  return role === "logistics_officer";
}

export function canApproveRequests(role: string): boolean {
  return LOGISTICS_ONLY.includes(role);
}

export function canBorrowEquipment(role: string): boolean {
  return true; // Both roles can borrow
}

export function canManageUsers(role: string): boolean {
  return LOGISTICS_ONLY.includes(role);
}

export function canViewReports(role: string): boolean {
  return true; // Both roles can view reports
}

export function canViewAuditLogs(role: string): boolean {
  return LOGISTICS_ONLY.includes(role);
}

export function canManageSettings(role: string): boolean {
  return LOGISTICS_ONLY.includes(role);
}

export function canManageMaintenance(role: string): boolean {
  return LOGISTICS_ONLY.includes(role);
}

export function canManageRadios(role: string): boolean {
  return true; // Both can view/track radios
}
