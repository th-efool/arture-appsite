import { Db, MongoClient } from "mongodb";
import { setDefaultResultOrder } from "node:dns";
import { validateArtureEnvironment } from "@/lib/env";

setDefaultResultOrder("ipv4first");

declare global {
  var artureMongoClient: MongoClient | undefined;
}

export async function getArtureDb(): Promise<Db> {
  const environment = validateArtureEnvironment();
  if (
    process.env.ARTURE_ENFORCE_NAMESPACE === "true" &&
    !environment.mongodbDatabase.startsWith("arture_") &&
    process.env.ARTURE_ALLOW_SHARED_DATABASE !== "true"
  ) {
    throw new Error("Refusing database outside Arture namespace.");
  }
  if (!global.artureMongoClient) {
    global.artureMongoClient = new MongoClient(environment.mongodbUri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30_000,
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
    });
  }
  return global.artureMongoClient.db(environment.mongodbDatabase);
}

export async function closeArtureDb(): Promise<void> {
  if (!global.artureMongoClient) return;
  await global.artureMongoClient.close();
  global.artureMongoClient = undefined;
}
