// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const extractRawText = vi.fn();
vi.mock("mammoth", () => ({ extractRawText }));

import { currentDocContext, fileToPayload, loadCurrent } from "@/lib/documentStore";

const file = (content: BlobPart[], name: string) => {
  const f = new File(content, name);
  // jsdom's File may lack arrayBuffer(); provide one from the raw bytes.
  if (!("arrayBuffer" in f) || typeof f.arrayBuffer !== "function") {
    const bytes = new TextEncoder().encode(content.map(String).join(""));
    Object.defineProperty(f, "arrayBuffer", { value: async () => bytes.buffer });
  }
  return f;
};

beforeEach(() => {
  sessionStorage.clear();
  extractRawText.mockReset();
});

describe("PDF and DOCX extraction", () => {
  it("encodes a PDF as base64 inline data", async () => {
    const p = await fileToPayload(file(["%PDF-1.4 hello"], "Lease.PDF"));
    expect(p).toEqual({ name: "Lease.PDF", mimeType: "application/pdf", data: btoa("%PDF-1.4 hello") });
  });

  it("extracts text from a DOCX (case-insensitive extension)", async () => {
    extractRawText.mockResolvedValue({ value: "Tenant pays rent monthly." });
    const p = await fileToPayload(file(["docx-bytes"], "contract.DOCX"));
    expect(p).toEqual({ name: "contract.DOCX", mimeType: "text/plain", text: "Tenant pays rent monthly." });
    expect(extractRawText).toHaveBeenCalledOnce();
  });

  it("rejects a DOCX with no text", async () => {
    extractRawText.mockResolvedValue({ value: "  \n " });
    await expect(fileToPayload(file(["x"], "empty.docx"))).rejects.toThrow(/couldn't find any text/);
  });
});

describe("assistant document context", () => {
  const fallback = { name: "Sample", mimeType: "text/plain", text: "sample" };

  it("uses the sample document when nothing was uploaded", () => {
    expect(loadCurrent()).toBeNull();
    expect(currentDocContext(fallback)).toBe(fallback);
  });

  it("uses saved text after a reload", () => {
    sessionStorage.setItem("legalease.current", JSON.stringify({ name: "a.docx", analysis: {}, text: "Full text" }));
    expect(currentDocContext(fallback)).toEqual({ name: "a.docx", mimeType: "text/plain", text: "Full text" });
  });

  it("falls back to the saved analysis when full text is unavailable", () => {
    sessionStorage.setItem("legalease.current", JSON.stringify({ name: "a.pdf", analysis: { title: "Lease X" } }));
    const ctx = currentDocContext(fallback);
    expect(ctx.text).toContain("Full text unavailable");
    expect(ctx.text).toContain("Lease X");
  });

  it("ignores corrupted saved data", () => {
    sessionStorage.setItem("legalease.current", "{bad json");
    expect(loadCurrent()).toBeNull();
  });
});
