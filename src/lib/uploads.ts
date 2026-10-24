export const allowedDocumentTypes = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/json",
  "text/csv",
  "image/png",
  "image/jpeg",
] as const;

export type AllowedDocumentType = (typeof allowedDocumentTypes)[number];

const extensionToMime: Record<string, AllowedDocumentType> = {
  pdf: "application/pdf",
  txt: "text/plain",
  text: "text/plain",
  log: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  json: "application/json",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const extensions: Record<AllowedDocumentType, string[]> = {
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "text", "log"],
  "text/markdown": ["md", "markdown"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/msword": ["doc"],
  "application/json": ["json"],
  "text/csv": ["csv"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
};

export function safeFileName(name: string): string {
  const clean = name.replace(/[\\/\0-\x1f\x7f"]/g, "_").trim().slice(0, 255);
  return clean || "arture-document";
}

export function validateDocumentFile(
  name: string,
  mimeType: string,
  bytes: Uint8Array,
  maxBytes: number
): AllowedDocumentType {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || bytes.byteLength > maxBytes) {
    throw new Error("File exceeds Arture upload limit.");
  }

  const clean = safeFileName(name);
  const extension = clean.split(".").pop()?.toLowerCase();
  if (!extension) throw new Error("File extension does not match declared type.");

  const canonicalFromExt = extensionToMime[extension];
  if (!canonicalFromExt) {
    throw new Error(
      `Unsupported file type .${extension}. Allowed: PDF, TXT, MD, DOCX, JSON, CSV, PNG, JPEG.`
    );
  }

  let targetType: AllowedDocumentType = canonicalFromExt;
  if (allowedDocumentTypes.includes(mimeType as AllowedDocumentType)) {
    if (extensions[mimeType as AllowedDocumentType].includes(extension)) {
      targetType = mimeType as AllowedDocumentType;
    } else if (
      mimeType === "text/plain" &&
      ["md", "markdown", "csv", "json"].includes(extension)
    ) {
      targetType = canonicalFromExt;
    } else {
      throw new Error("File extension does not match declared type.");
    }
  }

  if (targetType === "application/pdf") {
    const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
    if (bytes.byteLength < signature.length || !signature.every((b, i) => bytes[i] === b)) {
      throw new Error("File contents do not match declared type.");
    }
  } else if (targetType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.byteLength < signature.length || !signature.every((b, i) => bytes[i] === b)) {
      throw new Error("File contents do not match declared type.");
    }
  } else if (targetType === "image/jpeg") {
    const signature = [0xff, 0xd8, 0xff];
    if (bytes.byteLength < signature.length || !signature.every((b, i) => bytes[i] === b)) {
      throw new Error("File contents do not match declared type.");
    }
  } else if (
    targetType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const signature = [0x50, 0x4b, 0x03, 0x04];
    if (bytes.byteLength < signature.length || !signature.every((b, i) => bytes[i] === b)) {
      throw new Error("File contents do not match declared DOCX format.");
    }
  } else {
    // Plain text, Markdown, JSON, CSV
    if (bytes.byteLength >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      throw new Error("Binary executable files are not allowed.");
    }
    if (
      bytes.byteLength >= 4 &&
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46
    ) {
      throw new Error("Binary executable files are not allowed.");
    }
    let nullCount = 0;
    const sampleLen = Math.min(bytes.byteLength, 512);
    for (let i = 0; i < sampleLen; i++) {
      if (bytes[i] === 0) nullCount++;
    }
    if (nullCount > 2) {
      throw new Error("Binary files cannot be parsed as text documents.");
    }
  }

  return targetType;
}

export function downloadDisposition(name: string): string {
  const safe = safeFileName(name).replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safeFileName(name))}`;
}
