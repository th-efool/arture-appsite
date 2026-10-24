import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";

async function main() {
  const project = resolve(process.argv[2] ?? "../Arture-AR-6000.4.0f1");
  await access(resolve(project, "ProjectSettings/ProjectVersion.txt"));
  const token = process.env.ARTURE_RELAY_ACCESS_KEY;
  if (!token || token.length < 24 || token.startsWith("sk-")) throw new Error("Set an Arture app credential, not an OpenAI key.");
  const localAddress = Object.values(networkInterfaces()).flat().find(address => address?.family === "IPv4" && !address.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address))?.address;
  const port = process.env.ARTURE_RELAY_PORT ?? "3101";
  const url = process.env.ARTURE_RELAY_URL ?? `ws://127.0.0.1:${port}/realtime`;
  const deviceUrl = process.env.ARTURE_RELAY_DEVICE_URL ?? (localAddress ? `ws://${localAddress}:${port}/realtime` : url);
  for (const candidate of [url, deviceUrl]) { const parsed = new URL(candidate); if (!["ws:", "wss:"].includes(parsed.protocol)) throw new Error("Use a ws:// or wss:// relay URL."); }
  const configPath = resolve(project, "Assets/Resources/ArtureRelayConnection.json");
  const ignorePath = resolve(project, ".gitignore");
  const ignored = "Assets/Resources/ArtureRelayConnection.json";
  const ignores = await readFile(ignorePath, "utf8");
  if (!ignores.includes(ignored)) await writeFile(ignorePath, `${ignores}\n${ignored}\n${ignored}.meta\n`);
  let workerPhone = process.env.ARTURE_WORKER_PHONE ?? "";
  if (!workerPhone) { try { workerPhone = JSON.parse(await readFile(configPath, "utf8")).workerPhone ?? ""; } catch {} }
  await writeFile(configPath, JSON.stringify({ url, deviceUrl, accessToken: token, assetCode: "ATR-DEMO-PUMP-001", ...(workerPhone ? { workerPhone } : {}) }, null, 2) + "\n");
  console.log("Unity relay configuration written to its ignored Resources file. No OpenAI credential was copied.");
}
main().catch(() => { console.error("Could not configure Unity. Check the project path, relay URLs, and app credential."); process.exitCode = 1; });
