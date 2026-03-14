/**
 * LLM Abstraction Layer — Provider-agnostic AI service
 *
 * Supports OpenAI and Anthropic with a unified interface.
 * Handles streaming, token counting, and error recovery.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  provider: "openai" | "anthropic";
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  durationMs: number;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

// ─── Provider Clients (lazy-initialized) ────────────────────────────────────

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ─── Check if provider is configured ────────────────────────────────────────

export function isProviderConfigured(provider: string): boolean {
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}

export function getConfiguredProvider(): "openai" | "anthropic" | null {
  const preferred = process.env.DEFAULT_AI_PROVIDER;
  if (preferred === "openai" && isProviderConfigured("openai")) return "openai";
  if (preferred === "anthropic" && isProviderConfigured("anthropic")) return "anthropic";
  // Fallback: try either
  if (isProviderConfigured("openai")) return "openai";
  if (isProviderConfigured("anthropic")) return "anthropic";
  return null;
}

// ─── Non-Streaming Completion ───────────────────────────────────────────────

export async function generateCompletion(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const start = Date.now();

  if (config.provider === "anthropic") {
    return generateAnthropicCompletion(messages, config, start);
  }
  return generateOpenAICompletion(messages, config, start);
}

async function generateOpenAICompletion(
  messages: LLMMessage[],
  config: LLMConfig,
  start: number
): Promise<LLMResponse> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: config.model || process.env.DEFAULT_AI_MODEL || "gpt-4o-mini",
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2048,
  });

  const choice = response.choices[0];

  return {
    content: choice?.message?.content || "",
    provider: "openai",
    model: response.model,
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
    finishReason: choice?.finish_reason || "unknown",
    durationMs: Date.now() - start,
  };
}

async function generateAnthropicCompletion(
  messages: LLMMessage[],
  config: LLMConfig,
  start: number
): Promise<LLMResponse> {
  const anthropic = getAnthropic();

  // Extract system message
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await anthropic.messages.create({
    model: config.model || "claude-sonnet-4-20250514",
    max_tokens: config.maxTokens ?? 2048,
    temperature: config.temperature ?? 0.7,
    system: systemMessage,
    messages: conversationMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");

  return {
    content: textBlock?.text || "",
    provider: "anthropic",
    model: response.model,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    finishReason: response.stop_reason || "unknown",
    durationMs: Date.now() - start,
  };
}

// ─── Streaming Completion (Generator) ───────────────────────────────────────

export async function* streamCompletion(
  messages: LLMMessage[],
  config: LLMConfig
): AsyncGenerator<LLMStreamChunk> {
  if (config.provider === "anthropic") {
    yield* streamAnthropicCompletion(messages, config);
  } else {
    yield* streamOpenAICompletion(messages, config);
  }
}

async function* streamOpenAICompletion(
  messages: LLMMessage[],
  config: LLMConfig
): AsyncGenerator<LLMStreamChunk> {
  const openai = getOpenAI();

  const stream = await openai.chat.completions.create({
    model: config.model || process.env.DEFAULT_AI_MODEL || "gpt-4o-mini",
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield { content: delta, done: false };
    }
    if (chunk.choices[0]?.finish_reason) {
      yield { content: "", done: true };
    }
  }
}

async function* streamAnthropicCompletion(
  messages: LLMMessage[],
  config: LLMConfig
): AsyncGenerator<LLMStreamChunk> {
  const anthropic = getAnthropic();

  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const stream = anthropic.messages.stream({
    model: config.model || "claude-sonnet-4-20250514",
    max_tokens: config.maxTokens ?? 2048,
    temperature: config.temperature ?? 0.7,
    system: systemMessage,
    messages: conversationMessages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { content: event.delta.text, done: false };
    }
    if (event.type === "message_stop") {
      yield { content: "", done: true };
    }
  }
}

// ─── Build Messages for AI Staff ────────────────────────────────────────────

export function buildConversationMessages(
  systemPrompt: string,
  conversationHistory: { senderType: string; content: string }[],
  newUserMessage: string
): LLMMessage[] {
  const messages: LLMMessage[] = [];

  // System prompt
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // Conversation history (last 20 messages for context window management)
  const recentHistory = conversationHistory.slice(-20);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.senderType === "USER" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // New user message
  messages.push({ role: "user", content: newUserMessage });

  return messages;
}

// ─── Build System Prompt for AI Staff ───────────────────────────────────────

export function buildSystemPrompt(
  staffSystemPrompt: string,
  workspaceName: string,
  staffName: string,
  staffRole: string,
  tone?: string | null
): string {
  let prompt = staffSystemPrompt || `You are ${staffName}, an AI ${staffRole}.`;

  // Replace workspace placeholder
  prompt = prompt.replace(/\{\{workspace_name\}\}/g, workspaceName);

  // Add tone guidance if specified
  if (tone) {
    prompt += `\n\nTone: ${tone}`;
  }

  return prompt;
}

// ─── Estimate token cost (rough) ────────────────────────────────────────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-haiku-4-5-20251001": { input: 0.0008, output: 0.004 },
  "claude-opus-4-20250514": { input: 0.015, output: 0.075 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const rates = COST_PER_1K[model] || { input: 0.001, output: 0.002 };
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
}
