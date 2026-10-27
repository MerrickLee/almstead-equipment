export const APP_NAME = "Almstead Repair Orders";

export const BRANCHES = [
  "New Rochelle, NY",
  "Hawthorne, NY",
  "Stamford, CT",
  "North Haledon, NJ",
] as const;

export type Branch = (typeof BRANCHES)[number];

export const COMPANY = {
  name: "Almstead Tree, Shrub & Lawn Care",
  address: process.env.COMPANY_ADDRESS ?? "58 Beechwood Avenue, New Rochelle NY 10801",
  phone: process.env.COMPANY_PHONE ?? "914-576-0193",
  fax: process.env.COMPANY_FAX ?? "914-576-1117",
};

export const SESSION_COOKIE = "ro_session";
export const SESSION_DAYS = 30;

export const MECHANIC_PIN_MIN = 4;
export const MECHANIC_PIN_MAX = 6;
export const MANAGER_PASSCODE_MIN = 6;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export const STORAGE_BUCKET = "repair-orders";
export const MAX_PHOTOS_PER_ORDER = 12;

export function formatOrderNumber(n: number | string): string {
  return `RO-${String(n).padStart(6, "0")}`;
}
