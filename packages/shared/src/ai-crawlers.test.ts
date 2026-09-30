import { describe, expect, it } from "vitest";
import { blockedAiCrawlers, robotsBlocksAgent } from "./ai-crawlers";

const agents = (content: string | null) => blockedAiCrawlers(content).map((c) => c.agent);

describe("robotsBlocksAgent", () => {
  it("blocks an agent named in its own group with Disallow: /", () => {
    const robots = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /";
    expect(robotsBlocksAgent(robots, "GPTBot")).toBe(true);
    expect(robotsBlocksAgent(robots, "ClaudeBot")).toBe(false);
  });

  it("falls back to the * group when the agent has no group of its own", () => {
    expect(robotsBlocksAgent("User-agent: *\nDisallow: /", "ClaudeBot")).toBe(true);
  });

  it("lets the agent's own group override a blocking * group", () => {
    const robots = "User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /";
    expect(robotsBlocksAgent(robots, "ClaudeBot")).toBe(false);
  });

  it("does not call a crawler blocked when only some folders are off limits", () => {
    expect(robotsBlocksAgent("User-agent: GPTBot\nDisallow: /private/", "GPTBot")).toBe(false);
  });

  it("treats an empty Disallow as allowing everything", () => {
    expect(robotsBlocksAgent("User-agent: GPTBot\nDisallow:", "GPTBot")).toBe(false);
  });

  it("reads groups that list several agents, case-insensitively, ignoring comments", () => {
    const robots = "# block AI\nuser-agent: gptbot\nUser-Agent: CLAUDEBOT # anthropic\ndisallow: /*";
    expect(robotsBlocksAgent(robots, "GPTBot")).toBe(true);
    expect(robotsBlocksAgent(robots, "ClaudeBot")).toBe(true);
  });

  it("lets Allow win a tie against Disallow for the root", () => {
    expect(robotsBlocksAgent("User-agent: GPTBot\nDisallow: /\nAllow: /", "GPTBot")).toBe(false);
  });
});

describe("blockedAiCrawlers", () => {
  it("is empty without a robots.txt", () => {
    expect(agents(null)).toEqual([]);
  });

  it("lists every AI crawler a blanket block catches", () => {
    expect(agents("User-agent: *\nDisallow: /")).toContain("OAI-SearchBot");
  });

  it("names exactly the crawlers a typical 'block AI bots' rule set blocks", () => {
    const robots = "User-agent: GPTBot\nUser-agent: ClaudeBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: *\nAllow: /";
    expect(agents(robots)).toEqual(["GPTBot", "ClaudeBot", "CCBot"]);
  });
});
