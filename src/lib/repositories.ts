import { Collection, ObjectId } from "mongodb";
import { getArtureDb } from "@/lib/db";
import { machineSchema, maintenanceSchema, technicianSchema } from "@/lib/schemas";
import { phoneIdentity } from "@/lib/phone";

export type ArtureRole = "admin" | "technician";
export type ArtureUser = { _id?: ObjectId; email: string; name: string; passwordHash: string; role: ArtureRole; createdAt: Date; updatedAt: Date };
export type ArtureSession = { _id?: ObjectId; tokenHash: string; userId: ObjectId; expiresAt: Date; createdAt: Date };
export type ArtureMachine = { _id?: ObjectId; assetCode: string; name: string; model: string; location: string; status: "operational" | "service_due" | "offline"; archivedAt: Date | null; createdAt: Date; updatedAt: Date; seedKey?: string };
export type ArtureTechnician = { _id?: ObjectId; name: string; specialty: string; phone: string; active: boolean; createdAt: Date; updatedAt: Date; seedKey?: string };
export type ArtureMaintenanceLog = { _id?: ObjectId; machineId: ObjectId; technicianId: ObjectId; technicianName: string; serviceDate: Date; minutesSpent: number; notes: string; createdAt: Date; seedKey?: string };
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
  async byId(id: string) { return (await collection("machines")).findOne({ _id: new ObjectId(id), archivedAt: null }); },
  async byAssetCode(assetCode: string) { return (await collection("machines")).findOne({ assetCode: { $regex: `^${assetCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, archivedAt: null }); },
  async create(input: unknown) { const data = machineSchema.parse(input); const now = new Date(); return (await collection("machines")).insertOne({ ...data, archivedAt: null, createdAt: now, updatedAt: now }); },
  async update(id: string, input: unknown) { const data = machineSchema.parse(input); return (await collection("machines")).findOneAndUpdate({ _id: new ObjectId(id), archivedAt: null }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" }); },
  async archive(id: string) { return (await collection("machines")).updateOne({ _id: new ObjectId(id), archivedAt: null }, { $set: { archivedAt: new Date(), updatedAt: new Date() } }); },
};
export const technicians = {
  async list() { return (await collection("technicians")).find({}).sort({ active: -1, name: 1 }).limit(100).toArray(); },
  async byId(id: string) { return (await collection("technicians")).findOne({ _id: new ObjectId(id) }); },
  async matchesByPhone(phone: string) { const identity = phoneIdentity(phone); return (await collection("technicians")).find({}).limit(500).toArray().then((workers) => workers.filter((worker) => phoneIdentity(worker.phone) === identity)); },
  async create(input: unknown) { const data = technicianSchema.parse(input); const now = new Date(); return (await collection("technicians")).insertOne({ ...data, createdAt: now, updatedAt: now }); },
  async update(id: string, input: unknown) { const data = technicianSchema.parse(input); return (await collection("technicians")).findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" }); },
};
export const maintenanceLogs = {
  async list(machineId?: string) { return (await collection("logs")).find(machineId ? { machineId: new ObjectId(machineId) } : {}).sort({ serviceDate: -1 }).limit(100).toArray(); },
  async create(input: unknown, technicianName: string) { const data = maintenanceSchema.parse(input); return (await collection("logs")).insertOne({ ...data, machineId: new ObjectId(data.machineId), technicianId: new ObjectId(data.technicianId), technicianName, createdAt: new Date() }); },
};
export const documents = { async list(machineId?: string) { return (await collection("documents")).find(machineId ? { machineId: new ObjectId(machineId) } : {}).sort({ createdAt: -1 }).limit(100).toArray(); }, async byId(id: string) { return (await collection("documents")).findOne({ _id: new ObjectId(id) }); }, async create(record: Omit<ArtureDocumentRecord, "_id" | "createdAt">) { return (await collection("documents")).insertOne({ ...record, createdAt: new Date() }); }, async remove(id: string) { return (await collection("documents")).deleteOne({ _id: new ObjectId(id) }); } };
export const activity = { async list() { return (await collection("activity")).find({}).sort({ createdAt: -1 }).limit(30).toArray(); }, async record(event: Omit<ArtureActivity, "_id" | "createdAt">) { return (await collection("activity")).insertOne({ ...event, createdAt: new Date() }); } };
export { names as artureCollectionNames };
