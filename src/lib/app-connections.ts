import type { Db } from "mongodb";
import type { AppConnection } from "./app-connection-types";

export async function getAppConnections(db: Db, assetCodes: string[], configured = process.env.ARTURE_RELAY_ENABLED === "true", now = new Date()): Promise<Record<string, AppConnection>> {
  const records = await db.collection("arture_app_connections").find({ assetCode: { $in: assetCodes } }).sort({ lastSeenAt: -1 }).limit(1000).toArray();
  return Object.fromEntries(assetCodes.map(assetCode => {
    const matching = records.filter(record => record.assetCode === assetCode);
    const live = matching.filter(record => !record.endedAt && ["connected", "connecting"].includes(record.state) && now.getTime() - new Date(record.lastSeenAt).getTime() < 30000);
    const connected = live.filter(record => record.state === "connected");
    const latest = matching[0];
    const state = connected.length ? "connected" : live.length ? "connecting" : latest?.state === "error" ? "error" : latest || configured ? "disconnected" : "not_configured";
    return [assetCode, { state, activeConnections: connected.length, lastSeenAt: latest?.lastSeenAt?.toISOString() ?? null, errorCode: state === "error" ? latest?.errorCode ?? null : null } satisfies AppConnection];
  }));
}
