import assert from "node:assert/strict";
import test from "node:test";
import { validateArtureEnvironment } from "./env";

const valid = {
  ARTURE_MONGODB_URI: "mongodb://arture-user:pass@localhost:27017",
  ARTURE_MONGODB_DB: "arture_test",
  ARTURE_APP_URL: "http://localhost:3100",
  ARTURE_AUTH_SECRET: "arture-only-test-secret",
};

test("accepts Arture database", () => {
  assert.equal(validateArtureEnvironment(valid).mongodbDatabase, "arture_test");
});

test("accepts any database name by default without restriction", () => {
  assert.equal(validateArtureEnvironment({ ...valid, ARTURE_MONGODB_DB: "test" }).mongodbDatabase, "test");
  assert.equal(validateArtureEnvironment({ ...valid, ARTURE_MONGODB_DB: "other_site" }).mongodbDatabase, "other_site");
});

test("rejects non-arture database only when namespace enforcement is explicitly enabled", () => {
  assert.throws(
    () => validateArtureEnvironment({ ...valid, ARTURE_MONGODB_DB: "other_site", ARTURE_ENFORCE_NAMESPACE: "true" }),
    /arture_/
  );
  assert.equal(
    validateArtureEnvironment({
      ...valid,
      ARTURE_MONGODB_DB: "shared_site",
      ARTURE_ENFORCE_NAMESPACE: "true",
      ARTURE_ALLOW_SHARED_DATABASE: "true",
    }).mongodbDatabase,
    "shared_site"
  );
});

test("infers database from URI when ARTURE_MONGODB_DB is omitted", () => {
  assert.equal(
    validateArtureEnvironment({
      ...valid,
      ARTURE_MONGODB_URI: "mongodb://localhost:27017/inferred_database?replicaSet=rs0",
      ARTURE_MONGODB_DB: undefined,
    }).mongodbDatabase,
    "inferred_database"
  );
});

test("defaults database to test when neither is specified", () => {
  assert.equal(
    validateArtureEnvironment({
      ...valid,
      ARTURE_MONGODB_URI: "mongodb://localhost:27017",
      ARTURE_MONGODB_DB: undefined,
    }).mongodbDatabase,
    "test"
  );
});

test("accepts MONGODB_URI as fallback", () => {
  assert.equal(
    validateArtureEnvironment({
      MONGODB_URI: "mongodb://localhost:27017/my_app",
      ARTURE_MONGODB_URI: undefined,
      ARTURE_MONGODB_DB: undefined,
    }).mongodbDatabase,
    "my_app"
  );
});
