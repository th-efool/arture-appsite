import type { Db } from "mongodb";
import { visibleMachineFilter } from "./demo-machine";
import { conversationSummary } from "./conversations";
import { getAppConnections } from "./app-connections";

export async function getWorkspaceDashboard(db: Db, user: { email?: string }) {
  const machines = await db.collection("arture_machines").find({ ...visibleMachineFilter(user), archivedAt: null }).toArray();
  const ids = machines.map(machine => machine._id);
  const machineNames = new Map(machines.map(machine => [machine._id.toHexString(), machine.name as string]));
  const logFilter = { machineId: { $in: ids }, archivedAt: null };
  const documentFilter = { machineId: { $in: ids } };
  const [logs, documents, changes, documentCount, workEventCount, conversations, conversationCount] = await Promise.all([
    db.collection("arture_maintenance_logs").find(logFilter).sort({ createdAt: -1 }).limit(30).toArray(),
    db.collection("arture_document_records").find(documentFilter).sort({ createdAt: -1 }).limit(30).toArray(),
    db.collection("arture_activity_events").find({ entityType: "machine", entityId: { $in: ids }, action: { $in: ["created", "updated", "deleted document"] } }).sort({ createdAt: -1 }).limit(30).toArray(),
    db.collection("arture_document_records").countDocuments(documentFilter),
    db.collection("arture_maintenance_logs").countDocuments(logFilter),
    db.collection("arture_conversations").find({ machineId: { $in: ids } }).sort({ startedAt: -1 }).limit(30).toArray(),
    db.collection("arture_conversations").countDocuments({ machineId: { $in: ids } }),
  ]);
  const recentActivity = [
    ...conversations.map(session => ({ id: `session-${session.conversationId}`, machineId: session.machineId.toHexString(), machineName: session.machineName, kind: "conversation", summary: `Voice session · ${session.worker?.name ?? "Unassigned"} · ${conversationSummary(session).status}`, occurredAt: session.startedAt })),
    ...logs.map(log => ({ id: `work-${log._id}`, machineId: log.machineId.toHexString(), machineName: machineNames.get(log.machineId.toHexString()), kind: "work", summary: `${log.technicianName}: ${log.notes}`, occurredAt: log.createdAt ?? log.serviceDate })),
    ...documents.map(document => ({ id: `document-${document._id}`, machineId: document.machineId.toHexString(), machineName: machineNames.get(document.machineId.toHexString()), kind: "document", summary: `Uploaded ${document.originalName}`, occurredAt: document.createdAt })),
    ...changes.map(change => ({ id: `activity-${change._id}`, machineId: change.entityId.toHexString(), machineName: machineNames.get(change.entityId.toHexString()), kind: "machine", summary: change.action === "deleted document" ? "Removed a document" : `Machine record ${change.action}`, occurredAt: change.createdAt })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 30);
  return {
    metrics: { registered: machines.length, operational: machines.filter(machine => machine.status === "operational").length, attention: machines.filter(machine => machine.status !== "operational").length, documents: documentCount, workEvents: workEventCount, conversations: conversationCount },
    connections: await getAppConnections(db, machines.map(machine => machine.assetCode)),
    recentActivity,
  };
}
