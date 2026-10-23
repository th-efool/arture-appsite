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

function required(value: string | undefined, key: string): string {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function validateMongoUri(uri: string): string {
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("ARTURE_MONGODB_URI must be a MongoDB connection URI.");
  }
  return uri;
}

export function validateArtureEnvironment(source: EnvironmentSource = process.env): ArtureEnvironment {
  const mongodbDatabase = required(source.ARTURE_MONGODB_DB, "ARTURE_MONGODB_DB");
  if (!ARTURE_DATABASE_NAME.test(mongodbDatabase)) {
    throw new Error("ARTURE_MONGODB_DB must start with 'arture_'.");
  }

  const uploadMaxBytes = Number(source.ARTURE_UPLOAD_MAX_BYTES ?? "2097152");
  if (!Number.isSafeInteger(uploadMaxBytes) || uploadMaxBytes <= 0) {
    throw new Error("ARTURE_UPLOAD_MAX_BYTES must be a positive integer.");
  }

  const appUrl = required(source.ARTURE_APP_URL, "ARTURE_APP_URL");
  try {
    new URL(appUrl);
  } catch {
    throw new Error("ARTURE_APP_URL must be a valid URL.");
  }

  return {
    mongodbUri: validateMongoUri(required(source.ARTURE_MONGODB_URI, "ARTURE_MONGODB_URI")),
    mongodbDatabase,
    appUrl,
    authSecret: required(source.ARTURE_AUTH_SECRET, "ARTURE_AUTH_SECRET"),
    uploadMaxBytes,
    demoMode: source.ARTURE_DEMO_MODE === "true",
  };
}
