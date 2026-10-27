import { z } from "zod";
import { BRANCHES, MANAGER_PASSCODE_MIN, MECHANIC_PIN_MAX, MECHANIC_PIN_MIN } from "./constants";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const trimmed = z.string().trim();

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
export const timeString = z.preprocess(
  emptyToNull,
  z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM").nullable(),
);

export const repairOrderInputSchema = z.object({
  client_id: z.string().uuid(),
  truck_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  truck_number: trimmed.min(1, "Truck # is required").max(40),
  branch: z.preprocess(emptyToNull, z.enum(BRANCHES).nullable()),
  work_date: dateString,
  location: trimmed.max(200).default(""),
  mileage: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(9_999_999).nullable()),
  travel_time_minutes: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(24 * 60).nullable()),
  total_hours: z.preprocess(emptyToNull, z.coerce.number().min(0).max(99).nullable()),
  summary: trimmed.max(5000).default(""),
  work_performed: trimmed.max(10000).default(""),
  parts_materials: trimmed.max(5000).default(""),
  start_time: timeString,
  finish_time: timeString,
});

export type RepairOrderInputParsed = z.infer<typeof repairOrderInputSchema>;

export const reviewSchema = z.object({
  status: z.enum(["submitted", "reviewed"]),
  manager_notes: z.preprocess(emptyToNull, trimmed.max(5000).nullable()),
});

export const loginSchema = z.object({
  staffId: z.string().uuid(),
  passcode: z.string().min(1).max(100),
});

export const staffInputSchema = z
  .object({
    full_name: trimmed.min(2).max(80),
    role: z.enum(["mechanic", "manager"]),
    branch: z.preprocess(emptyToNull, z.enum(BRANCHES).nullable()),
    passcode: z.string().min(1).max(100).optional(),
    active: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.passcode === undefined) return;
    if (v.role === "mechanic") {
      if (!/^\d+$/.test(v.passcode) || v.passcode.length < MECHANIC_PIN_MIN || v.passcode.length > MECHANIC_PIN_MAX) {
        ctx.addIssue({
          code: "custom",
          path: ["passcode"],
          message: `Mechanic PINs are ${MECHANIC_PIN_MIN}–${MECHANIC_PIN_MAX} digits`,
        });
      }
    } else if (v.passcode.length < MANAGER_PASSCODE_MIN) {
      ctx.addIssue({
        code: "custom",
        path: ["passcode"],
        message: `Manager passcodes must be at least ${MANAGER_PASSCODE_MIN} characters`,
      });
    }
  });

export const truckInputSchema = z.object({
  truck_number: trimmed.min(1).max(40),
  description: z.preprocess(emptyToNull, trimmed.max(200).nullable()),
  branch: z.preprocess(emptyToNull, z.enum(BRANCHES).nullable()),
  active: z.boolean().optional(),
});

/** Turns a Zod error into a short, human-readable message. */
export function firstIssue(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
