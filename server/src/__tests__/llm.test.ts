import { describe, it, expect } from "vitest";
import { estimateCost, buildSystemPrompt, buildConversationMessages } from "../services/llm.js";

describe("estimateCost", () => {
  it("calculates cost for gpt-4o-mini", () => {
    const cost = estimateCost("gpt-4o-mini", 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(1);
  });

  it("calculates cost for claude-sonnet", () => {
    const cost = estimateCost("claude-sonnet-4-20250514", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("uses default rates for unknown model", () => {
    const cost = estimateCost("unknown-model", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("returns 0 for 0 tokens", () => {
    const cost = estimateCost("gpt-4o-mini", 0, 0);
    expect(cost).toBe(0);
  });
});

describe("buildSystemPrompt", () => {
  it("builds default prompt when no system prompt provided", () => {
    const prompt = buildSystemPrompt("", "TestWorkspace", "Alice", "Marketing Manager", null);
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("Marketing Manager");
  });

  it("replaces workspace_name placeholder", () => {
    const prompt = buildSystemPrompt(
      "You work for {{workspace_name}}",
      "Acme Corp",
      "Bob",
      "Sales Rep",
      null
    );
    expect(prompt).toContain("Acme Corp");
    expect(prompt).not.toContain("{{workspace_name}}");
  });

  it("appends tone when provided", () => {
    const prompt = buildSystemPrompt("Base prompt", "WS", "Agent", "Role", "friendly and casual");
    expect(prompt).toContain("Tone: friendly and casual");
  });

  it("does not append tone when null", () => {
    const prompt = buildSystemPrompt("Base prompt", "WS", "Agent", "Role", null);
    expect(prompt).not.toContain("Tone:");
  });
});

describe("buildConversationMessages", () => {
  it("builds messages with system prompt and history", () => {
    const messages = buildConversationMessages(
      "You are helpful",
      [
        { senderType: "USER", content: "Hello" },
        { senderType: "AI_STAFF", content: "Hi there!" },
      ],
      "How are you?"
    );

    expect(messages).toHaveLength(4); // system + 2 history + new message
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[2].role).toBe("assistant");
    expect(messages[3].role).toBe("user");
    expect(messages[3].content).toBe("How are you?");
  });

  it("limits history to last 20 messages", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      senderType: i % 2 === 0 ? "USER" : "AI_STAFF",
      content: `Message ${i}`,
    }));

    const messages = buildConversationMessages("System", history, "New");
    // 1 system + 20 history + 1 new = 22
    expect(messages).toHaveLength(22);
  });

  it("works with empty history", () => {
    const messages = buildConversationMessages("System", [], "Hello");
    expect(messages).toHaveLength(2);
  });
});
