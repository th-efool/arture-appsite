import { validateArtureEnvironment } from "../src/lib/env";

const valid = { ARTURE_MONGODB_URI: "mongodb://arture-user:pass@localhost:27017/?authSource=admin", ARTURE_MONGODB_DB: "arture_test", ARTURE_APP_URL: "http://localhost:3100", ARTURE_AUTH_SECRET: "arture-only-test-secret", ARTURE_UPLOAD_MAX_BYTES: "2048" };
validateArtureEnvironment(valid);
try { validateArtureEnvironment({ ...valid, ARTURE_MONGODB_DB: "production" }); throw new Error("Expected database namespace rejection."); } catch (error) { if (!(error instanceof Error) || !error.message.includes("arture_")) throw error; }
console.log("Arture environment validation passed.");
