import "server-only";

import { Db, MongoClient } from "mongodb";
import { validateArtureEnvironment } from "@/lib/env";

declare global {
  var artureMongoClient: MongoClient | undefined;
}

export async function getArtureDb(): Promise<Db> {
  const environment = validateArtureEnvironment();
  if (!environment.mongodbDatabase.startsWith("arture_")) {
    throw new Error("Refusing database outside Arture namespace.");
  }
  if (!global.artureMongoClient) {
    global.artureMongoClient = new MongoClient(environment.mongodbUri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30_000,
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
    });
  }
  return global.artureMongoClient.db(environment.mongodbDatabase);
}
