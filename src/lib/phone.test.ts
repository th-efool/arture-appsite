import assert from "node:assert/strict";
import test from "node:test";
import { phoneIdentity } from "./phone";

test("normalizes common Indian phone number formats to one worker identity", () => {
  assert.equal(phoneIdentity("+91 90000 00001"), "9000000001");
  assert.equal(phoneIdentity("0091-90000-00001"), "9000000001");
  assert.equal(phoneIdentity("9000000001"), "9000000001");
});

test("rejects incomplete phone numbers", () => {
  assert.throws(() => phoneIdentity("90000"), /10 to 15 digits/);
});
