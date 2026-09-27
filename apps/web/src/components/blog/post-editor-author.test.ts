// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/blog/content-editor", () => ({ ContentEditor: () => null }));

const { BlogPostEditor } = await import("./post-editor");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const basePost = {
  id: "p1",
  title: "T",
  slug: "t",
  excerpt: null,
  content: "",
  status: "DRAFT" as const,
  seoTitle: null,
  seoDescription: null,
  primaryKeyword: null,
  secondaryKeyword: null,
  tags: [],
  publishedAt: null,
};

function mount(authorName: string, authors: string[]) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  act(() => createRoot(el).render(createElement(BlogPostEditor, { post: { ...basePost, authorName }, authors })));
  return el;
}

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
    set.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("post editor author picker", () => {
  it("lists author profiles in a real dropdown and selects the matching one", () => {
    const el = mount("Dakshesh B", ["Dakshesh B", "Guest Writer"]);
    const select = el.querySelector<HTMLSelectElement>("select#post-author")!;
    expect([...select.options].map((o) => o.text)).toEqual(["Dakshesh B", "Guest Writer", "Other name (no profile)…"]);
    expect(select.value).toBe("Dakshesh B");
    expect(el.querySelector("#post-author-custom")).toBeNull();
  });

  it("shows an old byline as 'Other name' and switches to a profile when picked", () => {
    const el = mount("Dakshesh - Founder (MyKavo)", ["Dakshesh B"]);
    const select = el.querySelector<HTMLSelectElement>("select#post-author")!;
    expect(select.value).toBe("__custom__");
    expect(el.querySelector<HTMLInputElement>("#post-author-custom")!.value).toBe("Dakshesh - Founder (MyKavo)");

    choose(select, "Dakshesh B");
    expect(select.value).toBe("Dakshesh B");
    expect(el.querySelector("#post-author-custom")).toBeNull();
    expect(el.textContent).toContain("photo, bio and links");
  });

  it("falls back to a plain name field when there are no profiles", () => {
    const el = mount("MyKavo Team", []);
    expect(el.querySelector("select#post-author")).toBeNull();
    expect(el.querySelector<HTMLInputElement>("input#post-author")!.value).toBe("MyKavo Team");
  });
});
