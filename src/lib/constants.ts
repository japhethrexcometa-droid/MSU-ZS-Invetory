export const APP_NAME = "MSU-ZS ROTC Inventory System";
export const APP_SHORT_NAME = "ROTC Inventory";
export const INSTITUTION = "Mindanao State University - Zamboanga";
export const INSTITUTION_SHORT = "MSU-ZS";

export const ASSET_CATEGORIES = [
  "Uniforms",
  "Boots",
  "Belts",
  "Radios",
  "Batteries",
  "Chargers",
  "Megaphones",
  "Flags",
  "Medical Kits",
  "Office Equipment",
  "Computers",
  "Printers",
  "Projectors",
  "Tables",
  "Chairs",
  "Training Equipment",
  "Camping Equipment",
  "Cleaning Supplies",
  "Documents",
  "Office Supplies",
  "Vehicle Equipment",
  "Communication Equipment",
  "Emergency Equipment",
  "Fire Safety Equipment",
  "Sports Equipment",
  "Others",
] as const;

export const ASSET_CONDITIONS = ["excellent", "good", "fair", "poor", "damaged"] as const;

export const ASSET_STATUSES = [
  "available",
  "borrowed",
  "maintenance",
  "lost",
  "disposed",
] as const;

export const BORROW_STATUSES = [
  "pending",
  "approved",
  "released",
  "returned",
  "late",
  "lost",
  "damaged",
  "rejected",
] as const;

export const MAINTENANCE_TYPES = [
  "routine",
  "repair",
  "inspection",
  "calibration",
  "emergency",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type BorrowStatus = (typeof BORROW_STATUSES)[number];
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];
