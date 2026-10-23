import assert from "node:assert/strict";
import test from "node:test";
import { validateArtureEnvironment } from "./env";

const valid = { ARTURE_MONGODB_URI: "mongodb://arture-user:pass@localhost:27017", ARTURE_MONGODB_DB: "arture_test", ARTURE_APP_URL: "http://localhost:3100", ARTURE_AUTH_SECRET: "arture-only-test-secret" };
test("accepts Arture database", () => assert.equal(validateArtureEnvironment(valid).mongodbDatabase, "arture_test"));
test("rejects other database", () => assert.throws(() => validateArtureEnvironment({ ...valid, ARTURE_MONGODB_DB: "other_site" }), /arture_/));
