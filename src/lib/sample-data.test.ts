import assert from "node:assert/strict";
import test from "node:test";
import { artureDemoMachines, artureDemoMaintenance, artureDemoTechnicians } from "./sample-data";

test("sample machine asset codes remain in Arture demo namespace", () => {
  assert.equal(artureDemoMachines.length, 3);
  assert.equal(artureDemoMachines.every(({ assetCode }) => assetCode.startsWith("ATR-DEMO-")), true);
});

test("sample maintenance has deterministic unique keys and valid references", () => {
  const keys = artureDemoMaintenance.map(({ seedKey }) => seedKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(artureDemoMaintenance.every(({ assetCode, technicianName, minutesSpent }) => artureDemoMachines.some((machine) => machine.assetCode === assetCode) && artureDemoTechnicians.some((technician) => technician.name === technicianName) && minutesSpent > 0), true);
});
