import assert from "node:assert/strict";
import test from "node:test";
import { safeFileName, validateDocumentFile } from "./uploads";
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
test("accepts matching PDF signature, MIME, extension", () => assert.equal(validateDocumentFile("manual.pdf", "application/pdf", pdf, 100), "application/pdf"));
test("rejects mismatched extension and signature", () => { assert.throws(() => validateDocumentFile("manual.png", "application/pdf", pdf, 100), /extension/); assert.throws(() => validateDocumentFile("manual.pdf", "application/pdf", new Uint8Array([1, 2]), 100), /contents/); });
test("cleans path and control characters", () => assert.equal(safeFileName("../manual\u0000.pdf"), ".._manual_.pdf"));
