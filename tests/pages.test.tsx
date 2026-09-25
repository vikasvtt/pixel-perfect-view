// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

// Render route components directly: stub the router/server-fn plumbing (no network, no Gemini).
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({ options: opts }),
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...(rest as object)}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = { inputValidator: () => chain, handler: () => vi.fn() };
    return chain;
  },
  useServerFn: () => vi.fn(),
}));

afterEach(cleanup);

const DISCLAIMER = /not legal advice/i;

async function renderRoute(path: string) {
  const mod = (await import(`@/routes/${path}.tsx`)) as { Route: { options: { component: ComponentType; head: () => { meta: { title?: string }[] } } } };
  const { component: C, head } = mod.Route.options;
  render(<C />);
  return head().meta.find((m) => m.title)?.title;
}

describe("page smoke tests", () => {
  Element.prototype.scrollIntoView = vi.fn();

  it("Dashboard renders headline, actions and disclaimer", async () => {
    const title = await renderRoute("index");
    expect(screen.getByRole("heading", { name: /understand legal documents in simple language/i })).toBeTruthy();
    expect(screen.getAllByText(/analy[sz]e a document/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/compare documents/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(DISCLAIMER).length).toBeGreaterThan(0);
    expect(title).toMatch(/LegalEase AI/);
  });

  it("Upload shows the 14 MB limit, disabled Analyze button and disclaimer", async () => {
    await renderRoute("upload");
    expect(screen.getByRole("heading", { name: /upload a document/i })).toBeTruthy();
    expect(screen.getByText(/up to 14 MB/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Analyze Document" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("Analysis renders sections and disclaimer", async () => {
    await renderRoute("analysis");
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    expect(screen.getAllByText(DISCLAIMER).length).toBeGreaterThan(0);
  });

  it("Assistant renders chat, suggested questions and disclaimer", async () => {
    await renderRoute("assistant");
    expect(screen.getByRole("heading", { name: /ask your document/i })).toBeTruthy();
    expect(screen.getByText("Can I terminate this agreement early?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send question" })).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("Compare renders both upload slots and disclaimer", async () => {
    await renderRoute("compare");
    expect(screen.getByText("Original Document")).toBeTruthy();
    expect(screen.getByText("New Document")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });
});
