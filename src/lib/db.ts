import "server-only";
import { supabase } from "./supabase";
import { STORAGE_BUCKET } from "./constants";
import type {
  OrderStatus,
  RepairOrder,
  RepairOrderPhoto,
  RepairOrderWithNames,
  Staff,
  Truck,
} from "./types";
import type { RepairOrderInputParsed } from "./validation";

const ORDER_SELECT = `
  *,
  mechanic:staff!repair_orders_mechanic_id_fkey ( id, full_name ),
  reviewer:staff!repair_orders_reviewed_by_fkey ( id, full_name )
`;

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
const STAFF_COLUMNS = "id, full_name, role, branch, language, active, last_login_at, created_at";

export async function listStaff(opts?: { activeOnly?: boolean }): Promise<Staff[]> {
  let q = supabase().from("staff").select(STAFF_COLUMNS).order("full_name");
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Staff[];
}

export async function getStaff(id: string): Promise<Staff | null> {
  const { data, error } = await supabase().from("staff").select(STAFF_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Staff | null;
}

export async function getStaffForLogin(id: string) {
  const { data, error } = await supabase()
    .from("staff")
    .select("id, full_name, role, branch, language, active, passcode_hash, failed_attempts, locked_until")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as
    | (Pick<Staff, "id" | "full_name" | "role" | "branch" | "language" | "active"> & {
        passcode_hash: string;
        failed_attempts: number;
        locked_until: string | null;
      })
    | null;
}

export async function recordLoginResult(id: string, ok: boolean, lockUntil?: Date | null) {
  const patch = ok
    ? { failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() }
    : { locked_until: lockUntil ? lockUntil.toISOString() : null };
  if (!ok) {
    // increment atomically
    const { data } = await supabase().from("staff").select("failed_attempts").eq("id", id).single();
    Object.assign(patch, { failed_attempts: (data?.failed_attempts ?? 0) + 1 });
  }
  const { error } = await supabase().from("staff").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createStaff(input: {
  full_name: string;
  role: Staff["role"];
  branch: string | null;
  language?: Staff["language"];
  passcode_hash: string;
}): Promise<Staff> {
  const { data, error } = await supabase().from("staff").insert(input).select(STAFF_COLUMNS).single();
  if (error) throw error;
  return data as Staff;
}

export async function updateStaff(
  id: string,
  patch: Partial<{
    full_name: string;
    role: Staff["role"];
    branch: string | null;
    language: Staff["language"];
    passcode_hash: string;
    active: boolean;
    failed_attempts: number;
    locked_until: string | null;
  }>,
): Promise<Staff> {
  const { data, error } = await supabase().from("staff").update(patch).eq("id", id).select(STAFF_COLUMNS).single();
  if (error) throw error;
  return data as Staff;
}

export async function countManagers(): Promise<number> {
  const { count, error } = await supabase()
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("role", "manager")
    .eq("active", true);
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Trucks
// ---------------------------------------------------------------------------
const naturalCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export async function listTrucks(opts?: { activeOnly?: boolean }): Promise<Truck[]> {
  let q = supabase().from("trucks").select("*").limit(2000);
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  // Unit numbers are text ("62", "62-A", "610T"); sort them the way people read them.
  return (data as Truck[]).sort((a, b) => naturalCollator.compare(a.truck_number, b.truck_number));
}

export async function getTruck(id: string): Promise<Truck | null> {
  const { data, error } = await supabase().from("trucks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Truck | null;
}

export async function createTruck(input: {
  truck_number: string;
  description: string | null;
  branch: string | null;
  kind?: Truck["kind"];
  asset_id?: string | null;
}): Promise<Truck> {
  const { data, error } = await supabase()
    .from("trucks")
    .insert({ ...input, kind: input.kind ?? "vehicle", source: "manual" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Truck;
}

export async function updateTruck(
  id: string,
  patch: Partial<{
    truck_number: string;
    description: string | null;
    branch: string | null;
    kind: Truck["kind"];
    asset_id: string | null;
    active: boolean;
  }>,
): Promise<Truck> {
  const { data, error } = await supabase().from("trucks").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Truck;
}

// ---------------------------------------------------------------------------
// Repair orders
// ---------------------------------------------------------------------------
export interface OrderFilters {
  mechanicId?: string;
  truckId?: string;
  branch?: string;
  status?: OrderStatus;
  from?: string; // YYYY-MM-DD
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listOrders(filters: OrderFilters = {}): Promise<{ orders: RepairOrderWithNames[]; total: number }> {
  let q = supabase()
    .from("repair_orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("work_date", { ascending: false })
    .order("order_number", { ascending: false });

  if (filters.mechanicId) q = q.eq("mechanic_id", filters.mechanicId);
  if (filters.truckId) q = q.eq("truck_id", filters.truckId);
  if (filters.branch) q = q.eq("branch", filters.branch);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.from) q = q.gte("work_date", filters.from);
  if (filters.to) q = q.lte("work_date", filters.to);
  if (filters.search) {
    const s = filters.search.replace(/[%,()]/g, " ").trim();
    if (s) {
      q = q.or(
        `truck_number.ilike.%${s}%,location.ilike.%${s}%,summary.ilike.%${s}%,work_performed.ilike.%${s}%,parts_materials.ilike.%${s}%`,
      );
    }
  }
  const limit = Math.min(filters.limit ?? 50, 500);
  const offset = filters.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { orders: (data ?? []) as unknown as RepairOrderWithNames[], total: count ?? 0 };
}

export async function getOrder(id: string): Promise<RepairOrderWithNames | null> {
  const { data, error } = await supabase().from("repair_orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = data as unknown as RepairOrderWithNames;
  order.photos = await listPhotos(id);
  return order;
}

export async function getOrderByClientId(clientId: string): Promise<RepairOrder | null> {
  const { data, error } = await supabase().from("repair_orders").select("*").eq("client_id", clientId).maybeSingle();
  if (error) throw error;
  return data as RepairOrder | null;
}

/**
 * Creates the order, or updates it if the same client_id was already received
 * (the phone may retry after a dropped connection). Returns the saved row.
 */
export async function upsertOrder(mechanicId: string, input: RepairOrderInputParsed): Promise<RepairOrder> {
  const existing = await getOrderByClientId(input.client_id);
  const row = {
    truck_id: input.truck_id,
    truck_number: input.truck_number,
    branch: input.branch,
    work_date: input.work_date,
    location: input.location || null,
    mileage: input.mileage,
    travel_time_minutes: input.travel_time_minutes,
    total_hours: input.total_hours,
    summary: input.summary || null,
    work_performed: input.work_performed || null,
    parts_materials: input.parts_materials || null,
    start_time: input.start_time,
    finish_time: input.finish_time,
  };

  if (existing) {
    if (existing.mechanic_id !== mechanicId) throw new Error("This order belongs to another mechanic.");
    if (existing.status === "reviewed") throw new Error("This order has been reviewed and can no longer be edited.");
    const { data, error } = await supabase().from("repair_orders").update(row).eq("id", existing.id).select("*").single();
    if (error) throw error;
    return data as RepairOrder;
  }

  const { data, error } = await supabase()
    .from("repair_orders")
    .insert({ ...row, client_id: input.client_id, mechanic_id: mechanicId })
    .select("*")
    .single();
  if (error) throw error;
  return data as RepairOrder;
}

export async function updateOrderFields(id: string, patch: Partial<RepairOrder>): Promise<RepairOrder> {
  const { data, error } = await supabase().from("repair_orders").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as RepairOrder;
}

export async function setOrderReview(
  id: string,
  reviewerId: string,
  status: OrderStatus,
  managerNotes: string | null,
): Promise<RepairOrder> {
  const patch =
    status === "reviewed"
      ? { status, manager_notes: managerNotes, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }
      : { status, manager_notes: managerNotes, reviewed_by: null, reviewed_at: null };
  return updateOrderFields(id, patch);
}

export async function deleteOrder(id: string): Promise<void> {
  const photos = await listPhotos(id);
  const paths = photos.map((p) => p.storage_path);
  const order = await getOrder(id);
  if (order?.signature_path) paths.push(order.signature_path);
  if (paths.length) await supabase().storage.from(STORAGE_BUCKET).remove(paths);
  const { error } = await supabase().from("repair_orders").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Photos & files
// ---------------------------------------------------------------------------
export async function listPhotos(orderId: string): Promise<RepairOrderPhoto[]> {
  const { data, error } = await supabase()
    .from("repair_order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return data as RepairOrderPhoto[];
}

export async function countPhotos(orderId: string): Promise<number> {
  const { count, error } = await supabase()
    .from("repair_order_photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if (error) throw error;
  return count ?? 0;
}

export async function addPhoto(orderId: string, storagePath: string, caption: string | null): Promise<RepairOrderPhoto> {
  const { data, error } = await supabase()
    .from("repair_order_photos")
    .insert({ order_id: orderId, storage_path: storagePath, caption })
    .select("*")
    .single();
  if (error) throw error;
  return data as RepairOrderPhoto;
}

export async function deletePhoto(photoId: string): Promise<void> {
  const { data, error } = await supabase().from("repair_order_photos").select("storage_path").eq("id", photoId).maybeSingle();
  if (error) throw error;
  if (!data) return;
  await supabase().storage.from(STORAGE_BUCKET).remove([data.storage_path]);
  await supabase().from("repair_order_photos").delete().eq("id", photoId);
}

export async function uploadToStorage(path: string, bytes: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
  const { error } = await supabase().storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
}

export async function downloadFromStorage(path: string): Promise<Buffer | null> {
  const { data, error } = await supabase().storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function signedUrl(path: string, seconds = 300): Promise<string | null> {
  const { data, error } = await supabase().storage.from(STORAGE_BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export async function dashboardStats() {
  const db = supabase();
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const [pending, week, month] = await Promise.all([
    db.from("repair_orders").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    db.from("repair_orders").select("id", { count: "exact", head: true }).gte("work_date", weekAgo),
    db.from("repair_orders").select("total_hours").gte("work_date", monthAgo),
  ]);

  const hours30 = (month.data ?? []).reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
  return {
    awaitingReview: pending.count ?? 0,
    last7Days: week.count ?? 0,
    last30DaysCount: month.data?.length ?? 0,
    last30DaysHours: Math.round(hours30 * 10) / 10,
  };
}
