import { ApiError } from "@/lib/api";

export function requireIngestKey(request: Request) {
  const configuredKey = process.env.ARTURE_INGEST_KEY;
  if (configuredKey && request.headers.get("x-arture-ingest-key") !== configuredKey) {
    throw new ApiError(401, "Invalid ingest key.");
  }
}
