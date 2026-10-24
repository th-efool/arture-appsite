import assert from "node:assert/strict";
import test from "node:test";
import { safeFileName, validateDocumentFile } from "./uploads";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
const txt = new TextEncoder().encode("Standard operating procedure for pump overhaul.");
const md = new TextEncoder().encode("# Pump Safety\n\nEnsure lock-out tag-out before maintenance.");
const json = new TextEncoder().encode('{"asset": "ATR-DEMO-PUMP-001", "status": "active"}');

test("accepts matching PDF signature, MIME, extension", () =>
  assert.equal(validateDocumentFile("manual.pdf", "application/pdf", pdf, 100), "application/pdf"));

test("accepts TXT, Markdown, DOCX, JSON files", () => {
  assert.equal(validateDocumentFile("notes.txt", "text/plain", txt, 1000), "text/plain");
  assert.equal(validateDocumentFile("guide.md", "text/markdown", md, 1000), "text/markdown");
  assert.equal(
    validateDocumentFile(
      "manual.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docx,
      1000
    ),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.equal(validateDocumentFile("config.json", "application/json", json, 1000), "application/json");
});

test("rejects mismatched extension and signature", () => {
  assert.throws(() => validateDocumentFile("manual.png", "application/pdf", pdf, 100), /extension/);
  assert.throws(() => validateDocumentFile("manual.pdf", "application/pdf", new Uint8Array([1, 2]), 100), /contents/);
});

test("cleans path and control characters", () =>
  assert.equal(safeFileName("../manual\u0000.pdf"), ".._manual_.pdf"));
