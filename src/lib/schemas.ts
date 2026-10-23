import { z } from "zod";

export const roles = ["admin", "technician"] as const;
export const machineStatuses = ["operational", "service_due", "offline"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
export const loginSchema = z.object({ email: z.string().trim().email().max(254).toLowerCase(), password: z.string().min(12).max(200) });
export const machineSchema = z.object({ assetCode: text(40).regex(/^ATR-[A-Z0-9-]+$/i), name: text(120), model: text(120), location: text(120), status: z.enum(machineStatuses) });
export const technicianSchema = z.object({ name: text(120), specialty: text(120), phone: text(40), active: z.boolean().default(true) });
export const maintenanceSchema = z.object({ machineId: z.string().regex(/^[a-f\d]{24}$/i), technicianId: z.string().regex(/^[a-f\d]{24}$/i), serviceDate: z.coerce.date(), minutesSpent: z.number().int().min(1).max(1_440), notes: text(4_000) });
export const documentSchema = z.object({ machineId: z.string().regex(/^[a-f\d]{24}$/i), originalName: text(255), mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]), size: z.number().int().positive() });
export const workerLookupSchema = z.object({ phone: z.string().trim().min(7).max(40) });
export const workEventSchema = z.object({
  phone: z.string().trim().min(7).max(40),
  systemId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  assetCode: text(40).regex(/^ATR-[A-Z0-9-]+$/i).optional(),
  task: text(500),
  details: z.string().trim().max(4_000).optional(),
  completedAt: z.coerce.date().optional(),
  minutesSpent: z.coerce.number().int().min(1).max(1_440).default(1),
}).refine((event) => event.systemId || event.assetCode, { message: "Provide systemId or assetCode.", path: ["systemId"] });
