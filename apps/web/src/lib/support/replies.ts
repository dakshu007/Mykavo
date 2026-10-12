/**
 * What the assistant says when it is not quoting an article: small talk, "did
 * you mean", and the hand-over to a person. Same markdown subset as articles.
 */

import type { SmallTalkIntent } from "./engine";

export const SUPPORT_EMAIL = "support@mykavo.app";

export const ASSISTANT_NAME = "MyKavo Assistant";

export const GREETING =
  "Hi! I'm the MyKavo Assistant. Ask me anything about monitoring your websites, alerts, plans, WordPress, Shopify or your account, and I'll find the answer.";

export const SMALL_TALK_REPLIES: Record<SmallTalkIntent, string> = {
  greeting:
    "Hi there! What can I help you with? You can ask things like **how do I add a website**, **why did I get an alert** or **how do I connect WordPress**.",
  thanks: "Happy to help! Anything else you want to know?",
  bye: "Bye for now. If anything comes up, I'm right here.",
  human: `You can reach a real person at [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}). Emails go straight to the people who build MyKavo, and most get a reply within one business day.`,
  identity:
    "I'm the MyKavo Assistant. I answer questions from MyKavo's help library, instantly and any time of day. When I can't solve something, a real person can at " +
    `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
  affirm: "Great. What would you like to know next?",
  negative: `Sorry that didn't help. Try asking in other words, or email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) and a person will sort it out.`,
};

export const SUGGEST_INTRO = "I found a few answers that might fit. Which one is closest?";

export const FALLBACK_REPLY =
  "I'm not sure I have the right answer for that one, and I'd rather not guess. " +
  `Email us at [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) and a real person will help, usually within one business day.`;

export const NOT_HELPFUL_REPLY =
  "Sorry about that. A real person can take it from here: email us and we'll get back to you, usually within one business day.";

/** A mailto link with the question and the answer given, so nobody has to retype it. */
export function supportMailto(question?: string, answerTitle?: string): string {
  const subject = question ? `Support: ${question.slice(0, 80)}` : "Support request";
  const lines = [
    "Hi MyKavo team,",
    "",
    question ? `My question: ${question}` : "My question:",
    "",
    answerTitle ? `The assistant suggested "${answerTitle}", but I still need help.` : "",
    "",
    "Account email:",
    "Website:",
  ].filter((line, i, all) => !(line === "" && all[i - 1] === ""));
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
