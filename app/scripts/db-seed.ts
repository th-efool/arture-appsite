import { hashPassword } from "../src/lib/password";
import { users } from "../src/lib/repositories";
import { validateArtureEnvironment } from "../src/lib/env";
import { closeArtureDb } from "../src/lib/db";

async function main() {
  const environment = validateArtureEnvironment();
  const email = process.env.ARTURE_SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ARTURE_SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ARTURE_SEED_ADMIN_EMAIL and ARTURE_SEED_ADMIN_PASSWORD (12+ characters) before seeding.");
  }
  if (await users.byEmail(email)) { console.log(`Admin already exists in ${environment.mongodbDatabase}; no changes made.`); return; }
  await users.create({ email, name: process.env.ARTURE_SEED_ADMIN_NAME?.trim() || "Arture Admin", passwordHash: await hashPassword(password), role: "admin" });
  console.log(`Admin created in ${environment.mongodbDatabase}.`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(closeArtureDb);
