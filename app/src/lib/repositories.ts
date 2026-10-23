import "server-only";

import { Collection, ObjectId } from "mongodb";
import { getArtureDb } from "@/lib/db";
import { machineSchema, maintenanceSchema, technicianSchema } from "@/lib/schemas";

export type ArtureRole = "admin" | "technician";
export type ArtureUser = { _id?: ObjectId; email: string; name: string; passwordHash: string; role: ArtureRole; createdAt: Date; updatedAt: Date };
export type ArtureSession = { _id?: ObjectId; tokenHash: string; userId: ObjectId; expiresAt: Date; createdAt: Date };
export type ArtureMachine = { _id?: ObjectId; assetCode: string; name: string; model: string; location: string; status: "operational" | "service_due" | "offline"; archivedAt: Date | null; createdAt: Date; updatedAt: Date };
export type ArtureTechnician = { _id?: ObjectId; name: string; specialty: string; phone: string; active: boolean; createdAt: Date; updatedAt: Date };
export type ArtureMaintenanceLog = { _id?: ObjectId; machineId: ObjectId; technicianId: ObjectId; technicianName: string; serviceDate: Date; minutesSpent: number; notes: string; createdAt: Date };
export type ArtureDocumentRecord = { _id?: ObjectId; machineId: ObjectId; gridFsFileId: ObjectId; originalName: string; mimeType: string; size: number; uploadedBy: ObjectId; createdAt: Date };
export type ArtureActivity = { _id?: ObjectId; actorId: ObjectId | null; action: string; entityType: string; entityId: ObjectId | null; createdAt: Date };

type CollectionMap = { users: ArtureUser; sessions: ArtureSession; machines: ArtureMachine; technicians: ArtureTechnician; logs: ArtureMaintenanceLog; documents: ArtureDocumentRecord; activity: ArtureActivity };
const names: Record<keyof CollectionMap, `arture_${string}`> = { users: "arture_users", sessions: "arture_sessions", machines: "arture_machines", technicians: "arture_technicians", logs: "arture_maintenance_logs", documents: "arture_document_records", activity: "arture_activity_events" };

async function collection<K extends keyof CollectionMap>(key: K): Promise<Collection<CollectionMap[K]>> {
  if (!names[key].startsWith("arture_")) throw new Error("Refusing collection outside Arture namespace.");
  return (await getArtureDb()).collection<CollectionMap[K]>(names[key]);
}

export const users = {
  async byEmail(email: string) { return (await collection("users")).findOne({ email: email.toLowerCase() }); },
  async byId(id: ObjectId) { return (await collection("users")).findOne({ _id: id }); },
  async create(user: Omit<ArtureUser, "_id" | "createdAt" | "updatedAt">) { const now = new Date(); return (await collection("users")).insertOne({ ...user, createdAt: now, updatedAt: now }); },
};
export const sessions = {
  async create(session: Omit<ArtureSession, "_id" | "createdAt">) { return (await collection("sessions")).insertOne({ ...session, createdAt: new Date() }); },
  async byTokenHash(tokenHash: string) { return (await collection("sessions")).findOne({ tokenHash, expiresAt: { $gt: new Date() } }); },
  async remove(tokenHash: string) { return (await collection("sessions")).deleteOne({ tokenHash }); },
};
export const machines = {
  async list() { return (await collection("machines")).find({ archivedAt: null }).sort({ createdAt: -1 }).limit(100).toArray(); },
  async create(input: unknown) { const data = machineSchema.parse(input); const now = new Date(); return (await collection("machines")).insertOne({ ...data, archivedAt: null, createdAt: now, updatedAt: now }); },
};
export const technicians = {
  async list() { return (await collection("technicians")).find({}).sort({ active: -1, name: 1 }).limit(100).toArray(); },
  async create(input: unknown) { const data = technicianSchema.parse(input); const now = new Date(); return (await collection("technicians")).insertOne({ ...data, createdAt: now, updatedAt: now }); },
};
export const maintenanceLogs = {
  async create(input: unknown, technicianName: string) { const data = maintenanceSchema.parse(input); return (await collection("logs")).insertOne({ ...data, machineId: new ObjectId(data.machineId), technicianId: new ObjectId(data.technicianId), technicianName, createdAt: new Date() }); },
};
export const documents = { async create(record: Omit<ArtureDocumentRecord, "_id" | "createdAt">) { return (await collection("documents")).insertOne({ ...record, createdAt: new Date() }); } };
export const activity = { async record(event: Omit<ArtureActivity, "_id" | "createdAt">) { return (await collection("activity")).insertOne({ ...event, createdAt: new Date() }); } };
export { names as artureCollectionNames };
