const ARTURE_DATABASE_NAME = /^arture_[a-z0-9_]+$/i;
type EnvironmentSource = Record<string, string | undefined>;

export type ArtureEnvironment = {
  mongodbUri: string;
  mongodbDatabase: string;
  appUrl: string;
  authSecret: string;
  uploadMaxBytes: number;
  demoMode: boolean;
};

function extractDatabaseName(uri: string): string | undefined {
  try {
    const parsed = new URL(uri);
    const db = parsed.pathname.replace(/^\//, "").split("?")[0].trim();
    return db || undefined;
  } catch {
    return undefined;
  }
}

function validateMongoUri(uri: string): string {
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("ARTURE_MONGODB_URI must be a MongoDB connection URI.");
  }
  return uri;
}

export function validateArtureEnvironment(source: EnvironmentSource = process.env): ArtureEnvironment {
  const mongodbUri = source.ARTURE_MONGODB_URI || source.MONGODB_URI;
  if (!mongodbUri?.trim()) {
    throw new Error("Missing required environment variable: ARTURE_MONGODB_URI");
  }
  validateMongoUri(mongodbUri);

  const extracted = extractDatabaseName(mongodbUri);
  const mongodbDatabase =
    source.ARTURE_MONGODB_DB?.trim() ||
    source.MONGODB_DB?.trim() ||
    source.MONGO_INITDB_DATABASE?.trim() ||
    extracted ||
    "test";

  if (
    source.ARTURE_ENFORCE_NAMESPACE === "true" &&
    !ARTURE_DATABASE_NAME.test(mongodbDatabase) &&
    source.ARTURE_ALLOW_SHARED_DATABASE !== "true"
  ) {
    throw new Error("ARTURE_MONGODB_DB must start with 'arture_'.");
  }

  const uploadMaxBytes = Number(source.ARTURE_UPLOAD_MAX_BYTES ?? "2097152");
  if (!Number.isSafeInteger(uploadMaxBytes) || uploadMaxBytes <= 0) {
    throw new Error("ARTURE_UPLOAD_MAX_BYTES must be a positive integer.");
  }

  let appUrl = source.ARTURE_APP_URL || source.NEXT_PUBLIC_APP_URL;
  if (!appUrl && source.VERCEL_PROJECT_PRODUCTION_URL) {
    appUrl = `https://${source.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (!appUrl && source.VERCEL_URL) {
    appUrl = `https://${source.VERCEL_URL}`;
  } else if (!appUrl && source.RAILWAY_PUBLIC_DOMAIN) {
    appUrl = `https://${source.RAILWAY_PUBLIC_DOMAIN}`;
  } else if (!appUrl) {
    appUrl = "http://localhost:3100";
  }

  try {
    new URL(appUrl);
  } catch {
    appUrl = "http://localhost:3100";
  }

  const authSecret =
    source.ARTURE_AUTH_SECRET ||
    source.NEXTAUTH_SECRET ||
    "arture-default-auth-secret-change-in-production-min32chars";

  return {
    mongodbUri,
    mongodbDatabase,
    appUrl,
    authSecret,
    uploadMaxBytes,
    demoMode: source.ARTURE_DEMO_MODE !== "false",
  };
}
