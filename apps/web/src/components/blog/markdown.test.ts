import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogMarkdown } from "./markdown";

describe("BlogMarkdown tables", () => {
  it("wraps every table in a horizontal scroll box so it can't widen the page on phones", () => {
    const md = "| Tool | Free | Paid |\n|---|---|---|\n| A | Yes | $5 |\n\nText\n\n| X | Y |\n|---|---|\n| 1 | 2 |";
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: md }));
    expect(html.match(/<div class="blog-table-scroll"><table>/g)).toHaveLength(2);
    expect(html).toContain("<th>Tool</th>");
    expect(html).toContain("<td>$5</td>");
  });
});
