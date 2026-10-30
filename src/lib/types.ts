export type StaffRole = "mechanic" | "manager";
export type OrderStatus = "submitted" | "reviewed";

export interface Staff {
  id: string;
  full_name: string;
  role: StaffRole;
  branch: string | null;
  language: "en" | "es" | null;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Truck {
  id: string;
  truck_number: string;
  description: string | null;
  branch: string | null;
  kind: "vehicle" | "equipment";
  asset_id: string | null; // accounting asset id from the PO system
  source: string | null; // 'po', 'jobcost', 'jobcost+po', 'manual'
  active: boolean;
  created_at: string;
}

export interface RepairOrder {
  id: string;
  order_number: number;
  client_id: string | null;
  mechanic_id: string;
  truck_id: string | null;
  truck_number: string;
  branch: string | null;
  work_date: string; // YYYY-MM-DD
  location: string | null;
  mileage: number | null;
  travel_time_minutes: number | null;
  total_hours: number | null;
  summary: string | null;
  work_performed: string | null;
  parts_materials: string | null;
  start_time: string | null; // HH:MM[:SS]
  finish_time: string | null;
  signature_path: string | null;
  status: OrderStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  manager_notes: string | null;
  translations: OrderTranslations | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

/** Free-text fields that get translated between English and Spanish. */
export const TRANSLATED_FIELDS = ["summary", "work_performed", "parts_materials", "location", "manager_notes"] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

/** One field's translation record: the language it was written in, plus the text in each language. */
export interface FieldTranslation {
  src: "en" | "es";
  en?: string;
  es?: string;
}
export type OrderTranslations = Partial<Record<TranslatedField, FieldTranslation>>;

export interface RepairOrderPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

/** Order joined with the names the UI needs. */
export interface RepairOrderWithNames extends RepairOrder {
  mechanic: { id: string; full_name: string } | null;
  reviewer: { id: string; full_name: string } | null;
  photos?: RepairOrderPhoto[];
}

/** The signed session carried in the cookie. */
export interface SessionUser {
  id: string;
  name: string;
  role: StaffRole;
  branch: string | null;
  language?: "en" | "es" | null;
}

/** What the phone sends when creating or updating an order. */
export interface RepairOrderInput {
  client_id: string;
  truck_id: string | null;
  truck_number: string;
  branch: string | null;
  work_date: string;
  location: string;
  mileage: number | null;
  travel_time_minutes: number | null;
  total_hours: number | null;
  summary: string;
  work_performed: string;
  parts_materials: string;
  start_time: string | null;
  finish_time: string | null;
}
